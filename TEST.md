# Testing Guide — Social Repurposer MVP

Complete testing checklist for Phase 1 & 2 deliverables.

## ✅ Pre-Launch Testing

### 1. Authentication Flow
- [ ] Sign up with new email → Creates user, generates JWT
- [ ] Login with valid credentials → Redirect to dashboard
- [ ] Login with invalid password → Error message
- [ ] Logout → Clear token, redirect to home

### 2. Database Connectivity
- [ ] Users table created and accepting records
- [ ] Articles table created and linked to users
- [ ] Variants table created and linked to articles
- [ ] PostgREST API responding correctly

### 3. Article Repurposing

#### Test Case 1: URL Input
**URL**: `https://www.paulgraham.com/makingbs.html`

Expected output:
- [ ] Twitter: 10 tweets, each <280 chars
- [ ] LinkedIn: 1 professional post (~500 chars)
- [ ] TikTok: 1 script with hook (30-60s read time)
- [ ] Instagram: 3 captions, each <300 chars
- [ ] Facebook: 1 engagement-focused post
- [ ] Email: Full newsletter with subject line

#### Test Case 2: Text Input
**Text**: Paste any 500+ word article directly

Expected output:
- [ ] All 6 variant types generated
- [ ] Content relevance: Each variant should match platform tone
- [ ] Copy-to-clipboard works for all variants

#### Test Case 3: Edge Cases
- [ ] Very short text (<100 words) → Graceful handling
- [ ] Very long text (>10,000 words) → Truncate and process
- [ ] Invalid URL (404, timeout) → Clear error message
- [ ] Malformed HTML → Still extract content via cheerio

### 4. Claude API Integration

- [ ] API calls complete within 30 seconds
- [ ] No API key leakage in client code
- [ ] Rate limit handling (if exceeded)
- [ ] Token usage reasonable (~2-3K tokens per article)

### 5. UI/UX Testing

**Landing Page** (`/`)
- [ ] Responsive on mobile, tablet, desktop
- [ ] CTA buttons link correctly
- [ ] Pricing tiers display clearly
- [ ] No broken links

**Auth Pages** (`/auth/login`, `/auth/signup`)
- [ ] Form validation (email format, password length)
- [ ] Error messages clear and actionable
- [ ] Success redirects to dashboard

**Dashboard** (`/dashboard`)
- [ ] Input form visible and functional
- [ ] Variants render correctly
- [ ] Copy-to-clipboard works for each variant
- [ ] Logout button clears session

### 6. Performance

- [ ] Page load time <3 seconds
- [ ] API response time <2 seconds
- [ ] No console errors or warnings
- [ ] Mobile-friendly rendering

### 7. Security

- [ ] JWT tokens expire correctly (30 days)
- [ ] Protected routes require valid token
- [ ] Password hashing (bcrypt) working
- [ ] No sensitive data in localStorage (other than token)
- [ ] CORS properly configured

## 🎯 Test Articles (Real-World Data)

### Business/Startups
1. **Paul Graham's Essays**: https://www.paulgraham.com/makingbs.html
2. **Stripe Blog**: https://stripe.com/blog
3. **A16Z**: https://a16z.com

### Technology
1. **TechCrunch**: https://techcrunch.com/2024/03/01/...
2. **The Verge**: https://www.theverge.com/tech
3. **HackerNews**: https://news.ycombinator.com

### Content Examples
Paste into text input for quick testing:

```
Artificial Intelligence is transforming how businesses operate. From customer service chatbots to predictive analytics, AI is everywhere. Companies that embrace AI early will have a competitive advantage in 2024.

The key to AI adoption is not just the technology itself, but how organizations integrate it with their existing workflows. Training employees, understanding ethical implications, and starting with low-risk pilots are crucial.

What's your AI strategy?
```

## 📊 Success Criteria

| Metric | Target | Actual |
|--------|--------|--------|
| Auth Flow | 100% pass | ___ |
| Variant Quality | 95%+ relevant | ___ |
| API Latency | <2s | ___ |
| Error Handling | 0 crashes | ___ |
| Mobile Responsive | Yes | ___ |

## 🚀 Deployment Readiness Checklist

- [ ] All env variables configured in Vercel
- [ ] Database schema created on NAS
- [ ] Build passes without warnings
- [ ] All tests pass locally
- [ ] README complete with setup instructions
- [ ] CONCEPT.md updated with current strategy
- [ ] Git repo clean and ready

## 🐛 Known Issues & Fixes

(To be updated during testing)

---

**Last Updated**: 2026-03-09
**Tester**: Nova
**Status**: Ready for QA
