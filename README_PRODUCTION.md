# ShelterX Production Deployment Guide

This guide provides end-to-end instructions for deploying **ShelterX**:
- **Backend API**: Hosted on [Render](https://render.com) (Node.js Express + MongoDB Atlas)
- **Frontend SPA**: Hosted on [Vercel](https://vercel.com) (React 19 + Vite + Tailwind CSS + Three.js)

---

## Architecture & Configuration Summary

| Component | Platform | Build Command | Start / Output | Environment Variables |
|---|---|---|---|---|
| **Backend** | Render (Web Service) | `npm install` | `npm start` | `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `TRUST_PROXY` |
| **Frontend** | Vercel | `npm run build` | `dist` | `VITE_API_URL` |
| **Database** | MongoDB Atlas | Managed Cloud | N/A | Included in `MONGO_URI` |

---

## Phase 0: Push Latest Code to GitHub

Make sure all latest configuration files (`render.yaml`, `vercel.json`, updated CORS and API base URL resolvers) are committed and pushed:

```bash
git add .
git commit -m "feat(deploy): add render and vercel deployment configurations"
git push origin main
```

Repository: `https://github.com/rishipatel83/ShelterX.git` (branch: `main`)

---

## Phase 1: Deploy Backend on Render

Deploy the backend first so you have your live API URL ready for the frontend.

### Option A: Standard Web Service Setup (Recommended)

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Under **Connect a Git repository**, choose your repository: `rishipatel83/ShelterX`.
4. Configure the service settings:
   - **Name**: `shelterx-backend` (or your choice)
   - **Region**: Oregon (US West) or Singapore / Frankfurt (choose closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Expand the **Environment Variables** section and add:

| Key | Recommended Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production security and optimizations |
| `PORT` | `5000` | Render will bind this automatically |
| `TRUST_PROXY` | `1` | Required for Render's reverse proxy & rate limiter |
| `MONGO_URI` | `mongodb://shelter:shelter@ac-pynzibz-shard-00-00.pco34y1.mongodb.net:27017,ac-pynzibz-shard-00-01.pco34y1.mongodb.net:27017,ac-pynzibz-shard-00-02.pco34y1.mongodb.net:27017/shelterX?ssl=true&replicaSet=atlas-j29qlk-shard-0&authSource=admin&appName=Cluster0` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `ca09b42712a1b904d7fe88922af91214717b629c81da96dd41acd13f42c4521b` | 64-character cryptographic token secret |
| `CORS_ORIGINS` | `*` | Or specify your Vercel URL once generated (e.g. `https://shelter-x.vercel.app`) |

6. Click **Create Web Service**.
7. Render will build and launch your backend. Once deployed, note down your Render URL:
   ```text
   https://shelterx-backend.onrender.com
   ```

### Verify Backend Health
Test in browser or via terminal:
```bash
curl https://shelterx-backend.onrender.com/api/v1/health
# Expected: {"success":true,"service":"ShelterX Backend","status":"ok",...}

curl https://shelterx-backend.onrender.com/api/v1/ready
# Expected: {"success":true,"status":"ready","database":"connected"}
```

---

## Phase 2: Deploy Frontend on Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository: `rishipatel83/ShelterX`.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: Click **Edit** and choose `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
5. Expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://shelterx-backend.onrender.com/api/v1` |

*(Replace `shelterx-backend.onrender.com` with your exact Render service domain).*

6. Click **Deploy**.
7. In ~60 seconds, Vercel will build the frontend and provide your production URL (e.g. `https://shelterx.vercel.app`).

---

## Phase 3: Final CORS Lockdown (Optional Best Practice)

Once you have your production Vercel URL:
1. Go back to [Render Dashboard](https://dashboard.render.com) > your service > **Environment**.
2. Update `CORS_ORIGINS`:
   ```text
   https://shelterx.vercel.app
   ```
   *(Note: The ShelterX backend is already pre-configured to automatically allow all `*.vercel.app` preview deployments and custom origins cleanly).*
3. Save changes — Render will automatically redeploy with zero downtime.

---

## Verification Checklist

- [ ] **Health Probe**: `https://<your-render-url>/api/v1/health` returns `200 OK`.
- [ ] **Database Connection**: `https://<your-render-url>/api/v1/ready` returns `database: "connected"`.
- [ ] **SPA Route Refresh**: Navigating to `https://<your-vercel-url>/auth` or `/dashboard` directly or pressing F5 does not throw a 404 (handled by `frontend/vercel.json`).
- [ ] **Authentication**: Registering a new user and logging in stores the JWT token and redirects to `/dashboard`.
- [ ] **Simulation Engine**: Changing habitat dimensions, climate location, or insulation material triggers thermal calculations and renders the 3D habitat.
- [ ] **Materials & Cost Estimator**: Verified materials list loads successfully from the backend database.

---

## Notes & Troubleshooting

### Render Free Tier Cold Starts
Render free web services enter sleep mode after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds while the container boots up. To keep it warm, you can optionally set up a free monitor (e.g., [UptimeRobot](https://uptimerobot.com)) hitting `https://<your-render-url>/api/v1/health` every 10 minutes.
