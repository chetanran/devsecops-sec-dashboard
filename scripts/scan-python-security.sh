#!/bin/bash
# Python security scans script
# Usage: ./scripts/scan-python-security.sh [--quiet]
# Used by: GitHub Actions workflow and local testing

set -e  # Exit on error

QUIET_MODE=false
if [ "$1" = "--quiet" ]; then
  QUIET_MODE=true
fi

log() {
  if [ "$QUIET_MODE" = false ]; then
    echo "$@"
  fi
}

log "=== Python Security Scan ==="
log ""

# Install tools if not present
log "Installing security tools..."
if [ "$QUIET_MODE" = true ]; then
  pip install --upgrade pip --quiet 2>&1
  pip install -r backend/requirements.txt --quiet 2>&1
  pip install pip-audit bandit --quiet 2>&1
else
  pip install --upgrade pip
  pip install -r backend/requirements.txt
  pip install pip-audit bandit
fi

log ""
log "=== 1. Running pip-audit ==="
# pip-audit exits with 1 when vulnerabilities found, which is expected
# Don't redirect stderr to stdout, let it write directly to the file
pip-audit --requirement backend/requirements.txt --format json --output backend/pip-audit-report.json || true

# If file doesn't exist or is empty, create fallback
if [ ! -s backend/pip-audit-report.json ]; then
  echo '{"dependencies":[],"vulnerabilities":[]}' > backend/pip-audit-report.json
fi

log "Output saved to: backend/pip-audit-report.json"
VULN_COUNT=$(jq -r '[.dependencies[]? | select(.vulns | length > 0)] | length // 0' backend/pip-audit-report.json 2>/dev/null || echo 0)
TOTAL_VULNS=$(jq -r '[.dependencies[]?.vulns[]?] | length // 0' backend/pip-audit-report.json 2>/dev/null || echo 0)
log "  → Found: $VULN_COUNT vulnerable packages with $TOTAL_VULNS total vulnerabilities"
log ""

log "=== 2. Running Bandit (SAST) ==="
# Bandit exits with 1 when issues found, which is expected
# Exclude common virtual environment and build directories
bandit -r backend/ \
  -x backend/be,backend/venv,backend/env,backend/.venv,backend/sectesting,backend/build,backend/dist,backend/.eggs \
  -f json -o backend/bandit-report.json || true

# If file doesn't exist or is empty, create fallback
if [ ! -s backend/bandit-report.json ]; then
  echo '{"results":[],"metrics":{"_totals":{"CONFIDENCE.HIGH":0,"SEVERITY.HIGH":0}}}' > backend/bandit-report.json
fi

log "Output saved to: backend/bandit-report.json"
BANDIT_COUNT=$(jq -r '.results | length // 0' backend/bandit-report.json 2>/dev/null || echo 0)
BANDIT_HIGH=$(jq -r '.metrics._totals."SEVERITY.HIGH" // 0' backend/bandit-report.json 2>/dev/null || echo 0)
log "  → Found: $BANDIT_COUNT total issues ($BANDIT_HIGH high severity)"
log ""

log "=== Summary ==="
log "All reports generated in backend/ directory:"
log "  - pip-audit-report.json"
log "  - bandit-report.json"
log ""
log "Total findings:"
log "  pip-audit: $VULN_COUNT packages ($TOTAL_VULNS vulnerabilities)"
log "  Bandit:    $BANDIT_COUNT issues ($BANDIT_HIGH high severity)"

# Exit with success (continue-on-error handled by workflow)
exit 0
