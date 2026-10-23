Zone.addModule({
  id: "deploy", num: "15", order: 15, phase: "ship", stage: "Deploy",
  icon: "☁️", color: "coral", duration: "90 min",
  title: "Containerise and deploy to Azure", short: "Deploy to Azure",
  subtitle: "Docker → ACR → Container Apps + Static Web Apps → Entra ID app registration + GitHub OIDC → rollback",
  goals: ["Images built in the cloud", "API + ERP on Container Apps", "UI on Static Web Apps", "Keyless CI/CD"],
  cards: [
    {
      type: "compare", title: "Where should it run? (and do we need Kubernetes?)",
      cols: [
        { title: "App Service", icon: "🌐", color: "sky", points: ["Classic PaaS web apps", "Simple, but no scale-to-zero", "Good for a single monolith"] },
        { title: "Container Apps ✓", icon: "📦", color: "brand", points: ["Serverless containers on managed Kubernetes (KEDA, Envoy)", "Scale to zero; free monthly grant", "Revisions, traffic split, internal ingress, secrets", "No cluster to operate"], verdict: "Our choice (ADR-0003)" },
        { title: "AKS", icon: "☸️", color: "violet", points: ["Full Kubernetes: any CRD, mesh, GPU pools", "You run upgrades, node pools, networking", "Pays off with many services and a platform team"], verdict: "Not needed at our scale" },
        { title: "Static Web Apps ✓", icon: "🖼️", color: "teal", points: ["Global static hosting for the React build", "Free tier, built-in auth (Entra ID)", "Perfect for an SPA"], verdict: "Our frontend" },
      ],
      callouts: [{ kind: "why", title: "\"Do we need Kubernetes?\"", text: "You get Kubernetes' benefits (containers, autoscaling, rolling revisions) through Container Apps **without** running a cluster. Choose AKS when you need what only raw Kubernetes gives you. An optional AKS manifest is in `infra/k8s/api.yaml` so you can compare." }],
    },
    {
      type: "diagram", title: "Target architecture on Azure",
      mermaid: "flowchart LR\n  subgraph GH[GitHub]\n    code[repo] --> act[Actions<br/>OIDC, no secrets]\n  end\n  subgraph AZ[Azure · resource group {{az.rg}}]\n    acr[(ACR {{az.acr}})]\n    subgraph ENV[Container Apps env {{az.acaEnv}}]\n      api[{{az.api}}<br/>external ingress]\n      erp[{{az.erp}}<br/>internal ingress]\n    end\n    swa[Static Web Apps {{az.swa}}<br/>React SPA, public or Entra login]\n    pg[(PostgreSQL {{az.pg}}<br/>optional)]\n    appi[App Insights {{az.appi}}] --- law[(Log Analytics {{az.law}})]\n  end\n  act -->|az acr build| acr\n  act -->|containerapp update| api\n  acr --> api & erp\n  swa -->|HTTPS + CORS| api\n  api --> erp\n  api --> pg\n  api -->|OpenTelemetry| appi\n  ENV -->|stdout logs| law",
    },
    {
      type: "concept", title: "Containers in five minutes",
      lead: "An **image** packages your code + Python + dependencies. A **container** is a running image. The same image runs on your laptop, in CI and in Azure, so \"works on my machine\" stops being an excuse.",
      side: { code: "FROM python:3.12-slim            # small base image\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt   # cached layer\nCOPY backend ./backend               # code changes don't re-install deps\nCOPY data ./data\nRUN useradd -u 10001 appuser && chown -R appuser /app\nUSER appuser                      # never run as root\nEXPOSE 8000\nHEALTHCHECK CMD python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')\"\nCMD [\"uvicorn\", \"backend.app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]", kind: "file", lang: "dockerfile", label: "docker/api.Dockerfile (abridged)" },
      points: ["**Layer order matters**: dependencies before code, so rebuilds are fast", "**No secrets in images**: config arrives as env vars / secrets at runtime", "**Non-root + healthcheck** is the security and ops baseline", "Frontend: multi-stage build (Node builds, nginx serves); `VITE_API_BASE_URL` is baked in at **build** time"],
    },
    {
      type: "cmds", title: "Run the whole stack locally with Docker Compose (optional)",
      lead: "Needs Docker Desktop / Docker Engine on the VM. Skip it if Docker isn't installed: Azure builds images for us in the cloud.",
      blocks: [
        { cmd: "docker compose up --build\n# UI  http://localhost:8080   API http://localhost:8000/docs   ERP http://localhost:8001/docs", expect: "Postgres, ERP, API and web containers start; the UI works against Postgres." },
        { cmd: "docker compose ps\ndocker compose logs -f api\ndocker compose down        # add -v to also drop the database volume" },
      ],
    },
    {
      type: "cmds", title: "Step 1 · Sign in and pick the subscription",
      lead: "Device-code login works on a VM without a browser session. Sign in with **your** Azure account. Check **My variables** first so every command below is filled in.",
      blocks: [
        { cmd: { bash: "az login --use-device-code\naz account list -o table\naz account set --subscription \"{{az.subscription}}\"\naz account show --query \"{name:name, id:id, user:user.name, tenant:tenantId}\" -o table", ps: "az login --use-device-code\naz account list -o table\naz account set --subscription \"{{az.subscription}}\"\naz account show --query \"{name:name, id:id, user:user.name, tenant:tenantId}\" -o table" }, expect: "Your subscription is listed as default. Copy its id into **My variables → az.subscription**." },
        { label: "Register providers + CLI extensions (once per subscription)", cmd: { bash: "for ns in Microsoft.App Microsoft.OperationalInsights Microsoft.ContainerRegistry Microsoft.Insights Microsoft.Web Microsoft.DBforPostgreSQL; do\n  az provider register --namespace $ns --wait\ndone\naz extension add --name containerapp --upgrade\naz extension add --name application-insights --upgrade", ps: "'Microsoft.App','Microsoft.OperationalInsights','Microsoft.ContainerRegistry','Microsoft.Insights','Microsoft.Web','Microsoft.DBforPostgreSQL' | ForEach-Object { az provider register --namespace $_ --wait }\naz extension add --name containerapp --upgrade\naz extension add --name application-insights --upgrade" } },
      ],
    },
    {
      type: "cmds", title: "Step 2 · Resource group, Log Analytics, Application Insights",
      lead: "One resource group holds everything, so cleanup is one command. Tags say who owns what.",
      blocks: [
        { cmd: { bash: "az group create -n {{az.rg}} -l {{az.location}} --tags app={{app.slug}} env=dev\n\naz monitor log-analytics workspace create -g {{az.rg}} -n {{az.law}} -l {{az.location}}\nLAW_ID=$(az monitor log-analytics workspace show -g {{az.rg}} -n {{az.law}} --query customerId -o tsv)\nLAW_KEY=$(az monitor log-analytics workspace get-shared-keys -g {{az.rg}} -n {{az.law}} --query primarySharedKey -o tsv)\nLAW_RES_ID=$(az monitor log-analytics workspace show -g {{az.rg}} -n {{az.law}} --query id -o tsv)\n\naz monitor app-insights component create -g {{az.rg}} --app {{az.appi}} -l {{az.location}} --workspace $LAW_RES_ID\nAPPI_CONN=$(az monitor app-insights component show -g {{az.rg}} --app {{az.appi}} --query connectionString -o tsv)", ps: "az group create -n {{az.rg}} -l {{az.location}} --tags app={{app.slug}} env=dev\n\naz monitor log-analytics workspace create -g {{az.rg}} -n {{az.law}} -l {{az.location}}\n$LAW_ID = az monitor log-analytics workspace show -g {{az.rg}} -n {{az.law}} --query customerId -o tsv\n$LAW_KEY = az monitor log-analytics workspace get-shared-keys -g {{az.rg}} -n {{az.law}} --query primarySharedKey -o tsv\n$LAW_RES_ID = az monitor log-analytics workspace show -g {{az.rg}} -n {{az.law}} --query id -o tsv\n\naz monitor app-insights component create -g {{az.rg}} --app {{az.appi}} -l {{az.location}} --workspace $LAW_RES_ID\n$APPI_CONN = az monitor app-insights component show -g {{az.rg}} --app {{az.appi}} --query connectionString -o tsv" } },
      ],
      callouts: [{ kind: "trap", title: "Keep the terminal open", text: "Later steps reuse `$LAW_ID`, `$APPI_CONN` and friends. New terminal? Re-run the lines that set them (or `source infra/azure/env.sh` in bash)." }],
    },
    {
      type: "cmds", title: "Step 3 · Registry + build images in the cloud",
      lead: "`az acr build` uploads the source and builds **in Azure**, so no Docker daemon is needed on the VM. Run from the project root.",
      blocks: [
        { cmd: { bash: "az acr create -g {{az.rg}} -n {{az.acr}} --sku Basic\nTAG=$(git rev-parse --short HEAD)\naz acr build -r {{az.acr}} -t {{app.short}}-api:$TAG -f docker/api.Dockerfile .\naz acr build -r {{az.acr}} -t {{app.short}}-erp:$TAG -f docker/erp.Dockerfile .\naz acr repository list -n {{az.acr}} -o table", ps: "az acr create -g {{az.rg}} -n {{az.acr}} --sku Basic\n$TAG = git rev-parse --short HEAD\naz acr build -r {{az.acr}} -t {{app.short}}-api:$TAG -f docker/api.Dockerfile .\naz acr build -r {{az.acr}} -t {{app.short}}-erp:$TAG -f docker/erp.Dockerfile .\naz acr repository list -n {{az.acr}} -o table" }, expect: "Build logs stream from Azure; `{{app.short}}-api` and `{{app.short}}-erp` are listed." },
      ],
      callouts: [{ kind: "tip", title: "Cost", text: "ACR Basic is the only resource here with a small daily charge. Delete the resource group when the course ends (Step 10)." }],
    },
    {
      type: "cmds", title: "Step 4 · Database: PostgreSQL Flexible Server (optional)",
      lead: "Skip this for a free demo: the API falls back to SQLite inside the container (data resets on restart). With an Azure free account, Burstable B1ms is covered by the 12-month free allowance.",
      blocks: [
        { cmd: { bash: "read -s -p \"New Postgres admin password: \" PG_PASS; echo\naz postgres flexible-server create -g {{az.rg}} -n {{az.pg}} -l {{az.location}} \\\n  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \\\n  --admin-user {{az.pgUser}} --admin-password \"$PG_PASS\" --public-access 0.0.0.0 --yes\naz postgres flexible-server db create -g {{az.rg}} -s {{az.pg}} -d {{az.db}}\nDATABASE_URL=\"postgresql+psycopg://{{az.pgUser}}:${PG_PASS}@{{az.pg}}.postgres.database.azure.com:5432/{{az.db}}?sslmode=require\"", ps: "$PG_PASS = Read-Host \"New Postgres admin password\" -MaskInput\naz postgres flexible-server create -g {{az.rg}} -n {{az.pg}} -l {{az.location}} `\n  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 `\n  --admin-user {{az.pgUser}} --admin-password \"$PG_PASS\" --public-access 0.0.0.0 --yes\naz postgres flexible-server db create -g {{az.rg}} -s {{az.pg}} -d {{az.db}}\n$DATABASE_URL = \"postgresql+psycopg://{{az.pgUser}}:$PG_PASS@{{az.pg}}.postgres.database.azure.com:5432/{{az.db}}?sslmode=require\"" } },
        { label: "No Postgres? Use the demo fallback", cmd: { bash: "DATABASE_URL=\"sqlite:///./var/p2p_sentinel.db\"", ps: "$DATABASE_URL = \"sqlite:///./var/p2p_sentinel.db\"" } },
      ],
      callouts: [{ kind: "tip", title: "PowerShell version", text: "`Read-Host -MaskInput` needs PowerShell 7+ (`winget install Microsoft.PowerShell`). In Windows PowerShell 5.1 use `-AsSecureString`, or use Git Bash with the bash tab." }, { kind: "rai", title: "Why `read -s`", text: "The password never appears on screen, in shell history or in a prompt to Claude. `--public-access 0.0.0.0` allows Azure services only. Use private networking in production." }],
    },
    {
      type: "cmds", title: "Step 5 · Container Apps environment + the mock ERP (internal only)",
      blocks: [
        { cmd: { bash: "az containerapp env create -g {{az.rg}} -n {{az.acaEnv}} -l {{az.location}} \\\n  --logs-workspace-id $LAW_ID --logs-workspace-key $LAW_KEY\n\naz containerapp create -g {{az.rg}} -n {{az.erp}} --environment {{az.acaEnv}} \\\n  --image {{az.acr}}.azurecr.io/{{app.short}}-erp:$TAG \\\n  --registry-server {{az.acr}}.azurecr.io --registry-identity system \\\n  --target-port 8001 --ingress internal --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi\nERP_FQDN=$(az containerapp show -g {{az.rg}} -n {{az.erp}} --query properties.configuration.ingress.fqdn -o tsv)", ps: "az containerapp env create -g {{az.rg}} -n {{az.acaEnv}} -l {{az.location}} `\n  --logs-workspace-id $LAW_ID --logs-workspace-key $LAW_KEY\n\naz containerapp create -g {{az.rg}} -n {{az.erp}} --environment {{az.acaEnv}} `\n  --image {{az.acr}}.azurecr.io/{{app.short}}-erp:$TAG `\n  --registry-server {{az.acr}}.azurecr.io --registry-identity system `\n  --target-port 8001 --ingress internal --min-replicas 0 --max-replicas 1 --cpu 0.25 --memory 0.5Gi\n$ERP_FQDN = az containerapp show -g {{az.rg}} -n {{az.erp}} --query properties.configuration.ingress.fqdn -o tsv" } },
      ],
      points: ["`--ingress internal`: the ERP is reachable only from inside the environment, never from the internet", "`--registry-identity system`: the app pulls from ACR with a managed identity. No registry password anywhere"],
    },
    {
      type: "cmds", title: "Step 6 · Deploy the API with secrets",
      lead: "Secrets are stored as Container Apps **secrets** and referenced with `secretref:`. They never appear as plain env vars or in the image.",
      blocks: [
        { cmd: { bash: "az containerapp create -g {{az.rg}} -n {{az.api}} --environment {{az.acaEnv}} \\\n  --image {{az.acr}}.azurecr.io/{{app.short}}-api:$TAG \\\n  --registry-server {{az.acr}}.azurecr.io --registry-identity system \\\n  --target-port 8000 --ingress external --min-replicas 0 --max-replicas 3 --cpu 0.5 --memory 1.0Gi \\\n  --secrets \"db-url=$DATABASE_URL\" \"appi-conn=$APPI_CONN\" \\\n  --env-vars APP_ENV=dev DATABASE_URL=secretref:db-url APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:appi-conn \\\n             ERP_BASE_URL=https://$ERP_FQDN LLM_PROVIDER=offline JIRA_PROJECT_KEY={{jira.project}}\nAPI_URL=\"https://$(az containerapp show -g {{az.rg}} -n {{az.api}} --query properties.configuration.ingress.fqdn -o tsv)\"\ncurl -s $API_URL/healthz; echo; curl -s $API_URL/readyz", ps: "az containerapp create -g {{az.rg}} -n {{az.api}} --environment {{az.acaEnv}} `\n  --image {{az.acr}}.azurecr.io/{{app.short}}-api:$TAG `\n  --registry-server {{az.acr}}.azurecr.io --registry-identity system `\n  --target-port 8000 --ingress external --min-replicas 0 --max-replicas 3 --cpu 0.5 --memory 1.0Gi `\n  --secrets \"db-url=$DATABASE_URL\" \"appi-conn=$APPI_CONN\" `\n  --env-vars APP_ENV=dev DATABASE_URL=secretref:db-url APPLICATIONINSIGHTS_CONNECTION_STRING=secretref:appi-conn `\n             ERP_BASE_URL=https://$ERP_FQDN LLM_PROVIDER=offline JIRA_PROJECT_KEY={{jira.project}}\n$API_URL = \"https://\" + (az containerapp show -g {{az.rg}} -n {{az.api}} --query properties.configuration.ingress.fqdn -o tsv)\nInvoke-RestMethod \"$API_URL/healthz\"; Invoke-RestMethod \"$API_URL/readyz\"" }, expect: "`{\"status\":\"ok\"}` and a readiness payload with `erp: true`. The first call may take ~10 s (scale from zero)." },
        { label: "Adding an LLM key or Jira token later", cmd: { bash: "read -s -p \"OpenAI key: \" K; echo\naz containerapp secret set -g {{az.rg}} -n {{az.api}} --secrets openai-key=\"$K\"\naz containerapp update -g {{az.rg}} -n {{az.api}} --set-env-vars LLM_PROVIDER=openai OPENAI_API_KEY=secretref:openai-key", ps: "$K = Read-Host \"OpenAI key\" -MaskInput\naz containerapp secret set -g {{az.rg}} -n {{az.api}} --secrets openai-key=\"$K\"\naz containerapp update -g {{az.rg}} -n {{az.api}} --set-env-vars LLM_PROVIDER=openai OPENAI_API_KEY=secretref:openai-key" } },
      ],
    },
    {
      type: "cmds", title: "Step 7 · Frontend on Static Web Apps + CORS",
      blocks: [
        { cmd: { bash: "az staticwebapp create -g {{az.rg}} -n {{az.swa}} -l {{az.swaLocation}} --sku Free\nSWA_HOST=$(az staticwebapp show -g {{az.rg}} -n {{az.swa}} --query defaultHostname -o tsv)\nSWA_TOKEN=$(az staticwebapp secrets list -g {{az.rg}} -n {{az.swa}} --query properties.apiKey -o tsv)\n\ncd frontend && npm ci && VITE_API_BASE_URL=$API_URL npm run build\ncp ../infra/azure/staticwebapp.config.json dist/\nnpx --yes @azure/static-web-apps-cli deploy ./dist --deployment-token $SWA_TOKEN --env production\ncd ..\n\naz containerapp update -g {{az.rg}} -n {{az.api}} --set-env-vars CORS_ORIGINS=https://$SWA_HOST\necho \"Open https://$SWA_HOST\"", ps: "az staticwebapp create -g {{az.rg}} -n {{az.swa}} -l {{az.swaLocation}} --sku Free\n$SWA_HOST = az staticwebapp show -g {{az.rg}} -n {{az.swa}} --query defaultHostname -o tsv\n$SWA_TOKEN = az staticwebapp secrets list -g {{az.rg}} -n {{az.swa}} --query properties.apiKey -o tsv\n\ncd frontend; npm ci; $env:VITE_API_BASE_URL = $API_URL; npm run build\nCopy-Item ..\\infra\\azure\\staticwebapp.config.json dist\\\nnpx --yes @azure/static-web-apps-cli deploy ./dist --deployment-token $SWA_TOKEN --env production\ncd ..\n\naz containerapp update -g {{az.rg}} -n {{az.api}} --set-env-vars CORS_ORIGINS=https://$SWA_HOST\n\"Open https://$SWA_HOST\"" }, expect: "The dashboard opens publicly and talks to the Azure API." },
      ],
      points: ["`staticwebapp.config.json` makes the UI public (fine for a demo with synthetic data)", "To require Microsoft (Entra ID) sign-in with zero code, copy `staticwebapp.config.entra.json` instead (or run `PROTECT_UI=1 bash infra/azure/deploy.sh`): every route needs the `authenticated` role and redirects to `/.auth/login/aad`", "To restrict access to named people: Portal → Static Web App → **Role management** → invite users"],
    },
    {
      type: "concept", title: "App registration: what it is (and isn't)",
      lead: "An **app registration** in Microsoft Entra ID gives an application an **identity**. It doesn't deploy anything. We use it for two jobs:",
      side: { table: { head: ["Job", "How"], rows: [
        ["**GitHub Actions → Azure, keyless**", "Federated credential trusts GitHub's OIDC token for *this repo + branch*. No client secret is stored anywhere"],
        ["**Users → our API (optional)**", "Container Apps \"Easy Auth\" with the Microsoft provider validates Entra tokens before requests reach FastAPI"],
      ] } },
      points: ["**Service principal** = the app's identity inside your tenant; RBAC roles are granted to it", "Least privilege: **Contributor on the resource group only**, not the subscription", "A personal Outlook account has its own default directory, so app registrations work there too"],
    },
    {
      type: "cmds", title: "Step 8 · App registration + GitHub OIDC (keyless CI/CD)",
      blocks: [
        { cmd: { bash: "SUB_ID=$(az account show --query id -o tsv); TENANT_ID=$(az account show --query tenantId -o tsv)\nAPP_ID=$(az ad app create --display-name {{az.ghApp}} --query appId -o tsv)\naz ad sp create --id $APP_ID\naz role assignment create --assignee $APP_ID --role Contributor \\\n  --scope /subscriptions/$SUB_ID/resourceGroups/{{az.rg}}\naz ad app federated-credential create --id $APP_ID --parameters '{\n  \"name\": \"gh-{{gh.repo}}-{{gh.branch}}\",\n  \"issuer\": \"https://token.actions.githubusercontent.com\",\n  \"subject\": \"repo:{{gh.owner}}/{{gh.repo}}:ref:refs/heads/{{gh.branch}}\",\n  \"audiences\": [\"api://AzureADTokenExchange\"]\n}'\necho \"AZURE_CLIENT_ID=$APP_ID  AZURE_TENANT_ID=$TENANT_ID  AZURE_SUBSCRIPTION_ID=$SUB_ID\"", ps: "$SUB_ID = az account show --query id -o tsv; $TENANT_ID = az account show --query tenantId -o tsv\n$APP_ID = az ad app create --display-name {{az.ghApp}} --query appId -o tsv\naz ad sp create --id $APP_ID\naz role assignment create --assignee $APP_ID --role Contributor `\n  --scope /subscriptions/$SUB_ID/resourceGroups/{{az.rg}}\n@'\n{\"name\":\"gh-{{gh.repo}}-{{gh.branch}}\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:{{gh.owner}}/{{gh.repo}}:ref:refs/heads/{{gh.branch}}\",\"audiences\":[\"api://AzureADTokenExchange\"]}\n'@ | Set-Content fic.json\naz ad app federated-credential create --id $APP_ID --parameters fic.json; Remove-Item fic.json\n\"AZURE_CLIENT_ID=$APP_ID  AZURE_TENANT_ID=$TENANT_ID  AZURE_SUBSCRIPTION_ID=$SUB_ID\"" } },
        { label: "Store them in GitHub (gh CLI, or Settings → Secrets and variables → Actions)", cmd: { bash: "gh secret set AZURE_CLIENT_ID --body $APP_ID\ngh secret set AZURE_TENANT_ID --body $TENANT_ID\ngh secret set AZURE_SUBSCRIPTION_ID --body $SUB_ID\ngh variable set AZ_RG --body {{az.rg}}; gh variable set AZ_ACR --body {{az.acr}}\ngh variable set AZ_API_APP --body {{az.api}}; gh variable set AZ_ERP_APP --body {{az.erp}}; gh variable set AZ_SWA --body {{az.swa}}", ps: "gh secret set AZURE_CLIENT_ID --body $APP_ID\ngh secret set AZURE_TENANT_ID --body $TENANT_ID\ngh secret set AZURE_SUBSCRIPTION_ID --body $SUB_ID\ngh variable set AZ_RG --body {{az.rg}}; gh variable set AZ_ACR --body {{az.acr}}\ngh variable set AZ_API_APP --body {{az.api}}; gh variable set AZ_ERP_APP --body {{az.erp}}; gh variable set AZ_SWA --body {{az.swa}}" } },
      ],
    },
    { type: "file", title: "The deploy workflow", fileRef: ".github/workflows/reference-app-deploy.yml", lead: "Gates first (reuses the CI workflow), then build in ACR, roll out a new **revision**, smoke test, deploy the SPA. `permissions: id-token: write` is what makes OIDC work." },
    {
      type: "prompt", title: "Prompt: let the devops subagent adapt the pipeline to your repo",
      prompt: "Use the devops subagent. Copy .github/workflows/reference-app-deploy.yml and reference-app-ci.yml into this repo, adjusting paths for our layout (no reference-app/ prefix) and image names {{app.short}}-api / {{app.short}}-erp. Explain every step in a comment. Don't run anything against Azure; show me the diff and the list of GitHub secrets and variables it needs.",
    },
    {
      type: "cmds", title: "Step 9 · Releases, revisions and rollback",
      lead: "Every deploy creates an immutable **revision**. Rolling back means sending traffic to the previous one. It takes seconds, with no rebuild.",
      blocks: [
        { label: "See revisions", cmd: "az containerapp revision list -g {{az.rg}} -n {{az.api}} --query \"[].{name:name, active:properties.active, created:properties.createdTime, traffic:properties.trafficWeight}\" -o table" },
        { label: "Canary: 90/10 between old and new (multiple-revision mode)", cmd: "az containerapp revision set-mode -g {{az.rg}} -n {{az.api}} --mode multiple\naz containerapp ingress traffic set -g {{az.rg}} -n {{az.api}} --revision-weight <old-revision>=90 <new-revision>=10" },
        { label: "Rollback: all traffic to the previous revision", cmd: "az containerapp ingress traffic set -g {{az.rg}} -n {{az.api}} --revision-weight <previous-revision>=100" },
        { label: "Emergency switch: force the deterministic path", cmd: "az containerapp update -g {{az.rg}} -n {{az.api}} --set-env-vars LLM_PROVIDER=offline" },
      ],
    },
    {
      type: "cmds", title: "Optional · The same API on AKS (to compare, then delete)",
      lead: "Costs money while it runs. Do it only to see the operational difference, then delete the cluster.",
      blocks: [
        { cmd: "az aks create -g {{az.rg}} -n aks-{{app.short}} --node-count 1 --node-vm-size Standard_B2s --generate-ssh-keys --attach-acr {{az.acr}}\naz aks get-credentials -g {{az.rg}} -n aks-{{app.short}}\nkubectl create secret generic p2p-secrets --from-literal=DATABASE_URL=sqlite:///./var/p2p.db --from-literal=APPLICATIONINSIGHTS_CONNECTION_STRING=\"$APPI_CONN\"\n# edit the image in infra/k8s/api.yaml, then:\nkubectl apply -f infra/k8s/api.yaml && kubectl get pods,svc -w" },
        { cmd: "az aks delete -g {{az.rg}} -n aks-{{app.short}} --yes --no-wait", label: "Delete the cluster (run it yourself; the hook asks before Azure deletes)" },
      ],
    },
    {
      type: "cmds", title: "Step 10 · Cost control and teardown",
      blocks: [
        { label: "Budget alert (email when you pass the amount)", cmd: "az consumption budget create --budget-name {{app.short}}-monthly --amount 20 --category Cost --time-grain Monthly \\\n  --start-date 2026-11-01 --end-date 2027-10-31 --resource-group {{az.rg}}" },
        { label: "Delete everything (run it yourself; Claude's hook blocks it on purpose)", cmd: "az group delete -n {{az.rg}} --yes --no-wait" },
      ],
      callouts: [{ kind: "tip", title: "What's free here", text: "Container Apps consumption has a monthly free grant (vCPU-seconds, GiB-seconds, requests); Static Web Apps Free; App Insights / Log Analytics include a free ingestion allowance; Postgres B1ms is covered for 12 months on a free account. ACR Basic is a small daily charge." }],
    },
    { type: "file", title: "All of it as one script", fileRef: "reference-app/infra/azure/deploy.sh", lead: "`bash infra/azure/deploy.sh` runs steps 1–9 idempotently (names from `infra/azure/env.sh`). Prefer the step-by-step cards in class so everyone understands each command." },
  ],
});
