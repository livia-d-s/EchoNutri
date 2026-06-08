# 🤖 OpenAI API Setup - Switching from Gemini

Your backend now uses **OpenAI ChatGPT** instead of Gemini for better reliability!

---

## ⚡ Quick Setup (5 minutes):

### Step 1: Get OpenAI API Key

1. **Go to**: https://platform.openai.com/api-keys
2. **Sign in** (or create account if needed)
3. Click **"Create new secret key"**
4. **Name it**: "EchoNutri Backend"
5. **Copy the key** (starts with `sk-...`)

⚠️ **Important**: Copy it immediately! You can't see it again after closing the dialog.

---

### Step 2: Add to Backend `.env`

1. Open: `c:\Users\livia\EchoMed\backend\.env`
2. **Add this line**:
   ```env
   OPENAI_API_KEY=sk-YOUR_KEY_HERE
   ```

Your `backend/.env` should look like:
```env
GOOGLE_API_KEY=...
GEMINI_API_KEY=...

# OpenAI API (recommended - more reliable than Gemini)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

---

### Step 3: Restart Backend

```bash
# Kill backend (Ctrl+C in backend terminal)

# Start again
cd backend
node server.js
```

---

### Step 4: Test Your App

1. Go to: http://localhost:3000
2. Record or type a medical consultation
3. Click "Finalizar Consulta"
4. **It should work now!** ✅

---

## 💰 OpenAI Pricing (Cheaper than Gemini!)

**GPT-3.5-Turbo** (what we're using):
- Input: $0.50 / 1M tokens
- Output: $1.50 / 1M tokens

**Free Trial**: $5 credit for new accounts (lasts ~3 months of testing)

**Cost per analysis**: ~$0.001 (0.1 cent) per consultation

**Much more reliable** than Gemini's free tier!

---

## 🎯 Why OpenAI?

| Feature | Gemini Free | OpenAI |
|---------|-------------|--------|
| Quota limits | Very low | High |
| Reliability | ⚠️ Hit limits | ✅ Stable |
| JSON mode | ❌ Buggy | ✅ Perfect |
| API stability | ❌ Changes | ✅ Stable |
| Cost | Free but unreliable | $0.001/request |

---

## ✅ After Setup:

You should see in backend terminal:
```
🚀 Servidor de IA rodando em http://localhost:3001
```

And when you analyze:
```
✅ Analysis completed successfully!
```

---

## 🚨 Common Issues:

### "OPENAI_API_KEY not configured"
**Fix**: Add the key to `backend/.env` and restart

### "Incorrect API key"
**Fix**: Make sure you copied the full key (starts with `sk-proj-` or `sk-`)

### "Rate limit exceeded"
**Fix**: Wait 1 minute or add payment method to OpenAI account

---

## 🎉 Benefits:

- ✅ **No more quota issues**
- ✅ **Faster responses**
- ✅ **Better JSON formatting**
- ✅ **More reliable API**
- ✅ **Better medical analysis**

---

## 📝 Quick Start Commands:

```bash
# 1. Get OpenAI key: https://platform.openai.com/api-keys
# 2. Add to backend/.env:
echo "OPENAI_API_KEY=sk-your-key-here" >> backend/.env

# 3. Restart backend:
cd backend
node server.js

# 4. Test: http://localhost:3000
```

**That's it!** Your app will now use ChatGPT for analysis. 🚀
