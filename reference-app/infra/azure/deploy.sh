#!/usr/bin/env bash
# Deploy P2P Sentinel to Azure, step by step. Run from reference-app/:
#   az login --use-device-code && bash infra/azure/deploy.sh
# Idempotent: safe to re-run. Set USE_POSTGRES=1 to create a PostgreSQL Flexible Server (costs money).
set -euo pipefail
source "$(dirname "$0")/env.sh"

step() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }

step "1/9 Subscription, providers and CLI extensions"
az account show --query "{name:name, id:id, user:user.name}" -o table
for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry Microsoft.Insights Microsoft.Web; do
  az provider register --namespace "$ns" --wait >/dev/null
done
az extension add --name containerapp --upgrade --only-show-errors
az extension add --name application-insights --upgrade --only-show-errors

step "2/9 Resource group"
az group create -n "$RG" -l "$LOCATION" --tags app=p2p-sentinel env=dev owner="$(az account show --query user.name -o tsv)" -o none

step "3/9 Log Analytics + Application Insights"
az monitor log-analytics workspace create -g "$RG" -n "$LAW" -l "$LOCATION" -o none
LAW_ID=$(az monitor log-analytics workspace show -g "$RG" -n "$LAW" --query customerId -o tsv)
LAW_KEY=$(az monitor log-analytics workspace get-shared-keys -g "$RG" -n "$LAW" --query primarySharedKey -o tsv)
LAW_RES_ID=$(az monitor log-analytics workspace show -g "$RG" -n "$LAW" --query id -o tsv)
az monitor app-insights component create -g "$RG" --app "$APPI" -l "$LOCATION" --workspace "$LAW_RES_ID" -o none
APPI_CONN=$(az monitor app-insights component show -g "$RG" --app "$APPI" --query connectionString -o tsv)

step "4/9 Container registry + cloud builds (no local Docker needed)"
az acr create -g "$RG" -n "$ACR" --sku Basic -o none
az acr build -r "$ACR" -t "p2p-api:$TAG" -f docker/api.Dockerfile . --only-show-errors
az acr build -r "$ACR" -t "p2p-erp:$TAG" -f docker/erp.Dockerfile . --only-show-errors

step "5/9 Container Apps environment"
az containerapp env create -g "$RG" -n "$ACA_ENV" -l "$LOCATION" \
  --logs-workspace-id "$LAW_ID" --logs-workspace-key "$LAW_KEY" -o none

step "6/9 Database"
if [[ "${USE_POSTGRES:-0}" == "1" ]]; then
  PG_PASS="${PG_PASS:-$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)Aa1}"
  az postgres flexible-server create -g "$RG" -n "$PG" -l "$LOCATION" \
    --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
    --admin-user "$PG_USER" --admin-password "$PG_PASS" --public-access 0.0.0.0 --yes -o none
  az postgres flexible-server db create -g "$RG" -s "$PG" -d "$PG_DB" -o none
  DATABASE_URL="postgresql+psycopg://${PG_USER}:${PG_PASS}@${PG}.postgres.database.azure.com:5432/${PG_DB}?sslmode=require"
else
  DATABASE_URL="sqlite:///./var/p2p_sentinel.db"   # demo only: resets when the container restarts
fi

step "7/9 Mock ERP (internal ingress: only reachable inside the environment)"
az containerapp create -g "$RG" -n "$ERP_APP" --environment "$ACA_ENV" \
  --image "$ACR.azurecr.io/p2p-erp:$TAG" --registry-server "$ACR.azurecr.io" --registry-identity system \
  --target-port 8001 --ingress internal --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi -o none
ERP_FQDN=$(az containerapp show -g "$RG" -n "$ERP_APP" --query properties.configuration.ingress.fqdn -o tsv)

step "8/9 API (secrets as Container Apps secrets, referenced with secretref:)"
az containerapp create -g "$RG" -n "$API_APP" --environment "$ACA_ENV" \
  --image "$ACR.azurecr.io/p2p-api:$TAG" --registry-server "$ACR.azurecr.io" --registry-identity system \
  --target-port 8000 --ingress external --min-replicas 0 --max-replicas 3 --cpu 0.5 --memory 1.0Gi \
  --secrets "db-url=$DATABASE_URL" "appi-conn=$APPI_CONN" \
  --env-vars "APP_ENV=dev" "DATABASE_URL=secretref:db-url" "APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:appi-conn" \
             "ERP_BASE_URL=https://$ERP_FQDN" "LLM_PROVIDER=${LLM_PROVIDER:-offline}" "JIRA_PROJECT_KEY=AP" -o none
API_URL="https://$(az containerapp show -g "$RG" -n "$API_APP" --query properties.configuration.ingress.fqdn -o tsv)"

step "9/9 Frontend on Static Web Apps (Free)"
az staticwebapp create -g "$RG" -n "$SWA" -l "$SWA_LOCATION" --sku Free -o none
SWA_HOST=$(az staticwebapp show -g "$RG" -n "$SWA" --query defaultHostname -o tsv)
SWA_TOKEN=$(az staticwebapp secrets list -g "$RG" -n "$SWA" --query properties.apiKey -o tsv)
(cd frontend && npm ci && VITE_API_BASE_URL="$API_URL" npm run build && cp ../infra/azure/staticwebapp.config.json dist/ \
  && npx --yes @azure/static-web-apps-cli deploy ./dist --deployment-token "$SWA_TOKEN" --env production)
az containerapp update -g "$RG" -n "$API_APP" --set-env-vars "CORS_ORIGINS=https://$SWA_HOST,http://localhost:5173" -o none

step "Smoke test"
curl -fsS "$API_URL/healthz" && echo
curl -fsS "$API_URL/readyz" && echo
echo -e "\nAPI : $API_URL/docs\nUI  : https://$SWA_HOST\nLogs: az containerapp logs show -g $RG -n $API_APP --follow"
