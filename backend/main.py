from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json
from pathlib import Path

from models import CloudFinding, SecretFinding, IaCFinding
from parsers import parse_checkov, parse_gitleaks, parse_trivy
from auth import get_current_user

app = FastAPI(title="DevSecOps Security Dashboard API")

# CORS for local React dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (Phase 1 - replace with DB in Phase 2)
findings_store = {
    "cloud": [],
    "secrets": [],
    "iac": []
}

@app.get("/")
def root():
    return {"status": "DevSecOps Dashboard API", "version": "0.1.0"}

@app.get("/api/findings/cloud")
def get_cloud_findings(user: Dict = Depends(get_current_user)) -> List[Dict]:
    """Get all cloud security findings (requires authentication)"""
    return findings_store["cloud"]

@app.get("/api/findings/secrets")
def get_secret_findings(user: Dict = Depends(get_current_user)) -> List[Dict]:
    """Get all secrets detected in code (requires authentication)"""
    return findings_store["secrets"]

@app.get("/api/findings/iac")
def get_iac_findings(user: Dict = Depends(get_current_user)) -> List[Dict]:
    """Get all IaC security findings (requires authentication)"""
    return findings_store["iac"]

@app.post("/api/upload/checkov")
async def upload_checkov(
    file: UploadFile = File(...),
    user: Dict = Depends(get_current_user)
):
    """Upload and parse Checkov scan results (requires authentication)"""
    content = await file.read()
    data = json.loads(content)
    parsed = parse_checkov(data)
    findings_store["cloud"].extend(parsed)
    return {"message": f"Processed {len(parsed)} cloud findings"}

@app.post("/api/upload/gitleaks")
async def upload_gitleaks(
    file: UploadFile = File(...),
    user: Dict = Depends(get_current_user)
):
    """Upload and parse Gitleaks scan results (requires authentication)"""
    content = await file.read()
    data = json.loads(content)
    parsed = parse_gitleaks(data)
    findings_store["secrets"].extend(parsed)
    return {"message": f"Processed {len(parsed)} secret findings"}

@app.post("/api/upload/trivy")
async def upload_trivy(
    file: UploadFile = File(...),
    user: Dict = Depends(get_current_user)
):
    """Upload and parse Trivy IaC scan results (requires authentication)"""
    content = await file.read()
    data = json.loads(content)
    parsed = parse_trivy(data)
    findings_store["iac"].extend(parsed)
    return {"message": f"Processed {len(parsed)} IaC findings"}

@app.get("/api/stats/summary")
def get_summary(user: Dict = Depends(get_current_user)):
    """Get summary statistics across all findings (requires authentication)"""
    return {
        "total_cloud_findings": len(findings_store["cloud"]),
        "total_secrets": len(findings_store["secrets"]),
        "total_iac_findings": len(findings_store["iac"]),
        "severity_breakdown": calculate_severity_breakdown()
    }

def calculate_severity_breakdown():
    """Calculate severity counts across all findings"""
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    
    for finding_list in findings_store.values():
        for finding in finding_list:
            severity = finding.get("severity", "INFO").upper()
            if severity in severity_counts:
                severity_counts[severity] += 1
    
    return severity_counts

@app.delete("/api/findings/clear")
def clear_all_findings(user: Dict = Depends(get_current_user)):
    """Clear all findings (requires authentication)"""
    for key in findings_store:
        findings_store[key] = []
    return {"message": "All findings cleared"}

@app.put("/api/findings/secrets/{index}")
def update_secret_finding(
    index: int,
    update_data: Dict,
    user: Dict = Depends(get_current_user)
):
    """Update a specific secret finding by index (requires authentication)"""
    if index < 0 or index >= len(findings_store["secrets"]):
        return {"error": "Finding not found"}, 404

    # Update allowed fields
    allowed_fields = ["status", "notes"]
    for field in allowed_fields:
        if field in update_data:
            findings_store["secrets"][index][field] = update_data[field]

    return {"message": "Finding updated", "finding": findings_store["secrets"][index]}

@app.put("/api/findings/cloud/{index}")
def update_cloud_finding(
    index: int,
    update_data: Dict,
    user: Dict = Depends(get_current_user)
):
    """Update a specific cloud finding by index (requires authentication)"""
    if index < 0 or index >= len(findings_store["cloud"]):
        return {"error": "Finding not found"}, 404

    # Update allowed fields
    allowed_fields = ["status", "notes"]
    for field in allowed_fields:
        if field in update_data:
            findings_store["cloud"][index][field] = update_data[field]

    return {"message": "Finding updated", "finding": findings_store["cloud"][index]}

@app.put("/api/findings/iac/{index}")
def update_iac_finding(
    index: int,
    update_data: Dict,
    user: Dict = Depends(get_current_user)
):
    """Update a specific IaC finding by index (requires authentication)"""
    if index < 0 or index >= len(findings_store["iac"]):
        return {"error": "Finding not found"}, 404

    # Update allowed fields
    allowed_fields = ["status", "notes"]
    for field in allowed_fields:
        if field in update_data:
            findings_store["iac"][index][field] = update_data[field]

    return {"message": "Finding updated", "finding": findings_store["iac"][index]}
