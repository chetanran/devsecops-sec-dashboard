#!/usr/bin/env python3
"""
Test script to verify the deduplicated secrets parser
"""
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from parsers import parse_gitleaks

def test_deduplicated_format():
    """Test parsing the deduplicated-secrets.json file"""

    # Load the deduplicated secrets file
    with open('deduplicated-secrets.json', 'r') as f:
        data = json.load(f)

    print("=" * 80)
    print("TESTING DEDUPLICATED SECRETS PARSER")
    print("=" * 80)

    print(f"\n[INPUT METADATA]")
    metadata = data.get('scan_metadata', {})
    print(f"  - Scan Date: {metadata.get('scan_date')}")
    print(f"  - Tool: {metadata.get('tool')}")
    print(f"  - Total Findings: {metadata.get('total_findings')}")
    print(f"  - Unique Secrets: {metadata.get('unique_secrets')}")

    # Parse the data
    findings = parse_gitleaks(data)

    print(f"\n[PARSED] {len(findings)} individual findings from {len(data['secrets'])} unique secrets")

    # Show sample findings
    print(f"\n[SAMPLE FINDINGS] (first 3):")
    for i, finding in enumerate(findings[:3], 1):
        print(f"\n  Finding {i}:")
        print(f"    Secret Type: {finding.get('secret_type', 'N/A')}")
        print(f"    Severity: {finding['severity']}")
        print(f"    Repository: {finding.get('repo_name', 'N/A')}")
        print(f"    File: {finding['file_path']}")
        print(f"    Line: {finding['line_number']}")
        print(f"    Redacted: {finding['match']}")
        print(f"    Occurrences: {finding.get('occurrences', 'N/A')}")
        print(f"    Status: {finding.get('status', 'N/A')}")

    # Show severity breakdown
    severity_counts = {}
    for finding in findings:
        severity = finding['severity']
        severity_counts[severity] = severity_counts.get(severity, 0) + 1

    print(f"\n[SEVERITY BREAKDOWN]")
    for severity, count in sorted(severity_counts.items()):
        print(f"  {severity}: {count}")

    # Show top secret types
    secret_types = {}
    for finding in findings:
        desc = finding['description'].split(' (appears')[0]
        secret_types[desc] = secret_types.get(desc, 0) + 1

    print(f"\n[TOP SECRET TYPES]")
    for secret_type, count in sorted(secret_types.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {secret_type}: {count} locations")

    print("\n" + "=" * 80)
    print("[SUCCESS] PARSER TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    try:
        test_deduplicated_format()
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
