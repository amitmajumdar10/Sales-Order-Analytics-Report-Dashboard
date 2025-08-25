# 🚀 Deployment Guide - Sales Order Report & Dashboard

This guide will help you deploy your full-stack application online for **FREE** using various platforms.

## 📋 Prerequisites

1. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket
2. **Environment Variables**: Prepare your API credentials
3. **Account Setup**: Create accounts on deployment platforms

---

## 🎯 **Option 1: Render.com (Recommended)**

### Why Render?
- ✅ **Free Tier**: 750 hours/month (24/7 hosting)
- ✅ **Full-Stack Support**: Frontend + Backend in one place
- ✅ **Auto-Deploy**: Connects to your Git repository
- ✅ **Custom Domains**: Free SSL certificates
- ✅ **Environment Variables**: Secure credential management

### Step-by-Step Deployment:

#### 1. **Prepare Your Repository**
```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 2. **Sign Up & Connect Repository**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub/GitLab/Bitbucket
3. Click "New +" → "Blueprint"
4. Connect your `sales-dashboard` repository
5. Render will automatically detect the `render.yaml` file

#### 3. **Configure Environment Variables**
In the Render dashboard, add these environment variables for your backend service:

**For Development Environment:**
- `API_BASE_URL_DEV`: Your development API base URL
- `CLIENT_ID_DEV`: Your development client ID  
- `AUTH_HEADER_DEV`: Your development authorization header

**For Production Environment:**
- `API_BASE_URL_PRD`: Your production API base URL
- `CLIENT_ID_PRD`: Your production client ID
- `AUTH_HEADER_PRD`: Your production authorization header

#### 4. **Deploy**
1. Click "Apply" to start deployment
2. Wait for both services to build and deploy (5-10 minutes)
3. Your app will be available at: `https://your-app-name.onrender.com`

---

## 🎯 **Option 2: Railway.app**

### Features:
- ✅ **$5 Free Credit Monthly**
- ✅ **Easy Git Integration**
- ✅ **Automatic HTTPS**

### Deployment Steps:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Node.js and deploys both frontend and backend

---

## 🎯 **Option 3: Vercel + Railway (Hybrid)**

### Setup:
- **Frontend**: Deploy to Vercel (free static hosting)
- **Backend**: Deploy to Railway (free API hosting)

#### Frontend on Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set build command: `cd frontend && npm run build`
4. Set output directory: `frontend/build`
5. Add environment variable: `REACT_APP_API_URL` (your Railway backend URL)

#### Backend on Railway:
1. Deploy backend separately on Railway
2. Use the Railway URL in your Vercel frontend

---

## 🎯 **Option 4: Netlify + Heroku**

### Setup:
- **Frontend**: Netlify (free static hosting)
- **Backend**: Heroku (free dyno - sleeps after 30 min inactivity)

#### Frontend on Netlify:
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your `frontend/build` folder
3. Or connect to Git for auto-deploy

#### Backend on Heroku:
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Deploy: `git subtree push --prefix backend heroku main`

---

## 🔧 **Manual Deployment Configuration**

If you prefer manual setup instead of using `render.yaml`:

### Backend Service Configuration:
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Environment**: Node.js
- **Port**: Use environment variable `PORT`

### Frontend Service Configuration:
- **Build Command**: `cd frontend && npm install && npm run build`
- **Publish Directory**: `frontend/build`
- **Environment**: Static Site

---

## 🌍 **Environment Variables Setup**

### Required Variables:
```env
# Development Environment
API_BASE_URL_DEV=your_dev_api_url
CLIENT_ID_DEV=your_dev_client_id
AUTH_HEADER_DEV=your_dev_auth_header

# Production Environment  
API_BASE_URL_PRD=your_prod_api_url
CLIENT_ID_PRD=your_prod_client_id
AUTH_HEADER_PRD=your_prod_auth_header

# System Variables (auto-set by platforms)
PORT=10000
NODE_ENV=production
REACT_APP_API_URL=https://your-backend-url.com
```

---

## 🚨 **Troubleshooting**

### Common Issues:

1. **CORS Errors**: Make sure your backend allows requests from your frontend domain
2. **Environment Variables**: Double-check all API credentials are correctly set
3. **Build Failures**: Ensure all dependencies are in `package.json`
4. **API Timeouts**: Some free tiers have request limits

### Build Commands Reference:
```bash
# Install all dependencies
npm run install:all

# Build frontend for production
cd frontend && npm run build

# Start backend in production
cd backend && npm start
```

---

## 💡 **Cost Comparison**

| Platform | Frontend | Backend | Custom Domain | SSL | Monthly Cost |
|----------|----------|---------|---------------|-----|--------------|
| **Render** | ✅ Free | ✅ Free (750h) | ✅ Free | ✅ Free | **$0** |
| **Railway** | ✅ Free | ✅ $5 credit | ✅ Free | ✅ Free | **$0-5** |
| **Vercel + Railway** | ✅ Free | ✅ $5 credit | ✅ Free | ✅ Free | **$0-5** |
| **Netlify + Heroku** | ✅ Free | ⚠️ Sleeps | ✅ Free | ✅ Free | **$0** |

---

## 🎉 **Recommended: Render.com**

For your Sales Dashboard, **Render.com** is the best choice because:
- Single platform for both frontend and backend
- Reliable uptime (no sleeping)
- Easy environment variable management
- Automatic deployments from Git
- Great free tier limits

**Your app will be live at**: `https://sales-dashboard-frontend.onrender.com`

---

## 📞 **Need Help?**

If you encounter any issues during deployment:
1. Check the platform's documentation
2. Review build logs for error messages
3. Verify all environment variables are set correctly
4. Test your API endpoints manually

Happy deploying! 🚀
