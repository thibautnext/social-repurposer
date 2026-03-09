# Deployment Guide — Social Repurposer MVP

Complete step-by-step guide to deploy to Vercel.

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free tier OK)
- [ ] Environment variables ready:
  - Anthropic API key
  - JWT secret (generate with `openssl rand -base64 32`)
  - PostgREST URL & ANON key (from NAS Synology)
  - Stripe test keys

---

## Step 1: Push to GitHub

```bash
cd /Users/thibaut/clawd/nightly-builds/social-repurposer

# Initialize git if not done
git init
git add .
git commit -m "Initial commit: Social Repurposer MVP"

# Create repo on GitHub (CLI or web)
gh repo create social-repurposer --public --source=. --remote=origin --push
```

### Expected Output
```
✓ Created repository thibautnext/social-repurposer on GitHub
✓ Pushed commit to https://github.com/thibautnext/social-repurposer
```

---

## Step 2: Setup Vercel Deployment

### Option A: Via CLI (Recommended)

```bash
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

During setup, Vercel will:
1. Ask if you want to connect a Git repo → **Yes**
2. Select GitHub org → Your GitHub account
3. Select repo → `social-repurposer`

### Option B: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Find `thibautnext/social-repurposer`
4. Click "Import"
5. Configure project settings:
   - **Framework**: Next.js
   - **Root Directory**: `./`
   - **Build command**: `npm run build`
   - **Install command**: `npm install`

---

## Step 3: Add Environment Variables

### Via CLI
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add JWT_SECRET
vercel env add POSTGREST_URL
vercel env add POSTGREST_ANON_KEY
vercel env add STRIPE_PUBLIC_KEY
vercel env add STRIPE_SECRET_KEY

# Re-deploy
vercel --prod
```

### Via Dashboard
1. Go to **Settings** → **Environment Variables**
2. Add each variable:

| Key | Value | Scope |
|-----|-------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production |
| `JWT_SECRET` | `<base64-random-string>` | Production |
| `POSTGREST_URL` | `https://supabase.novalys.io` | Production |
| `POSTGREST_ANON_KEY` | `eyJ...` | Production |
| `STRIPE_PUBLIC_KEY` | `pk_test_...` | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Production |

---

## Step 4: Setup Database on NAS

### Connect to NAS
```bash
ssh thibaut@192.168.1.4
```

### Create Tables
```bash
sudo docker exec nas-postgres psql -U thibaut -d main << 'EOF'

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Variants table
CREATE TABLE IF NOT EXISTS variants (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_variants_article_id ON variants(article_id);
CREATE INDEX idx_integrations_user_id ON integrations(user_id);

EOF
```

### Restart PostgREST
```bash
sudo docker restart nas-postgrest
```

### Verify Connection
```bash
curl -H "Authorization: Bearer eyJ..." \
  https://supabase.novalys.io/rest/v1/users?limit=1
```

Expected: Empty array `[]` or error if auth fails (both OK).

---

## Step 5: Verify Deployment

### 1. Test Landing Page
```
https://social-repurposer.vercel.app
```
- [ ] Page loads
- [ ] Sign up/Login buttons visible
- [ ] Pricing tiers displayed

### 2. Test Auth Flow
```
https://social-repurposer.vercel.app/auth/signup
```
- [ ] Sign up with test email: `test@example.com` / `Test1234`
- [ ] Redirects to `/dashboard`
- [ ] JWT token stored in localStorage

### 3. Test Repurposing
```
https://social-repurposer.vercel.app/dashboard
```
- [ ] Paste test article URL or text
- [ ] Click "Transform Article"
- [ ] Wait 10-20 seconds for Claude API
- [ ] See 6 variant types (Twitter, LinkedIn, TikTok, Instagram, Facebook, Email)
- [ ] Copy-to-clipboard works

### 4. Check Logs
```bash
vercel logs <deployment-url>
```

Look for:
- No 500 errors
- API calls completing
- No sensitive data logged

---

## Step 6: Domain Setup (Optional)

### Add Custom Domain
1. Go to Vercel Dashboard → Settings → Domains
2. Add domain: `socialrepurposer.io` or similar
3. Point DNS to Vercel nameservers
4. Verify domain setup

### Update Environment
In Vercel Settings → Environment Variables:
- `NEXT_PUBLIC_API_URL`: `https://socialrepurposer.io`

---

## Step 7: Monitor & Maintain

### Setup Error Tracking
```bash
npm install @sentry/nextjs
```

Configure Sentry for production error tracking.

### Monitor API Usage
1. **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → Usage
2. **Stripe**: [dashboard.stripe.com](https://dashboard.stripe.com) → Payments
3. **PostgREST**: Monitor NAS Docker logs

### Daily Checklist
- [ ] No spike in API costs
- [ ] Database size growing normally
- [ ] User signups flowing
- [ ] Error logs checked

---

## Troubleshooting

### "Database connection refused"
- Check `POSTGREST_URL` is publicly accessible
- Verify Cloudflare tunnel running: `sudo docker ps | grep tunnel`

### "Anthropic API error"
- Check API key is valid: `curl -H "Authorization: Bearer $KEY" https://api.anthropic.com/models`
- Check rate limits not exceeded

### "JWT token invalid"
- Regenerate `JWT_SECRET`
- Re-deploy with new secret
- Users will need to log in again

### "Stripe webhook not received"
- Go to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks
- Endpoint: `https://social-repurposer.vercel.app/api/stripe/webhook`
- Test webhook, check response

---

## Performance Optimization

### For Faster Page Loads
1. Enable edge caching in Vercel
2. Add image optimization: `next/image`
3. Code split for dashboard

### For Cheaper API Costs
1. Cache article content (1 hour)
2. Batch Claude API calls
3. Use cheaper Claude model for drafts

### For Scalability
1. Add CDN caching headers
2. Implement rate limiting per user
3. Queue long-running tasks (Bull/BullMQ)

---

## Post-Launch Checklist

- [ ] Deploy to production
- [ ] Test all user flows
- [ ] Monitor performance & errors
- [ ] Setup alerts for API failures
- [ ] Document deployment in runbook
- [ ] Plan Phase 2 development

---

**Deployment Date**: _____
**Deployed By**: Nova
**Status**: 🟢 Live

For rollback: `vercel rollback <previous-deployment-id>`
