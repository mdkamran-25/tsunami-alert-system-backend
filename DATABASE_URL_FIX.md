# 🚨 URGENT FIX: Backend Not Responding (DATABASE_URL Issue)

## Root Cause
The backend service is crashing on startup because **DATABASE_URL is not set** in Railway environment variables.

The startup process:
1. Container starts
2. Tries to run `npx prisma migrate deploy`
3. Needs DATABASE_URL to connect to database
4. If DATABASE_URL is missing → migrations fail → service crashes
5. URL appears to exist but doesn't respond

## ⚡ IMMEDIATE FIX (5 minutes)

### Step 1: Get Database Connection String
1. Go to: https://railway.app/dashboard
2. Click your project: **zesty-recreation**
3. Click service: **tsunami-db** (PostgreSQL)
4. Go to **"Connect"** tab
5. Look for **"Postgres URI"** or **"DATABASE_URL"**
6. Copy the full connection string (looks like: `postgresql://user:pass@host:5432/dbname`)

### Step 2: Set DATABASE_URL in Backend Service
1. Still in Railway dashboard
2. Click service: **tsunami-alert-backend**
3. Click **"Variables"** tab
4. Click **"New Variable"**
5. Key: `DATABASE_URL`
6. Value: (paste the Postgres URI from Step 1)
7. Click **"Save"**

### Step 3: Trigger Redeploy
1. Go to **"Deployments"** tab (on backend service)
2. Click the three dots (...) on latest deployment
3. Select **"Redeploy"**
4. Wait 2-3 minutes for deployment and migrations

### Step 4: Verify It's Running
```bash
# Test health endpoint
curl https://tsunami-alert-backend-production.up.railway.app/health

# Test GraphQL endpoint
curl https://tsunami-alert-backend-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'
```

Should return:
```json
{"status":"ok","timestamp":"2026-04-17T..."}
```

## ✅ After Service is Running

Once DATABASE_URL is set and service redeploys successfully:

1. **Frontend will automatically connect** (already has correct URL)
2. **Test login** at: https://tsunami-alert-system10.vercel.app/auth/signin
3. **Check browser Network tab** for successful GraphQL requests

## 🔧 Other Environment Variables Needed

While you're setting DATABASE_URL, also check these in Railway:

- `NODE_ENV=production`
- `JWT_SECRET=` (should be auto-generated or set manually)
- `PORT=4000`
- `CORS_ORIGIN=https://tsunami-alert-system10.vercel.app`
- `EMAIL_SERVICE=gmail` (or configure email settings)

## 📋 Verification Checklist

After setting DATABASE_URL and redeploying:

- [ ] Backend service is **Online** in Railway
- [ ] `curl /health` returns `{"status":"ok"}`
- [ ] `curl /graphql` returns GraphQL query response
- [ ] Frontend can connect without DNS errors
- [ ] Login works and submits to backend
- [ ] No CORS errors in browser console

---

**Time to fix: ~5 minutes**
**Redeploy time: ~2-3 minutes**
**Total: ~8-10 minutes**
