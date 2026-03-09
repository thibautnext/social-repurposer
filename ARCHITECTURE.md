# Architecture — Social Repurposer MVP

Technical architecture and system design.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Browser)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Next.js Pages + React Components (Tailwind CSS)        │  │
│  │ - Landing page                                          │  │
│  │ - Auth (login/signup)                                   │  │
│  │ - Dashboard (input + results)                           │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes (Vercel)               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ /api/auth/signup   (JWT generation, password hash)     │  │
│  │ /api/auth/login    (User lookup, password verify)      │  │
│  │ /api/repurpose     (Article fetch, Claude API calls)   │  │
│  │ /api/stripe/*      (Webhook handling)                  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
       ↓                   ↓                    ↓
   (PostgREST)      (Claude 3.5 Sonnet)   (Stripe API)
       ↓                   ↓                    ↓
┌──────────────┐  ┌──────────────────────┐  ┌──────────────┐
│  PostgreSQL  │  │ Anthropic API        │  │ Stripe       │
│  (NAS)       │  │ (Content gen)        │  │ (Payments)   │
│              │  │                      │  │              │
│ • users      │  │ 6 API calls/article  │  │ • subscriptions
│ • articles   │  │ ~2-3K tokens ea.     │  │ • webhooks
│ • variants   │  │ ~$0.003/article      │  │              │
│ • integrations                              │              │
└──────────────┘  └──────────────────────┘  └──────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: Tailwind CSS
- **State**: React hooks + localStorage
- **UI Components**: Custom Tailwind components (no external UI lib)

### Backend
- **Runtime**: Node.js 18+ (Vercel)
- **API**: Next.js API routes (serverless functions)
- **Language**: TypeScript
- **Auth**: JWT (jsonwebtoken + bcrypt)

### Database
- **System**: PostgreSQL 14+
- **Hosting**: Docker on NAS Synology DS224+
- **API Layer**: PostgREST (automatic REST API)
- **Backup**: Daily snapshots (NAS native)

### External APIs
- **Content Generation**: Anthropic Claude 3.5 Sonnet
- **Article Parsing**: Cheerio (Node.js)
- **Payments**: Stripe (test + production)
- **HTTP Client**: Axios

### Deployment
- **Hosting**: Vercel (Next.js optimized)
- **DNS**: Cloudflare (tunnel for NAS)
- **CDN**: Vercel edge network
- **Monitoring**: Vercel analytics + custom logs

---

## Data Model

### Tables

#### `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',           -- free, pro, enterprise
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `articles`
```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048),                         -- NULL if text input
  content TEXT NOT NULL,                     -- Full article text
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `variants`
```sql
CREATE TABLE variants (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,             -- 'all' for now
  content JSONB NOT NULL,                    -- {twitter[], linkedin, tiktok, ...}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `integrations`
```sql
CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,             -- twitter, linkedin, etc.
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Authentication Flow

```
1. User submits signup/login form
   ↓
2. Email + password sent to API route (HTTPS)
   ↓
3. Password hashed with bcrypt (async)
   ↓
4. User created/verified in PostgreSQL
   ↓
5. JWT token generated with:
   - userId, email, role ('app_user')
   - Expiry: 30 days
   - Secret: $JWT_SECRET (env var)
   ↓
6. Token returned to client
   ↓
7. Stored in localStorage (vulnerability: XSS could steal)
   ↓
8. Sent in Authorization header on protected requests
   ↓
9. Verified on server before allowing API calls
```

### Security Considerations
- Passwords never sent to Anthropic/Stripe/PostgREST
- JWT secret rotation (plan for Phase 2)
- HTTPS enforced (Vercel automatic)
- CORS headers set per domain
- Rate limiting on auth endpoints (plan for Phase 2)

---

## Content Repurposing Flow

```
User Input (URL or text)
   ↓
Fetch Article Content
   ├─ URL: axios + cheerio scraping
   └─ Text: use directly
   ↓
Send to Claude API (6 concurrent calls)
   ├─ Twitter thread: 10 tweets
   ├─ LinkedIn post
   ├─ TikTok script
   ├─ Instagram captions: 3 variants
   ├─ Facebook post
   └─ Email newsletter
   ↓
Aggregate responses
   ↓
Save article + variants to PostgreSQL
   ↓
Return to client
   ↓
Display with copy buttons
```

### API Call Breakdown
```
Total tokens per article: ~2,000-3,000
Cost per article: ~$0.003 (Claude 3.5 Sonnet)

Input tokens (shared):
- Article content: ~1,000 tokens
- Prompt: ~50 tokens × 6 = 300 tokens

Output tokens per variant:
- Twitter: ~150 tokens
- LinkedIn: ~100 tokens
- TikTok: ~80 tokens
- Instagram: ~60 tokens × 3 = 180 tokens
- Facebook: ~80 tokens
- Email: ~150 tokens

Total output: ~740 tokens
Total: ~2,000+ tokens per article
```

---

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response (201):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 42,
    "email": "user@example.com"
  }
}

Error (400):
{
  "error": "Email and password are required"
}
```

#### POST `/api/auth/login`
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 42,
    "email": "user@example.com"
  }
}

Error (401):
{
  "error": "Invalid email or password"
}
```

### Content

#### POST `/api/repurpose`
```json
Headers:
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}

Request:
{
  "url": "https://example.com/article" OR
  "text": "Article content here..."
}

Response (200):
{
  "success": true,
  "articleId": 123,
  "variants": {
    "twitter": ["Tweet 1", "Tweet 2", ...],
    "linkedin": "LinkedIn post...",
    "tiktok": "Script...",
    "instagram": ["Caption 1", "Caption 2", "Caption 3"],
    "facebook": "Facebook post...",
    "email": "Newsletter..."
  }
}

Error (500):
{
  "error": "Failed to repurpose article: [reason]"
}
```

---

## Error Handling

### Client-Side
- Form validation (email format, password length)
- Network error display
- Timeout warning (>30 seconds)
- Fallback UI for missing data

### Server-Side
- Try/catch blocks on all API routes
- Detailed error logging
- User-friendly error messages
- Rate limit responses (429)

### Database
- Connection pooling (PostgREST handles)
- Automatic retry on transient failures
- Transaction rollback on errors
- Cascading deletes (users → articles → variants)

---

## Performance Optimization

### Frontend
- Next.js code splitting (per page)
- Tailwind CSS purging
- Image lazy loading
- localStorage for token (instant redirect)

### Backend
- JWT verification (fast, no DB lookup)
- Connection pooling (max 20 connections)
- Indexed queries (user_id, article_id)
- Parallel Claude API calls (Promise.all)

### Database
- Indexes on foreign keys
- Pagination support (Phase 2)
- Query optimization
- Automatic VACUUM (PostgreSQL)

### API
- Response compression (gzip)
- Edge caching (24h on landing page)
- CDN for static assets (Vercel)

---

## Scalability Plan

### Phase 1 (Current: <10K users)
- Single PostgreSQL instance
- Vercel serverless functions
- Anthropic API throttling

### Phase 2 (10K-100K users)
- Database read replicas
- Redis caching for articles
- Stripe webhook queue (Bull/BullMQ)
- API rate limiting (10 req/min per user)

### Phase 3 (100K+ users)
- Multi-region deployment
- GraphQL API option
- Elasticsearch for content search
- Vector embeddings (for recommendations)
- Custom AI model fine-tuning

---

## Security Hardening Checklist

- [ ] HTTPS enforced (Vercel automatic)
- [ ] CORS headers configured
- [ ] SQL injection protection (PostgREST prepared statements)
- [ ] XSS protection (React auto-escapes)
- [ ] CSRF tokens (not needed for API auth)
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all endpoints
- [ ] Sensitive env vars never exposed
- [ ] API keys rotated quarterly
- [ ] Security headers (CSP, X-Frame-Options)

---

## Monitoring & Logging

### Vercel
- Real User Monitoring (RUM)
- Web Vitals tracking
- Error tracking (Sentry integration optional)
- Deployment rollback available

### Custom
- Error logging to PostgreSQL
- API latency tracking
- User signup/churn metrics
- Claude API cost tracking

### Alerting
- Slack webhook on API errors
- Email on failed deployments
- Cost alert if >$50/day on Claude

---

## Disaster Recovery

### Backups
- NAS automatic snapshots (hourly)
- PostgreSQL WAL archive to S3 (Phase 2)
- Application code on GitHub

### Failover Plan
- Switch to Supabase Cloud if NAS fails
- GitHub as primary code repo
- Database exports weekly

### RTO/RPO
- RTO (Recovery Time): <1 hour
- RPO (Recovery Point): <15 minutes

---

## Future Architecture Improvements

1. **Microservices**: Separate content gen, auth, payments
2. **WebSockets**: Real-time collaboration
3. **Video**: Generate video scripts + thumbnails
4. **Mobile**: React Native app
5. **Blockchain**: Decentralized content ownership (NFTs?)

---

**Diagram Tool**: Draw.io or Miro
**Last Updated**: 2026-03-09
**Owner**: Nova
