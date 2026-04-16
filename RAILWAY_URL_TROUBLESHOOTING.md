# 🔧 TROUBLESHOOTING: Finding the Correct Railway Backend URL

## ❌ Current Problem
- Frontend shows: `net::ERR_NAME_NOT_RESOLVED`
- URL being used: `tsunami-alert-backend-production.up.railway.app`
- Status: **This URL doesn't exist or hasn't been registered yet**

## ✅ HOW TO FIND THE CORRECT RAILWAY URL

### Step 1: Go to Railway Dashboard
1. Open: https://railway.app/dashboard
2. Click on your project: **zesty-recreation**
3. Click on service: **tsunami-alert-backend**

### Step 2: Find the Public URL
In the service page, look for the **Networking** section. You should see:

**Option A: Public URL Section**
- Look for a URL that says "Public URL" or "Deployment URL"
- It will look like: `https://tsunami-alert-backend-xxxxxx.up.railway.app` (with a random hash)
- Copy this exact URL

**Option B: Service Details**
- Click on the service name at the top
- Look for "Networking" or "Public URL" tab
- The URL should be listed there

**Option C: From Service Settings**
- Click the settings icon on the service
- You should see domain/networking settings
- The public URL will be listed there

### Step 3: Recommended URL Format
Railway URLs typically look like ONE of these:

```
https://servicename-xxxxxx.up.railway.app        (auto-generated with hash)
https://tsunami-alert-backend-abc123.up.railway.app   (actual example)
https://custom-domain.example.com                (if using custom domain)
```

The URL you're currently using (`tsunami-alert-backend-production.up.railway.app`) doesn't match Railway's standard format.

## 🔍 WHAT YOU MIGHT SEE

**If the service has NO public URL:**
- The service might not have "Public Networking" enabled
- Solution: Click the service → Settings → Enable "Public Networking"

**If you see a hash-based URL:**
- Example: `tsunami-alert-backend-a1b2c3d.up.railway.app`
- This is the CORRECT format - use this!

**If you see "Not available" or blank:**
- The service isn't properly deployed
- Check the Deployment logs for errors
- The backend might have crashed during startup

## 🛠️ COMMON RAILWAY URL PATTERNS

### Standard (Auto-generated)
```
https://tsunami-alert-backend-a1b2c3d.up.railway.app/graphql
wss://tsunami-alert-backend-a1b2c3d.up.railway.app/graphql  (websocket)
```

### Custom Domain
```
https://api.myapp.com/graphql
wss://api.myapp.com/graphql
```

### Railway Preview Deployments
```
https://tsunami-alert-backend-pr-123-abc.up.railway.app/graphql
```

## ⚡ QUICK ACTION ITEMS

1. **Screenshot the Railway dashboard** showing:
   - Service name: tsunami-alert-backend
   - Status (should be "Online")
   - Public URL (copy the exact URL)

2. **Once you have the correct URL**, update:
   ```
   NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://[CORRECT-URL]/graphql
   NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=wss://[CORRECT-URL]/graphql
   ```

3. **Set in two places:**
   - Vercel → Settings → Environment Variables
   - Local `.env` file for testing

4. **Redeploy:**
   - Vercel: Go to Deployments → Redeploy latest
   - Test: Try login again

## 🧪 TEST THE URL

Once you have the correct URL, test it:

```bash
# Replace with actual URL
curl -s https://YOUR-ACTUAL-URL/health
# Should return: {"status":"ok","timestamp":"..."}

curl -s https://YOUR-ACTUAL-URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'
# Should return: {"data":{"__typename":"Query"}}
```

## 📋 CHECKLIST

- [ ] Found actual Railway public URL in dashboard
- [ ] URL follows Railway format (has hash or is custom domain)
- [ ] URL starts with `https://` (not http://)
- [ ] URL responds to health check
- [ ] Updated Vercel environment variables with correct URL
- [ ] Vercel project redeployed
- [ ] Frontend login attempt now works
