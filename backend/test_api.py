#!/usr/bin/env python3
"""
Quick test script to verify API endpoints
Run this after starting the backend: uvicorn main:app --reload
"""

import requests
import json
from pathlib import Path

API_BASE = "http://localhost:8000/api"

def test_root():
    """Test root endpoint"""
    response = requests.get("http://localhost:8000/")
    print(f"✓ Root endpoint: {response.json()}")

def test_upload_sample_files():
    """Upload sample scan files"""
    sample_dir = Path(__file__).parent.parent / "sample-scans"
    
    # Upload Checkov results
    with open(sample_dir / "checkov_results.json", "rb") as f:
        response = requests.post(f"{API_BASE}/upload/checkov", files={"file": f})
        print(f"✓ Checkov upload: {response.json()}")
    
    # Upload Gitleaks results
    with open(sample_dir / "gitleaks_results.json", "rb") as f:
        response = requests.post(f"{API_BASE}/upload/gitleaks", files={"file": f})
        print(f"✓ Gitleaks upload: {response.json()}")
    
    # Upload Trivy results
    with open(sample_dir / "trivy_results.json", "rb") as f:
        response = requests.post(f"{API_BASE}/upload/trivy", files={"file": f})
        print(f"✓ Trivy upload: {response.json()}")

def test_get_findings():
    """Get all findings"""
    response = requests.get(f"{API_BASE}/findings/cloud")
    print(f"✓ Cloud findings: {len(response.json())} items")
    
    response = requests.get(f"{API_BASE}/findings/secrets")
    print(f"✓ Secret findings: {len(response.json())} items")
    
    response = requests.get(f"{API_BASE}/findings/iac")
    print(f"✓ IaC findings: {len(response.json())} items")

def test_summary():
    """Get summary statistics"""
    response = requests.get(f"{API_BASE}/stats/summary")
    summary = response.json()
    print(f"✓ Summary: {json.dumps(summary, indent=2)}")

def main():
    print("🧪 Testing DevSecOps Dashboard API\n")
    
    try:
        test_root()
        test_upload_sample_files()
        test_get_findings()
        test_summary()
        print("\n✅ All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print("Make sure the backend is running: uvicorn main:app --reload")

if __name__ == "__main__":
    main()
