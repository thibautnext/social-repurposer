# Quick Start — 25 Minutes to Live 🚀

Fastest path from code to production.

---

## ⚡ 5 Minutes: Prepare Environment

### 1. Get API Keys

```bash
# Anthropic
# Go to https://console.anthropic.com and get your API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Generate JWT Secret
export JWT_SECRET=$(openssl rand -base64 32)

# PostgREST (from TOOLS.md)
export POSTGREST_URL="https://supabase.novalys.io"
export POSTGREST_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Stripe (from Stripe Dashboard test mode)
export STRIPE_PUBLIC_KEY="pk_test_..."
export STRIPE_SECRET_KEY="sk_test_..."
```

### 2. Create `.env.local`

```bash
cd /Users/thibaut/clawd/nightly-builds/social-repurposer

cat > .env.local << EOF
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
JWT_SECRET=$JWT_SECRET
POSTGREST_URL=$POSTGREST_URL
POSTGREST_ANON_KEY=$POSTGREST_ANON_KEY
STRIPE_PUBLIC_KEY=$STRIPE_PUBLIC_KEY
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
```

---

## ⚡ 10 Minutes: Setup Database

### 1. SSH to NAS
```bash
ssh thibaut@192.168.1.4
```

### 2. Create Tables
```bash
sudo docker exec nas-postgres psql -U thibaut -d main << 'EOF'

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variants (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_variants_article_id ON variants(article_id);
CREATE INDEX idx_integrations_user_id ON integrations(user_id);

EOF
```

### 3. Restart PostgREST
```bash
sudo docker restart nas-postgrest
exit
```

---

## ⚡ 3 Minutes: Test Locally

```bash
cd /Users/thibaut/clawd/nightly-builds/social-repurposer

npm run dev
```

Visit: http://localhost:3000

1. ✅ Sign up with test email
2. ✅ Paste article URL or text
3. ✅ See 6 variants generated
4. ✅ Copy any variant

---

## ⚡ 5 Minutes: Deploy to Vercel

### 1. Push to GitHub
```bash
git remote add origin https://github.com/thibautnext/social-repurposer.git
git push -u origin main
```

### 2. Create Vercel Project
```bash
npm install -g vercel
vercel --prod
```

Follow prompts:
- Connect GitHub repo? **Yes**
- Select repo? **social-repurposer**
- Deploy? **Yes**

### 3. Add Environment Variables
Go to Vercel Dashboard → Settings → Environment Variables

Add these 6 variables:
1. `ANTHROPIC_API_KEY`
2. `JWT_SECRET`
3. `POSTGREST_URL`
4. `POSTGREST_ANON_KEY`
5. `STRIPE_PUBLIC_KEY`
6. `STRIPE_SECRET_KEY`

### 4. Redeploy
```bash
vercel --prod
```

---

## 🎉 Live!

Your app is now live at:
```
https://social-repurposer.vercel.app
```

Test in production:
1. Sign up
2. Paste article
3. Get variants
4. Copy content

---

## 📊 What You Just Launched

| Component | Status |
|-----------|--------|
| Landing page | ✅ Live |
| Auth (signup/login) | ✅ Working |
| Content repurposing | ✅ 6 variants |
| Database | ✅ Connected |
| Deployment | ✅ Vercel |

---

## 🚨 Troubleshooting Quick Fixes

### "Database connection refused"
```bash
# Check PostgREST is running
ssh thibaut@192.168.1.4
sudo docker ps | grep postgrest
# Should see: nas-postgrest running
```

### "Anthropic API error"
```bash
# Check API key
echo $ANTHROPIC_API_KEY
# Should start with: sk-ant-
```

### "Blank page / 500 error"
```bash
# Check Vercel logs
vercel logs --prod
# Look for error messages
```

---

## 📚 Next Steps

1. **Monitor**: Check Vercel dashboard daily
2. **Iterate**: Gather user feedback
3. **Monetize**: Setup Stripe billing (Phase 2)
4. **Scale**: Add bulk publishing (Phase 2)

---

**Your SaaS is live. Ship it.** 🚀
