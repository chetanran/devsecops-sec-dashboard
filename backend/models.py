from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CloudFinding(BaseModel):
    """Cloud security misconfiguration finding"""
    check_id: str
    check_name: str
    severity: str
    resource: str
    file_path: str
    line_number: Optional[int] = None
    description: str
    remediation: Optional[str] = None
    scan_timestamp: Optional[str] = None

class SecretFinding(BaseModel):
    """Secret detected in code"""
    rule_id: str
    description: str
    severity: str
    file_path: str
    line_number: int
    commit: Optional[str] = None
    author: Optional[str] = None
    date: Optional[str] = None
    match: str  # Redacted secret match
    status: Optional[str] = None  # For deduplicated format (open/closed/mitigated)
    secret_type: Optional[str] = None  # Type of secret (API Key, Password, etc.)
    repo_name: Optional[str] = None  # Repository name
    occurrences: Optional[int] = None  # Number of times this secret appears

class IaCFinding(BaseModel):
    """Infrastructure as Code security finding"""
    check_id: str
    check_name: str
    severity: str
    resource_type: str
    resource_name: str
    file_path: str
    line_range: Optional[List[int]] = None
    description: str
    remediation: Optional[str] = None
    references: Optional[List[str]] = None

class SeveritySummary(BaseModel):
    """Severity breakdown summary"""
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0
