# 🚢 Deployment Guide: WhatsApp Chat Analyzer AI

This guide contains the exact steps and configurations required to deploy the "WhatsApp Chat Analyzer AI" to production (Railway for Backend, Render for Frontend).

## 1. Backend (Railway)

### 🌍 Environment Variables
Ensure these are set in the Railway Dashboard:
- `PORT`: `5000` (or leave it to auto-assign)
- `NODE_ENV`: `production`
- `MONGO_URI`: Your MongoDB Atlas or Railway MongoDB connection string.
- `TZ`: `Asia/Kolkata` (optional, for IST timestamps)

### 📦 Puppeteer Dependencies (CRITICAL)
`whatsapp-web.js` requires Chromium. Since Railway uses Nixpacks by default, ensure your server can run headless Chrome.
Add a `nixpacks.toml` file in the root if you experience "Could not find browser" errors:
```toml
[phases.setup]
nixPkgs = ["...", "chromium", "nss", "freetype", "harfbuzz", "ca-certificates", "libnss3"]
```

## 2. Frontend (Render)

### 🌍 Environment Variables
Ensure these are set in the Render Dashboard:
- `REACT_APP_API_URL`: `https://your-backend-url.up.railway.app` (The URL provided by Railway).
- `NODE_ENV`: `production`

### 🏗️ Build Settings
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/build`

## 🛡️ Troubleshooting CORS

If you see "Blocked by CORS Policy":
1.  **Check `server.js`**: Verify that `corsOptions.origin` is set to `true` (dynamic reflection) or explicitly mentions your Render URL.
2.  **Verify Headers**: Use Browser DevTools (Network tab) to ensure `Access-Control-Allow-Origin` is present in the response from Railway.
3.  **App Start**: If the backend crashes (e.g., due to Mongo connection or Puppeteer), Railway may return a default error page without CORS headers. Check your Railway logs to ensure the server is fully started.

---

### ✅ Deployment Checklist
- [ ] Backend is running on Railway and connected to a remote MongoDB.
- [ ] Frontend `REACT_APP_API_URL` environment variable points to the Railway URL.
- [ ] `LocalAuth` on Railway: Note that files on Railway are ephemeral unless you use a persistent volume. If the session logs out, you will need to re-scan the QR code.
