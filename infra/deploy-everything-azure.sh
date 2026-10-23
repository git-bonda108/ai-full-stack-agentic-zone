#!/usr/bin/env bash
# One command, from Azure Cloud Shell (Bash):
#   git clone -b claude/jolly-knuth-liyd1i https://github.com/git-bonda108/ai-full-stack-agentic-zone.git
#   cd ai-full-stack-agentic-zone && bash infra/deploy-everything-azure.sh
# Publishes the training runbook and deploys the P2P Sentinel app, then prints every public link.
set -euo pipefail
cd "$(dirname "$0")/.."
bash infra/deploy-runbook-azure.sh | tee /tmp/runbook-deploy.log
(cd reference-app && bash infra/azure/deploy.sh) | tee /tmp/p2p-deploy.log
echo
echo "================ ALL LINKS ================"
grep -h "Runbook is live" /tmp/runbook-deploy.log
grep -hE "^  (UI|API docs|Health) " /tmp/p2p-deploy.log
