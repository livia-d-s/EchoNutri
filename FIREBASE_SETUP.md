# 🔥 Firebase Configuration Guide

## ❌ Current Problem: `auth/invalid-api-key`

Your Firebase API key in `.env` is either:
1. **Expired or revoked**
2. **From a different project**
3. **Has restricted HTTP referrers that block localhost**

---

## ✅ How to Fix: Get New Firebase Credentials

### Step 1: Go to Firebase Console

Open: https://console.firebase.google.com/

### Step 2: Select or Create Your Project

If you already have a project:
- Click on **"echo-med-database"** (or your project name)

If you need to create a new project:
- Click **"Add project"**
- Name it (e.g., "EchoNutri")
- Disable Google Analytics (optional)
- Click **"Create project"**

### Step 3: Get Web App Credentials

1. In the Firebase Console, click the **⚙️ Settings icon** (top left)
2. Click **"Project settings"**
3. Scroll down to **"Your apps"**
4. If you don't have a web app yet:
   - Click the **`</>`** icon (Web)
   - Name it "EchoNutri Web"
   - Click **"Register app"**
5. You'll see a **`firebaseConfig`** object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC_YOUR_ACTUAL_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 4: Copy to Your `.env` File

Replace the values in `c:\Users\livia\EchoMed\.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyC_YOUR_ACTUAL_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Backend API (keeps Gemini API key secure)
VITE_BACKEND_URL=http://localhost:3001
```

### Step 5: Enable Anonymous Authentication

This is **CRITICAL** for the app to work!

1. In Firebase Console, click **"Authentication"** (left sidebar)
2. Click **"Get started"** (if first time)
3. Click the **"Sign-in method"** tab
4. Find **"Anonymous"** in the providers list
5. Click it, then toggle **"Enable"**
6. Click **"Save"**

### Step 6: Enable Firestore Database

1. Click **"Firestore Database"** (left sidebar)
2. Click **"Create database"**
3. Choose **"Start in production mode"** or **"Test mode"** (test mode is easier for development)
4. Select a location (closest to you)
5. Click **"Enable"**

---

## 🔍 Verify Your Setup

### Test 1: Check if API Key is Valid

Open this URL in your browser (replace YOUR_API_KEY):
```
https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=YOUR_API_KEY
```

- ✅ **If valid**: You'll see JSON with `"error"` about missing fields (that's OK!)
- ❌ **If invalid**: You'll see `"API key not valid"`

### Test 2: Check Dev Server Console

After updating `.env`, restart your app:
```bash
# Kill existing servers
taskkill /IM node.exe /F

# Start fresh
npm start
```

You should see in browser console:
```
🔥 Firebase Config Loaded: { hasApiKey: true, apiKeyLength: 39, projectId: 'your-project-id' }
Attempting anonymous auth...
Anonymous auth successful!
```

---

## 🚨 Common Issues

### Issue: "auth/api-key-not-valid"
**Cause**: The API key in `.env` is wrong or restricted
**Fix**: Get a new API key from Firebase Console (Step 3 above)

### Issue: "auth/operation-not-allowed"
**Cause**: Anonymous authentication is not enabled in Firebase
**Fix**: Enable it (Step 5 above)

### Issue: "Vite doesn't pick up .env changes"
**Cause**: Vite caches environment variables
**Fix**:
1. Stop the dev server (Ctrl+C)
2. Restart it: `npm run dev`

### Issue: Still blank screen after fixing API key
**Cause**: Browser cached the old broken page
**Fix**:
1. Open DevTools (F12)
2. Right-click refresh button → **"Empty Cache and Hard Reload"**
3. Or open in Incognito mode

---

## 📋 Checklist

Before the app will work, you need:

- [ ] Valid Firebase API key in `.env`
- [ ] Anonymous Authentication **enabled** in Firebase Console
- [ ] Firestore Database created
- [ ] Backend server running (`node backend/server.js`)
- [ ] Frontend server running (`npm run dev`)
- [ ] Browser cache cleared

---

## 🎯 Quick Fix: Use Test Firebase Project

If you want to test the app quickly without setting up Firebase:

1. Create a **new** Firebase project just for testing
2. Enable **Anonymous Authentication**
3. Create Firestore in **Test mode** (allows all reads/writes for 30 days)
4. Copy the credentials to `.env`
5. Restart the app

---

## 📞 Need Help?

If you're still stuck:
1. Share the error message from browser console
2. Verify you completed Step 5 (Enable Anonymous Auth)
3. Check if your Firebase project exists at: https://console.firebase.google.com/

---

**Remember**: Firebase API keys are **public** and safe to put in `.env` for web apps. They're not like Gemini API keys which must stay secret on the backend.
