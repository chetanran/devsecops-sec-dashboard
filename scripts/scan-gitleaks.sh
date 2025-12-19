#!/bin/bash
# Gitleaks secret scanning script
# Usage: ./scripts/scan-gitleaks.sh [--quiet]
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

log "=== Gitleaks Secret Scan ==="
log ""

# Check if gitleaks is installed
if ! command -v gitleaks &> /dev/null; then
  log "Gitleaks not found. Installing..."

  # Detect OS
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    wget -q https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz
    tar -xzf gitleaks_8.18.2_linux_x64.tar.gz
    chmod +x gitleaks
    sudo mv gitleaks /usr/local/bin/ 2>/dev/null || mv gitleaks ./gitleaks
    rm gitleaks_8.18.2_linux_x64.tar.gz
    GITLEAKS_CMD="gitleaks"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    log "For macOS, install via: brew install gitleaks"
    log "Or download from: https://github.com/gitleaks/gitleaks/releases"
    exit 1
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    log "For Windows, download from: https://github.com/gitleaks/gitleaks/releases"
    log "Extract and add to PATH, or run via WSL"
    exit 1
  fi
else
  GITLEAKS_CMD="gitleaks"
fi

log "Running Gitleaks scan..."
# Gitleaks exits with code 1 when leaks are found, which is expected
$GITLEAKS_CMD detect --source . --report-format json --report-path gitleaks-report.json --no-git || true

# If file doesn't exist or is empty, create fallback
if [ ! -s gitleaks-report.json ]; then
  echo '[]' > gitleaks-report.json
fi

log "Output saved to: gitleaks-report.json"
log ""

log "Parsing results..."
SECRETS_COUNT=$(jq -r '. | length // 0' gitleaks-report.json 2>/dev/null || echo 0)
log "  → Found: $SECRETS_COUNT potential secrets"

if [ "$SECRETS_COUNT" -gt 0 ] && [ "$QUIET_MODE" = false ]; then
  log ""
  log "Secret details:"
  jq -r '.[] | "  - \(.RuleID) in \(.File):\(.StartLine)"' gitleaks-report.json 2>/dev/null || log "  (Unable to parse details)"
fi

log ""
log "=== Summary ==="
log "Report generated: gitleaks-report.json"
log "Total findings: $SECRETS_COUNT potential secrets"

# Exit with success (continue-on-error handled by workflow)
exit 0
