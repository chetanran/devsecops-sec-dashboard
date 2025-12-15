from typing import List, Dict
from datetime import datetime

def parse_checkov(data: Dict) -> List[Dict]:
    """Parse Checkov JSON output into standardized cloud findings"""
    findings = []
    
    # Checkov format: data['results']['failed_checks']
    failed_checks = data.get('results', {}).get('failed_checks', [])
    
    for check in failed_checks:
        finding = {
            "check_id": check.get('check_id', 'UNKNOWN'),
            "check_name": check.get('check_name', 'Unknown Check'),
            "severity": map_checkov_severity(check.get('severity', 'MEDIUM')),
            "resource": check.get('resource', 'unknown'),
            "file_path": check.get('file_path', ''),
            "line_number": check.get('file_line_range', [0])[0] if check.get('file_line_range') else None,
            "description": check.get('description', ''),
            "remediation": check.get('guideline', ''),
            "scan_timestamp": datetime.now().isoformat()
        }
        findings.append(finding)
    
    return findings

def parse_gitleaks(data: Dict) -> List[Dict]:
    """Parse Gitleaks JSON output into standardized secret findings

    Supports both formats:
    1. Standard Gitleaks output (list of individual findings)
    2. Deduplicated format (grouped by unique secret with locations)
    """
    findings = []

    # Check if this is deduplicated format (has 'secrets' and 'scan_metadata')
    if 'secrets' in data and 'scan_metadata' in data:
        # Deduplicated format
        repo_name = data.get('scan_metadata', {}).get('repo_name', data.get('repo_name', 'Unknown'))

        for secret in data['secrets']:
            secret_type = secret.get('secret_type', 'Unknown Secret Type')
            severity = secret.get('severity', 'HIGH')
            secret_display = secret.get('secret_display', '***REDACTED***')
            occurrences = secret.get('occurrences', 1)
            status = secret.get('status', 'open')
            secret_repo = secret.get('repo_name', repo_name)  # Secret-level repo or fallback to metadata

            # Create a finding for each location
            for location in secret.get('locations', []):
                finding = {
                    "rule_id": secret.get('secret_id', 'UNKNOWN')[:16],  # Use first 16 chars of hash
                    "description": f"{secret_type}",
                    "severity": severity,
                    "file_path": location.get('file', ''),
                    "line_number": location.get('line', 0),
                    "commit": None,
                    "author": None,
                    "date": data.get('scan_metadata', {}).get('scan_date', ''),
                    "match": secret_display,
                    "status": status,
                    "secret_type": secret_type,
                    "repo_name": secret_repo,
                    "occurrences": occurrences
                }
                findings.append(finding)
    else:
        # Standard Gitleaks format: list of findings at root or under 'findings' key
        raw_findings = data if isinstance(data, list) else data.get('findings', [])

        for leak in raw_findings:
            finding = {
                "rule_id": leak.get('RuleID', 'UNKNOWN'),
                "description": leak.get('Description', 'Secret detected'),
                "severity": "HIGH",  # All secrets treated as HIGH by default
                "file_path": leak.get('File', ''),
                "line_number": leak.get('StartLine', 0),
                "commit": leak.get('Commit', '')[:8] if leak.get('Commit') else None,
                "author": leak.get('Author', ''),
                "date": leak.get('Date', ''),
                "match": redact_secret(leak.get('Secret', ''))
            }
            findings.append(finding)

    return findings

def parse_trivy(data: Dict) -> List[Dict]:
    """Parse Trivy IaC scan JSON output into standardized findings"""
    findings = []
    
    # Trivy format: data['Results'][0]['Misconfigurations']
    results = data.get('Results', [])
    
    for result in results:
        target = result.get('Target', '')
        misconfigs = result.get('Misconfigurations', [])
        
        for misconfig in misconfigs:
            finding = {
                "check_id": misconfig.get('ID', 'UNKNOWN'),
                "check_name": misconfig.get('Title', 'Unknown Issue'),
                "severity": misconfig.get('Severity', 'MEDIUM').upper(),
                "resource_type": misconfig.get('Type', 'unknown'),
                "resource_name": misconfig.get('PrimaryURL', ''),
                "file_path": target,
                "line_range": [misconfig.get('CauseMetadata', {}).get('StartLine', 0),
                              misconfig.get('CauseMetadata', {}).get('EndLine', 0)],
                "description": misconfig.get('Description', ''),
                "remediation": misconfig.get('Resolution', ''),
                "references": misconfig.get('References', [])
            }
            findings.append(finding)
    
    return findings

def map_checkov_severity(severity: str) -> str:
    """Map Checkov severity to standardized levels"""
    severity_map = {
        'CRITICAL': 'CRITICAL',
        'HIGH': 'HIGH',
        'MEDIUM': 'MEDIUM',
        'LOW': 'LOW',
        'INFO': 'INFO'
    }
    return severity_map.get(severity.upper(), 'MEDIUM')

def redact_secret(secret: str) -> str:
    """Redact secret for display (show only first/last chars)"""
    if not secret or len(secret) < 8:
        return "***REDACTED***"
    return f"{secret[:4]}...{secret[-4:]}"
