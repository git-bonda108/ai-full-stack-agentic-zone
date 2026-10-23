#!/usr/bin/env bash
# Names for every Azure resource. Source it:  source infra/azure/env.sh
# Override any value by exporting it before sourcing (e.g. export SUFFIX=ab12).
# Stable per subscription, so globally unique names (ACR, Postgres, SWA) don't collide with other people's
export SUFFIX="${SUFFIX:-$(az account show --query id -o tsv 2>/dev/null | tr -dc 'a-f0-9' | head -c 6)}"
export LOCATION="${LOCATION:-eastus}"
export SWA_LOCATION="${SWA_LOCATION:-eastasia}"     # Static Web Apps regions are limited
export RG="${RG:-rg-p2p-dev}"
export LAW="${LAW:-log-p2p-dev}"
export APPI="${APPI:-appi-p2p-dev}"
export ACA_ENV="${ACA_ENV:-cae-p2p-dev}"
export ACR="${ACR:-acrp2p${SUFFIX}}"                # globally unique, lowercase alphanumerics
export PG="${PG:-pg-p2p-${SUFFIX}}"                 # globally unique
export PG_USER="${PG_USER:-p2padmin}"
export PG_DB="${PG_DB:-p2p}"
export SWA="${SWA:-swa-p2p-${SUFFIX}}"
export API_APP="${API_APP:-p2p-api}"
export ERP_APP="${ERP_APP:-p2p-erp}"
export TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
echo "RG=$RG LOCATION=$LOCATION ACR=$ACR ACA_ENV=$ACA_ENV API=$API_APP ERP=$ERP_APP SWA=$SWA TAG=$TAG"
