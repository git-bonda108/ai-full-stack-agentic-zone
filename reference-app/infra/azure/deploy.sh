#!/usr/bin/env bash
# Deploy P2P Sentinel to Azure, step by step. Run from reference-app/ (Azure Cloud Shell works out of the box):
#   bash infra/azure/deploy.sh
# Safe to re-run: existing resources are reused and the apps get a new revision.
# USE_POSTGRES=1   also create a PostgreSQL Flexible Server (B1ms) instead of the demo SQLite database
# PROTECT_UI=1     require Microsoft (Entra ID) sign-in on the UI instead of public access
set -euo pipefail
cd "$(dirname "$0")/../.."
source infra/azure/env.sh

step() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
exists() { "$@" -o none >/dev/null 2>&1; }

step "1/9 Subscription, providers and CLI extensions"
az account show --query "{subscription:name, id:id, user:user.name}" -o table
for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry Microsoft.Insights Microsoft.Web; do
  az provider register --namespace "$ns" --wait -o none
done
az extension add --name containerapp --upgrade --only-show-errors
az extension add --name application-insights --upgrade --only-show-errors

step "2/9 Resource group $RG"
az group create -n "$RG" -l "$LOCATION" --tags app=p2p-sentinel env=dev -o none

step "3/9 Log Analytics + Application Insights"
exists az monitor log-analytics workspace show -g "$RG" -n "$LAW" || \
  az monitor log-analytics workspace create -g "$RG" -n "$LAW" -l "$LOCATION" -o none
LAW_ID=$(az monitor log-analytics workspace show -g "$RG" -n "$LAW" --query customerId -o tsv)
LAW_KEY=$(az monitor log-analytics workspace get-shared-keys -g "$RG" -n "$LAW" --query primarySharedKey -o tsv)
LAW_RES_ID=$(az monitor log-analytics workspace show -g "$RG" -n "$LAW" --query id -o tsv)
exists az monitor app-insights component show -g "$RG" --app "$APPI" || \
  az monitor app-insights component create -g "$RG" --app "$APPI" -l "$LOCATION" --workspace "$LAW_RES_ID" -o none
APPI_CONN=$(az monitor app-insights component show -g "$RG" --app "$APPI" --query connectionString -o tsv)

step "4/9 Container registry $ACR + cloud image builds (no local Docker needed)"
exists az acr show -n "$ACR" -g "$RG" || az acr create -g "$RG" -n "$ACR" --sku Basic -o none
az acr build -r "$ACR" -t "p2p-api:$TAG" -f docker/api.Dockerfile . --only-show-errors
az acr build -r "$ACR" -t "p2p-erp:$TAG" -f docker/erp.Dockerfile . --only-show-errors

step "5/9 Container Apps environment $ACA_ENV"
exists az containerapp env show -g "$RG" -n "$ACA_ENV" || \
  az containerapp env create -g "$RG" -n "$ACA_ENV" -l "$LOCATION" \
    --logs-workspace-id "$LAW_ID" --logs-workspace-key "$LAW_KEY" -o none

step "6/9 Database"
if [[ "${USE_POSTGRES:-0}" == "1" ]]; then
  PG_PASS="${PG_PASS:-P2p$(openssl rand -hex 12)!}"
  exists az postgres flexible-server show -g "$RG" -n "$PG" || \
    az postgres flexible-server create -g "$RG" -n "$PG" -l "$LOCATION" \
      --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
      --admin-user "$PG_USER" --admin-password "$PG_PASS" --public-access 0.0.0.0 --yes -o none
  exists az postgres flexible-server db show -g "$RG" -s "$PG" -d "$PG_DB" || \
    az postgres flexible-server db create -g "$RG" -s "$PG" -d "$PG_DB" -o none
  DATABASE_URL="postgresql+psycopg://${PG_USER}:${PG_PASS}@${PG}.postgres.database.azure.com:5432/${PG_DB}?sslmode=require"
  API_MAX=3
else
  DATABASE_URL="sqlite:///./var/p2p_sentinel.db"   # demo database inside the container; resets on restart
  API_MAX=1                                        # one replica, so every request sees the same SQLite file
fi

step "7/9 Mock ERP $ERP_APP (internal ingress: reachable only inside the environment)"
if exists az containerapp show -g "$RG" -n "$ERP_APP"; then
  az containerapp update -g "$RG" -n "$ERP_APP" --image "$ACR.azurecr.io/p2p-erp:$TAG" -o none
else
  az containerapp create -g "$RG" -n "$ERP_APP" --environment "$ACA_ENV" \
    --image "$ACR.azurecr.io/p2p-erp:$TAG" --registry-server "$ACR.azurecr.io" --registry-identity system \
    --target-port 8001 --ingress internal --min-replicas 1 --max-replicas 1 --cpu 0.25 --memory 0.5Gi -o none
fi
ERP_FQDN=$(az containerapp show -g "$RG" -n "$ERP_APP" --query properties.configuration.ingress.fqdn -o tsv)

step "8/9 API $API_APP (public; secrets stored as Container Apps secrets)"
ENV_VARS=("APP_ENV=dev" "DATABASE_URL=secretref:db-url" "APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:appi-conn"
          "ERP_BASE_URL=https://$ERP_FQDN" "LLM_PROVIDER=${LLM_PROVIDER:-offline}" "JIRA_PROJECT_KEY=AP")
if exists az containerapp show -g "$RG" -n "$API_APP"; then
  az containerapp secret set -g "$RG" -n "$API_APP" --secrets "db-url=$DATABASE_URL" "appi-conn=$APPI_CONN" -o none
  az containerapp update -g "$RG" -n "$API_APP" --image "$ACR.azurecr.io/p2p-api:$TAG" \
    --max-replicas "$API_MAX" --set-env-vars "${ENV_VARS[@]}" -o none
else
  az containerapp create -g "$RG" -n "$API_APP" --environment "$ACA_ENV" \
    --image "$ACR.azurecr.io/p2p-api:$TAG" --registry-server "$ACR.azurecr.io" --registry-identity system \
    --target-port 8000 --ingress external --min-replicas 1 --max-replicas "$API_MAX" --cpu 0.5 --memory 1.0Gi \
    --secrets "db-url=$DATABASE_URL" "appi-conn=$APPI_CONN" --env-vars "${ENV_VARS[@]}" -o none
fi
API_URL="https://$(az containerapp show -g "$RG" -n "$API_APP" --query properties.configuration.ingress.fqdn -o tsv)"

step "9/9 Frontend on Static Web Apps (Free) $SWA"
exists az staticwebapp show -g "$RG" -n "$SWA" || az staticwebapp create -g "$RG" -n "$SWA" -l "$SWA_LOCATION" --sku Free -o none
SWA_HOST=$(az staticwebapp show -g "$RG" -n "$SWA" --query defaultHostname -o tsv)
SWA_TOKEN=$(az staticwebapp secrets list -g "$RG" -n "$SWA" --query properties.apiKey -o tsv)
SWA_CONFIG=infra/azure/staticwebapp.config.json
[[ "${PROTECT_UI:-0}" == "1" ]] && SWA_CONFIG=infra/azure/staticwebapp.config.entra.json
(cd frontend && npm ci --no-audit --no-fund && VITE_API_BASE_URL="$API_URL" npm run build)
cp "$SWA_CONFIG" frontend/dist/staticwebapp.config.json
npx --yes @azure/static-web-apps-cli@2 deploy ./frontend/dist --deployment-token "$SWA_TOKEN" --env production
az containerapp update -g "$RG" -n "$API_APP" --set-env-vars "CORS_ORIGINS=https://$SWA_HOST,http://localhost:5173" -o none

step "Smoke test"
for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS "$API_URL/healthz" && break || sleep 10; done; echo
curl -fsS "$API_URL/readyz"; echo
curl -fsS -X POST "$API_URL/api/invoices/samples/inv_a_clean" -o /dev/null -w "sample invoice: HTTP %{http_code}\n" || true

cat <<DONE

P2P Sentinel is deployed.
  UI         https://$SWA_HOST
  API docs   $API_URL/docs
  Health     $API_URL/readyz
  Logs       az containerapp logs show -g $RG -n $API_APP --follow
  Delete all bash infra/azure/teardown.sh
DONE
