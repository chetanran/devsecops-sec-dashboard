# 🚀 QUICKSTART GUIDE

Get the dashboard running in 5 minutes.

## Step 1: Backend Setup (Terminal 1)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Step 2: Test Backend (Optional)

Open a new terminal:

```bash
cd backend
source venv/bin/activate
python test_api.py
```

## Step 3: Frontend Setup (Terminal 2)

```bash
cd frontend
npm install
npm start
```

Browser opens automatically at http://localhost:3000

## Step 4: Load Sample Data

1. Click **"Cloud Security"** tab
2. Click **"Choose File"** and select `sample-scans/checkov_results.json`
3. See 4 cloud findings appear

4. Click **"Secrets"** tab
5. Upload `sample-scans/gitleaks_results.json`
6. See 4 secret findings

7. Click **"IaC Findings"** tab
8. Upload `sample-scans/trivy_results.json`
9. See 3 IaC findings

10. Click **"Overview"** tab
11. See severity distribution chart

## 🎉 Done!

You now have a working DevSecOps dashboard.

## Next Steps

- Modify `parsers.py` to handle different scan formats
- Add filtering by severity in the UI
- Generate your own scan results from real projects

## Troubleshooting

**Backend won't start:**
- Check Python version: `python --version` (need 3.9+)
- Try: `pip install --upgrade pip`

**Frontend won't start:**
- Check Node version: `node --version` (need 16+)
- Delete `node_modules/` and run `npm install` again

**CORS errors:**
- Ensure backend is running on port 8000
- Ensure frontend is running on port 3000
