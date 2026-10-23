#!/usr/bin/env bash
# Publish the training runbook as a public Azure Storage static website.
#   az login --use-device-code   (once)
#   bash infra/deploy-runbook-azure.sh
# Re-run after any content change: it rebuilds the single-file app and re-uploads it.
set -euo pipefail
cd "$(dirname "$0")/.."
RG="${RG:-rg-agentic-zone}"
LOCATION="${LOCATION:-eastus}"
SA="${SA:-stagenticzone$(az account show --query id -o tsv | tr -dc 'a-f0-9' | head -c 6)}"

python3 tools/build_single.py
az group create -n "$RG" -l "$LOCATION" --tags app=agentic-zone-runbook -o none
az storage account show -n "$SA" -g "$RG" -o none 2>/dev/null || \
  az storage account create -n "$SA" -g "$RG" -l "$LOCATION" --sku Standard_LRS --kind StorageV2 \
    --min-tls-version TLS1_2 --allow-blob-public-access false -o none
KEY=$(az storage account keys list -n "$SA" -g "$RG" --query "[0].value" -o tsv)
az storage blob service-properties update --account-name "$SA" --account-key "$KEY" \
  --static-website --index-document index.html --404-document index.html -o none
az storage blob upload --account-name "$SA" --account-key "$KEY" -c '$web' \
  -f dist/agentic-zone-runbook.html -n index.html --content-type "text/html; charset=utf-8" \
  --content-cache-control "no-cache" --overwrite -o none
URL=$(az storage account show -n "$SA" -g "$RG" --query primaryEndpoints.web -o tsv)
echo "Runbook is live (public): $URL"
