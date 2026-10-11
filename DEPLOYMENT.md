# Deployment Guide: Vercel (Frontend) & Render (Backend)

This guide walks you through deploying the **ProjectGuide-AI** application with the frontend hosted on **Vercel** and the FastAPI backend hosted on **Render**.

---

## Architecture Overview

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│         Vercel (Frontend)       │  HTTPS    │         Render (Backend)        │
│   React 19 + Vite 8 SPA         │ ────────> │   FastAPI + Uvicorn + Python    │
│   https://<your-app>.vercel.app │           │   https://<your-api>.onrender.com│
└─────────────────────────────────┘           └─────────────────────────────────┘
                                                               │
                                                               ▼
                                              ┌─────────────────────────────────┐
                                              │    MongoDB Atlas Cluster        │
                                              │    & Groq LLM Cloud API         │
                                              └─────────────────────────────────┘
```

---

## Part 1: Deploy Backend on Render

Deploy the backend first so you have your live backend URL ready for the frontend.

### Step 1.1: Push Your Code to GitHub
Ensure all your latest code is committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure Vercel and Render deployment"
git push origin main
```

### Step 1.2: Create a Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `projectguide-ai-backend` (or your preferred name)
   - **Region:** Choose a region close to your users (e.g., *Oregon (US West)* or *Frankfurt (EU)*)
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`

*(Alternatively, if you use Render Blueprints, Render will automatically detect `render.yaml` in your root repo).*

### Step 1.3: Set Backend Environment Variables
In the Render dashboard under **Environment**, add the following environment variables:

| Variable Name | Value | Required | Description |
|---|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | Yes | Specifies Python 3.11 runtime |
| `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority` | Yes | Your MongoDB Atlas connection string |
| `DB_NAME` | `ProjectGuide-AI` | Yes | Database name |
| `GROQ_API_KEY` | `gsk_your_groq_api_key_here` | Yes | Groq API Key for CrewAI agents |
| `GROQ_MODEL` | `groq/llama-3.3-70b-versatile` | Optional | Default LLM model |

> **MongoDB Atlas Network Access Tip:**  
> In MongoDB Atlas, go to **Network Access** → **IP Access List** and ensure `0.0.0.0/0` (Allow access from anywhere) is enabled so Render's cloud servers can connect.

### Step 1.4: Deploy & Verify
1. Click **Deploy Web Service**.
2. Wait for the build and startup logs to complete.
3. Once live, open your Render service URL in a browser:
   `https://<your-service-name>.onrender.com/health`
4. You should receive:
   ```json
   {
     "status": "backend running",
     "database": "MongoDB",
     "db_name": "ProjectGuide-AI"
   }
   ```
5. **Copy your Render URL** (e.g., `https://projectguide-ai-backend.onrender.com`). You will need this for Vercel.

---

## Part 2: Deploy Frontend on Vercel

### Step 2.1: Import Project in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** → **Project**.
2. Select your GitHub repository.

### Step 2.2: Configure Project Settings
In the configuration screen before clicking Deploy:
- **Project Name:** `projectguide-ai` (or your choice)
- **Framework Preset:** `Vite` (Vercel automatically detects this)
- **Root Directory:** Click **Edit** next to Root Directory and set it to:
  `frontend`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `dist` (default)
- **Install Command:** `npm install` (default)

### Step 2.3: Configure Frontend Environment Variables
Expand the **Environment Variables** section and add:

| Key | Value | Example |
|---|---|---|
| `VITE_API_BASE` | Your Render Backend URL | `https://projectguide-ai-backend.onrender.com` |

*(Note: `frontend/src/utils/api.js` also supports `VITE_API_URL` or `VITE_BACKEND_URL` automatically).*

### Step 2.4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will install dependencies and compile the bundle in ~15-30 seconds.
3. Once finished, visit your live Vercel URL (e.g., `https://projectguide-ai.vercel.app`).
4. Test key features:
   - Instant Demo logins (Arjun Sharma / Prof. Verma).
   - Feasibility check run.
   - Page refresh on `/dashboard` or `/profile` (handled by `frontend/vercel.json` SPA rewrites).

---

## Part 3: Troubleshooting Checklist

| Issue | Cause | Solution |
|---|---|---|
| **CORS error in browser console** | Backend rejecting frontend origin | In `backend/main.py`, `CORSMiddleware` is already set to `allow_origins=["*"]`. Ensure your backend on Render is using the latest commit. |
| **API calls fail with 404 on Vercel** | `VITE_API_BASE` is missing in Vercel | Add `VITE_API_BASE=https://<your-backend>.onrender.com` in Vercel Project Settings → Environment Variables, then click **Redeploy**. |
| **404 on Page Refresh on Vercel** | Missing SPA rewrite rule | Verified: `frontend/vercel.json` contains `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]`. Ensure Root Directory in Vercel is set to `frontend`. |
| **Render Free Tier Cold Start** | Render spins down free web services after 15 mins of inactivity | The first request after sleep may take ~30–50 seconds to wake up. This is standard behavior on Render's free tier. |
| **MongoDB Atlas Connection Error** | IP Whitelist blocking Render | Add `0.0.0.0/0` in MongoDB Atlas → **Network Access** → **IP Access List**. |
