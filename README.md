# DevSecOps Security Dashboard



## 🎯 Project Overview

This dashboard consolidates security findings from multiple tools:
- **Cloud Security** - Checkov IaC scans
- **Secrets Detection** - Gitleaks scans
- **IaC Security** - Trivy scans

## 🏗️ Architecture

```
devsecops-dashboard/
├── backend/              # FastAPI REST API
│   ├── main.py          # API endpoints
│   ├── models.py        # Pydantic data models
│   ├── parsers.py       # Scan result parsers
│   └── requirements.txt
├── frontend/            # React UI
│   ├── src/
│   │   ├── App.js      # Main component
│   │   └── App.css     # Styling
│   └── package.json
└── sample-scans/       # Sample scan outputs
    ├── checkov_results.json
    ├── gitleaks_results.json
    └── trivy_results.json
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn
- Azure AD App Registration (for authentication)

### Azure AD Setup

1. **Create App Registration in Azure Portal:**
   - Go to Azure Portal > Azure Active Directory > App Registrations
   - Click "New registration"
   - Name: "DevSecOps Dashboard"
   - Supported account types: Choose based on your requirements
   - Redirect URI: Web - `http://localhost:3000` (for local dev)
   - Click "Register"

2. **Configure API Permissions:**
   - Go to "API permissions" > "Add a permission"
   - Microsoft Graph > Delegated permissions > User.Read
   - Click "Add permissions"

3. **Expose an API:**
   - Go to "Expose an API" > "Add a scope"
   - Set Application ID URI (accept default or customize)
   - Scope name: `access_as_user`
   - Who can consent: Admins and users
   - Add display name and description
   - Click "Add scope"

4. **Note your credentials:**
   - Copy the Application (client) ID
   - Copy the Directory (tenant) ID from Overview page

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env
# Edit .env and add your Azure AD Tenant ID and Client ID

uvicorn main:app --reload
```

Backend runs at: http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file from template
cp .env.example .env
# Edit .env and add your Azure AD Tenant ID, Client ID, and Redirect URI

npm start
```

Frontend runs at: http://localhost:3000

## 📊 Testing with Sample Data

Upload the sample scan files from `sample-scans/` directory:

1. Navigate to http://localhost:3000
2. Click on each tab (Cloud Security, Secrets, IaC Findings)
3. Upload corresponding JSON file
4. View parsed results in the dashboard

## 🔧 API Endpoints

All endpoints require Azure AD authentication with a valid Bearer token in the Authorization header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check (no auth required) |
| `/api/findings/cloud` | GET | Get cloud security findings |
| `/api/findings/secrets` | GET | Get secret findings |
| `/api/findings/iac` | GET | Get IaC findings |
| `/api/stats/summary` | GET | Get summary statistics |
| `/api/upload/checkov` | POST | Upload Checkov results |
| `/api/upload/gitleaks` | POST | Upload Gitleaks results |
| `/api/upload/trivy` | POST | Upload Trivy results |
| `/api/findings/cloud/{index}` | PUT | Update cloud finding status/notes |
| `/api/findings/secrets/{index}` | PUT | Update secret finding status/notes |
| `/api/findings/iac/{index}` | PUT | Update IaC finding status/notes |
| `/api/findings/clear` | DELETE | Clear all findings |

## ✨ Key Features

- [x] **Azure AD Authentication** - Secure access with Microsoft identity platform
- [x] **JWT Token Verification** - Backend validates tokens using Azure AD signing keys
- [x] **Session Storage** - Secure token storage in browser sessionStorage
- [x] **Deduplicated Secrets Support** - Groups duplicate secrets with expand/collapse
- [x] **Grouped View** - See unique secrets with occurrence counts
- [x] **Edit Functionality** - Update status (open/mitigated/closed) and add notes
- [x] **Color-Coded Status** - Visual feedback for secret remediation tracking
- [x] **Repository Name** - Track secrets across multiple repositories
- [x] **Flexible Views** - Toggle between grouped and flat display

## 📖 Documentation


- **`USAGE.md`** - End-user guide for using grouped view
- **`test_deduplicated_parser.py`** - Parser validation script

## 🔜 Phase 2 - CI/CD Integration

Next steps:
- Add Azure DevOps pipeline to run scans
- Push scan results to API automatically
- PostgreSQL for persistent storage
- Authentication (Azure AD)

## 🐳 Phase 3 - Containerization

- Dockerize backend and frontend
- Push to Azure Container Registry
- Deploy to AKS via ArgoCD

## 🔒 Security Considerations

- Secrets are automatically redacted in display
- No authentication in Phase 1 (local dev only)
- Never commit real scan results with sensitive data
- Use `.gitignore` for local scan outputs

## 🧪 Testing Security Scanners

Generate your own scan results:

```bash
# Checkov (IaC scanning)
checkov -d ./terraform --output json > checkov_results.json

# Gitleaks (Secret scanning)
gitleaks detect --source . --report-format json --report-path gitleaks_results.json

# Trivy (IaC scanning)
trivy config ./terraform --format json > trivy_results.json
```

## 📚 Learning Resources

- [Checkov Documentation](https://www.checkov.io/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Trivy Documentation](https://trivy.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## 🤝 Contributing

This is a personal learning project. Feel free to fork and adapt for your own learning!

## 📝 License

MIT
