#!/usr/bin/env bash
# Create an Entra ID app registration that GitHub Actions can log in as, with NO stored secret (OIDC).
#   bash infra/azure/github-oidc.sh <github-owner> <github-repo> [branch]
set -euo pipefail
source "$(dirname "$0")/env.sh"
OWNER="$1"; REPO="$2"; BRANCH="${3:-main}"
SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

APP_ID=$(az ad app create --display-name "gh-p2p-deployer" --query appId -o tsv)
az ad sp create --id "$APP_ID" -o none 2>/dev/null || true   # service principal = the app's identity in this tenant
az role assignment create --assignee "$APP_ID" --role Contributor \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG" -o none
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"gh-${REPO}-${BRANCH}\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${OWNER}/${REPO}:ref:refs/heads/${BRANCH}\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" -o none

echo "Add these as GitHub repository secrets (Settings → Secrets and variables → Actions):"
echo "  AZURE_CLIENT_ID=$APP_ID"
echo "  AZURE_TENANT_ID=$TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID=$SUB_ID"
echo "And repository variables: AZ_RG=$RG AZ_ACR=$ACR AZ_API_APP=$API_APP AZ_ERP_APP=$ERP_APP AZ_SWA=$SWA"
