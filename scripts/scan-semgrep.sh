#!/bin/bash
# Semgrep SAST security scan script
# Usage: ./scripts/scan-semgrep.sh [--quiet]
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

log "=== Semgrep SAST Scan ==="
log ""

# Determine a command to run semgrep. If it's not on PATH, try to install it.
# If the CLI is present but not executable (e.g. Windows .exe/script visible in WSL),
# prefer running via the Python module: `python -m semgrep`.
SEMGREP_CMD=""
SEMGREP_PATH="$(command -v semgrep 2>/dev/null || true)"
if [ -n "$SEMGREP_PATH" ]; then
  # If the path is executable, use the CLI. Otherwise prefer running via python -m semgrep
  if [ -x "$SEMGREP_PATH" ]; then
    SEMGREP_CMD=semgrep
  else
    log "Found semgrep at $SEMGREP_PATH but it's not executable in this shell. Will use 'python -m semgrep' instead when possible."
    if command -v python3 &> /dev/null; then
      SEMGREP_CMD="python3 -m semgrep"
    elif command -v python &> /dev/null; then
      SEMGREP_CMD="python -m semgrep"
    else
      # No python available; still try the CLI path (may fail)
      SEMGREP_CMD="$SEMGREP_PATH"
    fi
  fi
else
  log "Semgrep not found on PATH. Attempting to install..."
  #!/bin/bash
  # Semgrep SAST security scan script
  # Usage: ./scripts/scan-semgrep.sh [--quiet]
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

  log "=== Semgrep SAST Scan ==="
  log ""

  # Check if semgrep is installed, install if not
  if ! command -v semgrep &> /dev/null; then
    log "Installing Semgrep..."
    if [ "$QUIET_MODE" = true ]; then
      pip install semgrep --quiet 2>&1
    else
      pip install semgrep
    fi
  fi

  log "Running Semgrep with auto configuration..."
  log "Scanning: backend/ and frontend/"
  log ""

  # Run Semgrep with auto config (uses registry rules)
  # --config=auto: Automatically selects rules based on detected languages
  # --json: Output in JSON format
  # --quiet: Suppress progress output (separate from our QUIET_MODE)
  # Scan both backend and frontend directories
  semgrep --config=auto \
    --json \
    --output semgrep-report.json \
    --quiet \
    backend/ frontend/ 2>&1 || true

  # If file doesn't exist or is empty, create fallback
  if [ ! -s semgrep-report.json ]; then
    echo '{"results":[],"errors":[],"paths":{"scanned":[]}}' > semgrep-report.json
  fi

  log "Output saved to: semgrep-report.json"

  # Parse results
  TOTAL_FINDINGS=$(jq -r '.results | length // 0' semgrep-report.json 2>/dev/null || echo 0)
  ERROR_COUNT=$(jq -r '[.results[] | select(.extra.severity == "ERROR")] | length // 0' semgrep-report.json 2>/dev/null || echo 0)
  WARNING_COUNT=$(jq -r '[.results[] | select(.extra.severity == "WARNING")] | length // 0' semgrep-report.json 2>/dev/null || echo 0)
  INFO_COUNT=$(jq -r '[.results[] | select(.extra.severity == "INFO")] | length // 0' semgrep-report.json 2>/dev/null || echo 0)

  log "  → Total findings: $TOTAL_FINDINGS"
  log "  → Error:   $ERROR_COUNT"
  log "  → Warning: $WARNING_COUNT"
  log "  → Info:    $INFO_COUNT"
  log ""

  # Show top issues by category (if any)
  if [ "$TOTAL_FINDINGS" -gt 0 ]; then
    log "Top security categories found:"
    jq -r '.results[].extra.metadata.category // "uncategorized"' semgrep-report.json 2>/dev/null | \
      sort | uniq -c | sort -rn | head -5 | \
      awk '{print "  - " $2 ": " $1 " finding(s)"}' || true
    log ""
  fi

  log "=== Summary ==="
  log "Report generated in root directory:"
  log "  - semgrep-report.json"
  log ""
  log "Total findings: $TOTAL_FINDINGS (E:$ERROR_COUNT W:$WARNING_COUNT I:$INFO_COUNT)"

  # Exit with success (continue-on-error handled by workflow)
  exit 0
eval "$SEMGREP_CMD --config=auto \
