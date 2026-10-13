# FlowForge Deployment & Hosting Guide

This guide provides step-by-step instructions for deploying both the **FlowForge Frontend (Vite + React)** and **FlowForge Backend (Node.js + Express API)** on **Vercel** and alternative hosting providers (**Render**, **Railway**, **Supabase**).

---

## Architecture Overview

- **Frontend**: React 18, React Flow (`@xyflow/react`), Tailwind CSS, Vite.
- **Backend**: Node.js, Express, Supabase PostgreSQL, Row-Level Security, JWT Auth.
- **Database & Auth**: Supabase PostgreSQL cloud instance.

---

## Option 1: Full-Stack Monorepo Deployment on Vercel (Recommended)

FlowForge is pre-configured with a root [`vercel.json`](file:///f:/FSAD%20PRJ/vercel.json) and [`api/index.js`](file:///f:/FSAD%20PRJ/api/index.js) that routes `/api/*` to the Express backend as a Vercel Serverless Function and all other routes to the Vite static frontend.

### Step-by-Step Vercel Monorepo Deployment:

1. **Push your code to GitHub / GitLab / Bitbucket**:
   ```bash
   git add .
   git commit -m "feat: configure Vercel full-stack deployment"
   git push origin main
   ```

2. **Import Repository into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **Add New...** > **Project**.
   - Select your FlowForge Git repository.

3. **Configure Build Settings**:
   - **Framework Preset**: Other (handled by root `vercel.json`).
   - **Root Directory**: `./` (leave as root).

4. **Add Environment Variables**:
   In the Vercel dashboard project settings under **Environment Variables**, add:
   ```env
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=
   ```
   > **Note**: Leaving `VITE_API_URL` empty instructs the client to use relative `/api` paths on the exact same Vercel domain, avoiding all CORS issues!

5. **Deploy**:
   - Click **Deploy**. Vercel will build the frontend into static assets and deploy the backend as serverless functions.

---

## Option 2: Split Deployment (Vercel Frontend + Render / Railway Backend)

If you prefer running a continuous Express server (useful for persistent WebSocket connections or long polling) instead of serverless functions:

### Part A: Deploy Backend on Render / Railway

#### On Render (render.com):
1. Create a new **Web Service**.
2. Connect your Git repository.
3. Set **Root Directory** to `server`.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `node src/server.js`.
6. Add Environment Variables:
   ```env
   PORT=5000
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
7. Copy your deployed backend URL (e.g., `https://flowforge-api.onrender.com`).

#### On Railway (railway.app):
1. Create a new project > **Deploy from GitHub repo**.
2. Set root directory to `/server`.
3. Add the same environment variables above.
4. Copy the generated domain.

---

### Part B: Deploy Frontend on Vercel

1. In Vercel, create a new project and select the same repository.
2. Set **Root Directory** to `client`.
3. **Framework Preset**: Vite.
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Add Environment Variables:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=https://flowforge-api.onrender.com
   ```
   *(Replace with your actual backend URL from Part A).*
7. The included [`client/vercel.json`](file:///f:/FSAD%20PRJ/client/vercel.json) ensures Single Page Application (SPA) client-side routing works for all routes (`/workflows`, `/dashboard`, `/tasks`, etc.) without 404 errors on browser refresh!

---

## Local Development Links

When developing locally on your machine:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
