# 🚀 Bynix Web App Deployment Guide

## Overview

This guide will help you deploy Bynix trading app with:
- **Frontend (Expo Web)** → Vercel → bynix.io
- **Backend (FastAPI)** → Railway → api.bynix.io
- **Database (MongoDB)** → MongoDB Atlas (FREE)

---

## Step 1: Setup MongoDB Atlas (FREE Database)

1. Go to https://www.mongodb.com/atlas
2. Create FREE account
3. Create a FREE cluster (M0 Sandbox)
4. Click "Connect" → "Connect your application"
5. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/bynix_db
   ```
6. Save this - you'll need it for Railway!

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (recommended)

### 2.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Create a new repo and push the `/backend` folder

### 2.3 Push Backend Code to GitHub
```bash
# In your local machine, create a new folder
mkdir bynix-backend
cd bynix-backend

# Copy backend files (server.py, requirements.txt, etc.)
# Then:
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/bynix-backend.git
git push -u origin main
```

### 2.4 Configure Railway
1. Select your repo in Railway
2. Go to "Variables" tab
3. Add these environment variables:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/bynix_db
   EMERGENT_LLM_KEY=sk-emergent-d5d3726CeDd4355C5C
   NOWPAYMENTS_API_KEY=GG4A62A-CEKMA82-N8BJZSD-PHCYF1J
   SMTP_EMAIL=noreplay@bynix.io
   SMTP_PASSWORD=$88442211$aA
   PORT=8001
   ```

### 2.5 Add Custom Domain
1. Go to "Settings" → "Domains"
2. Click "Add Custom Domain"
3. Enter: `api.bynix.io`
4. Add the CNAME record to Namecheap:
   - Type: CNAME
   - Host: api
   - Value: (Railway will provide this)

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub

### 3.2 Push Frontend Code to GitHub
```bash
mkdir bynix-frontend
cd bynix-frontend

# Copy frontend files
git init
git add .
git commit -m "Initial frontend"
git remote add origin https://github.com/YOUR_USERNAME/bynix-frontend.git
git push -u origin main
```

### 3.3 Import to Vercel
1. Click "Add New Project"
2. Import your GitHub repo
3. Configure:
   - Framework Preset: Other
   - Build Command: `npx expo export -p web`
   - Output Directory: `dist`

### 3.4 Add Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```
EXPO_PUBLIC_BACKEND_URL=https://api.bynix.io
```

### 3.5 Add Custom Domain
1. Go to "Settings" → "Domains"
2. Add: `bynix.io`
3. Add: `www.bynix.io`
4. Follow DNS instructions for Namecheap

---

## Step 4: Namecheap DNS Configuration

Go to Namecheap → Domain → Advanced DNS:

### For bynix.io (Vercel):
| Type | Host | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

### For api.bynix.io (Railway):
| Type | Host | Value |
|------|------|-------|
| CNAME | api | (Railway provides this) |

---

## Step 5: Test Your Deployment

1. **Backend:** https://api.bynix.io/api/health
2. **Frontend:** https://bynix.io

---

## Environment Variables Summary

### Backend (Railway):
```
MONGO_URL=mongodb+srv://...
EMERGENT_LLM_KEY=sk-emergent-d5d3726CeDd4355C5C
NOWPAYMENTS_API_KEY=GG4A62A-CEKMA82-N8BJZSD-PHCYF1J
SMTP_EMAIL=noreplay@bynix.io
SMTP_PASSWORD=$88442211$aA
```

### Frontend (Vercel):
```
EXPO_PUBLIC_BACKEND_URL=https://api.bynix.io
```

---

## Troubleshooting

### CORS Errors
Backend already has CORS configured for all origins.

### DNS Not Working
- Wait 24-48 hours for propagation
- Clear browser cache
- Try incognito mode

### Build Failures
- Check Vercel/Railway logs
- Ensure all dependencies are in package.json/requirements.txt

---

## Support

Need help? Contact:
- Emergent Discord: https://discord.gg/VzKfwCXC4A
- Email: support@emergent.sh
