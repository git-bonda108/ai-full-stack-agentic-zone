#!/usr/bin/env bash
# Delete EVERYTHING created by deploy.sh (one resource group). Run it yourself; hooks block Claude from doing it.
set -euo pipefail
source "$(dirname "$0")/env.sh"
read -r -p "Delete resource group $RG and all its resources? Type the name to confirm: " ok
[[ "$ok" == "$RG" ]] || { echo "Cancelled."; exit 1; }
az group delete -n "$RG" --yes --no-wait
echo "Deletion started. Check: az group show -n $RG"
