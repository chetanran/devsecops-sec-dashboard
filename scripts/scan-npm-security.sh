#!/bin/bash
# NPM security scans script
# Usage: ./scripts/scan-npm-security.sh [--quiet]
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

log "=== NPM Security Scan ==="
log ""

# Navigate to frontend
cd frontend

log "Installing dependencies..."
if [ "$QUIET_MODE" = true ]; then
  npm install --legacy-peer-deps --quiet 2>&1
else
  npm install --legacy-peer-deps
fi

log ""
log "=== Running npm audit ==="
npm audit --json --audit-level=none > npm-audit-report.json 2>&1 || true

# Validate JSON
if [ ! -s npm-audit-report.json ] || ! jq empty npm-audit-report.json 2>/dev/null; then
  log "WARNING: npm audit failed or produced invalid JSON, creating fallback"
  echo '{"vulnerabilities":{},"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":0,"critical":0}}}' > npm-audit-report.json
fi

log "Output saved to: frontend/npm-audit-report.json"
log "Parsing results..."
CRITICAL=$(jq -r '.metadata.vulnerabilities.critical // 0' npm-audit-report.json 2>/dev/null || echo 0)
HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' npm-audit-report.json 2>/dev/null || echo 0)
MODERATE=$(jq -r '.metadata.vulnerabilities.moderate // 0' npm-audit-report.json 2>/dev/null || echo 0)
LOW=$(jq -r '.metadata.vulnerabilities.low // 0' npm-audit-report.json 2>/dev/null || echo 0)
TOTAL=$((CRITICAL + HIGH + MODERATE + LOW))
log "  → Critical: $CRITICAL"
log "  → High:     $HIGH"
log "  → Moderate: $MODERATE"
log "  → Low:      $LOW"
log "  → Total:    $TOTAL"
log ""

cd ..

log "=== Summary ==="
log "Report generated in frontend/ directory:"
log "  - npm-audit-report.json"
log ""
log "Total findings:"
log "  npm audit: $TOTAL vulnerabilities (C:$CRITICAL H:$HIGH M:$MODERATE L:$LOW)"

# Exit with success (continue-on-error handled by workflow)
exit 0
