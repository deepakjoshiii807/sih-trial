# Deploy SkillBridge to Render (Free Tier)

## Prerequisites

- GitHub account with the `sih-trial` repo
- Firebase project (`learntoleadd`) with web app configured
- [Render](https://render.com) account (free)

---

## Step 1: Push the render.yaml to GitHub

The `render.yaml` blueprint is already in the repo root. Make sure it's pushed:

```bash
git add render.yaml
git commit -m "Add Render deployment blueprint"
git push
```

---

## Step 2: Create a Render account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Free tier gives you: **750 hrs/mo** for web services + **90-day free PostgreSQL**

---

## Step 3: Deploy via Blueprint

1. On Render Dashboard, click **New +** → **Blueprint**
2. Connect your GitHub repo (`deepakjoshiii807/sih-trial`)
3. Render detects `render.yaml` and shows the services it will create:
   - `skillbridge-api` (Django web service)
   - `skillbridge-db` (PostgreSQL database)
4. Click **Apply** — Render provisions everything automatically

**First deploy takes ~5-8 minutes** (building Docker image + running migrations + seeding data).

---

## Step 4: Verify the deploy

Once the service shows **Live**:

```bash
# Health check
curl https://skillbridge-api.onrender.com/api/health
# Expected: {"status":"ok","database":"ok"}

# Admin panel
open https://skillbridge-api.onrender.com/admin/
```

---

## Step 5: Update CORS for your frontend

In Render Dashboard → `skillbridge-api` → **Environment** → edit:

```
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
```

Or keep `CORS_ALLOW_ALL_ORIGINS=True` for development.

---

## Step 6: Update the frontend to point at Render

In your frontend's environment (Freebuff or local `.env.local`):

```
VITE_API_URL=https://skillbridge-api.onrender.com/api
```

Or for same-origin deploys (frontend served by Render too):

```
VITE_API_URL=/api
```

---

## Step 7: Firebase authorized domains

In [Firebase Console](https://console.firebase.google.com) → Authentication → Settings → **Authorized domains**, add:

```
skillbridge-api.onrender.com
your-frontend-domain.com
localhost
```

---

## Environment Variables Reference

| Variable | Value | Notes |
|---|---|---|
| `SECRET_KEY` | Auto-generated | Render creates this automatically |
| `DEBUG` | `False` | Production mode |
| `DATABASE_URL` | Auto-linked | Render connects to `skillbridge-db` |
| `DJANGO_ALLOWED_HOSTS` | `skillbridge-api.onrender.com` | Add your custom domain if any |
| `CORS_ALLOW_ALL_ORIGINS` | `True` | Set to `False` + explicit origins in prod |
| `SEED_DEMO` | `1` → `0` | Set to `1` on first deploy, `0` after |
| `DEMO_PASSWORD` | `DemoPass@123` | Change for production |
| `FIREBASE_PROJECT_ID` | `learntoleadd` | Your Firebase project |
| `WEB_CONCURRENCY` | `2` | Gunicorn workers |
| `WEB_THREADS` | `2` | Gunicorn threads per worker |

---

## Free Tier Limits

- **750 hrs/mo** web service (spins down after 15 min of inactivity)
- **First request after spin-down takes ~30-60s** (cold start)
- **90-day PostgreSQL** (renewable — create a new one before expiry)
- **No custom domain** on free tier (uses `*.onrender.com`)

---

## Updating After Code Changes

Render auto-deploys on every push to `main`. Just:

```bash
git add .
git commit -m "Your change"
git push
```

Render rebuilds and redeploys automatically.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Service won't start | Check **Logs** tab in Render dashboard |
| Database connection error | Ensure `DATABASE_URL` is linked from the `skillbridge-db` service |
| CORS error from frontend | Add frontend domain to `CORS_ALLOWED_ORIGINS` |
| Migrations not run | The entrypoint runs `migrate` automatically on boot |
| Cold start too slow | Free tier spins down — first request is slow, subsequent requests are fast |

---

## Alternative: Manual Deploy (without render.yaml)

If you prefer not to use the blueprint:

1. **New Web Service** → Docker → paste repo URL
2. Set **Dockerfile path**: `backend/Dockerfile`
3. Set **Docker context**: `backend`
4. Add all env vars from the table above
5. Create a **PostgreSQL** database separately and link its `DATABASE_URL`
6. Deploy
