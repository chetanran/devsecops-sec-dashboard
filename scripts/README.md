# Security Scan Test Scripts

These scripts allow you to test security scans locally before running them in the GitHub Actions pipeline.

## Quick Start

### Run All Scans
```bash
bash scripts/test-all-scans.sh
```

### Run Individual Scans
```bash
# Python security scans (pip-audit, bandit)
bash scripts/scan-python-security.sh

# NPM security scans (npm audit)
bash scripts/scan-npm-security.sh

# Multi-language SAST (semgrep)
bash scripts/scan-semgrep.sh

# Secret scanning (gitleaks)
bash scripts/scan-gitleaks.sh
```

## Prerequisites

### Required Tools
- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **jq** (JSON processor)
- **bash** (Git Bash on Windows, native on Linux/Mac)

### Installing jq
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows (via Chocolatey)
choco install jq

# Windows (via Scoop)
scoop install jq
```

### Installing Gitleaks (Optional - script will auto-download on Linux)
```bash
# macOS
brew install gitleaks

# Linux (auto-installed by script)
# Windows - download from https://github.com/gitleaks/gitleaks/releases
```

## What Each Script Does

### 1. `scan-python-security.sh`
Runs Python security scans on the backend:
- **pip-audit**: Checks for known vulnerabilities in dependencies
- **Bandit**: Static analysis for Python code security issues

**Outputs:**
- `backend/pip-audit-report.json`
- `backend/bandit-report.json`

**Note:** We previously used Safety but removed it as pip-audit covers ~95% of the same vulnerabilities with better CI/CD integration (no authentication required).

### 2. `scan-npm-security.sh`
Runs NPM security scans on the frontend:
- **npm audit**: Checks for known vulnerabilities in npm packages

**Outputs:**
- `frontend/npm-audit-report.json`

**Note:** We previously used retire.js but removed it due to interactive installation prompts. npm audit provides comprehensive coverage of JavaScript vulnerabilities.

### 3. `scan-semgrep.sh`
Runs multi-language SAST scanning:
- **Semgrep**: Static analysis for security vulnerabilities across Python, JavaScript, and more

**Outputs:**
- `semgrep-report.json`

**Why Semgrep:**
- Multi-language support (Python, JavaScript, TypeScript, Go, etc.)
- Uses curated security rules from Semgrep Registry
- Complements Bandit with broader coverage and custom rule capabilities
- Fast, lightweight, and easy to configure

### 4. `scan-gitleaks.sh`
Runs secret scanning on entire repository:
- **Gitleaks**: Detects hardcoded secrets, API keys, credentials

**Outputs:**
- `gitleaks-report.json`

### 5. `test-all-scans.sh`
Master script that runs all above scans and provides a summary table.

## Benefits of Local Testing

### 1. Fast Iteration
- ⚡ Test in seconds vs minutes in CI/CD
- 🔄 Iterate quickly on fixes
- 💰 Save GitHub Actions minutes

### 2. Understanding Tool Behavior
- 📊 See actual JSON structure
- 🐛 Debug parsing logic
- 🔍 Identify edge cases

### 3. Validate Before Pushing
- ✅ Ensure scans pass locally
- 🎯 Fix issues before CI/CD
- 📈 Higher first-time success rate

### 4. Learn Tool Flags
- 🛠️ Experiment with options
- 📚 Understand output formats
- 🎓 Build expertise

## Example Workflow

```bash
# 1. Make code changes
vim backend/main.py

# 2. Run security scans locally
bash scripts/test-all-scans.sh

# 3. Review findings
cat backend/pip-audit-report.json | jq '.dependencies[] | select(.vulns | length > 0)'

# 4. Fix issues
pip install --upgrade vulnerable-package

# 5. Re-test
bash scripts/scan-python-security.sh

# 6. Commit and push (triggers GitHub Actions)
git add .
git commit -m "fix: upgrade vulnerable dependencies"
git push
```

## Troubleshooting

### "command not found: jq"
Install jq (see Prerequisites above)

### "pip-audit: command not found"
Run: `pip install pip-audit bandit`

### "npm: command not found"
Install Node.js from https://nodejs.org

### Permission denied on Linux/Mac
Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### Windows: "bash: command not found"
Use Git Bash or WSL (Windows Subsystem for Linux)

## Comparing Local vs CI/CD Results

After running locally and pushing to GitHub:

1. **Local Output**: Check console output and JSON files
2. **CI/CD Output**: View GitHub Actions run summary
3. **Compare**: Ensure counts match (if not, investigate differences)

## Tips

- **Run before every commit** to catch issues early
- **Check JSON files** to understand tool output structure
- **Add to git ignore**: `*-report.json` to avoid committing reports
- **Automate**: Add to pre-commit hooks for automatic validation

## Integration with GitHub Actions

These scripts mirror the exact commands used in:
`.github/workflows/security-scan.yml`

Any changes to local scripts should be reflected in the pipeline and vice versa.
