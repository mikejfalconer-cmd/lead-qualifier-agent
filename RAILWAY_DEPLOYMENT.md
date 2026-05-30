# Deploy to Railway.com

## Quick Start

### Step 1: Go to Railway.com
1. Visit https://railway.app
2. Sign in with GitHub
3. Click "New Project"

### Step 2: Connect Your Repository
1. Click "Deploy from GitHub repo"
2. Select `mikejfalconer-cmd/lead-qualifier-agent`
3. Click "Deploy"

### Step 3: Add Environment Variables
Railway will automatically detect the Node.js project. Now add your environment variables:

1. In Railway dashboard, click your project
2. Go to the **Variables** tab
3. Add these variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_X5yT7SQglwMD@ep-wispy-salad-apra9k5e-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

GMAIL_ADDRESS=your-email@gmail.com
GMAIL_PASSWORD=your-app-specific-password

RESEND_API_KEY=re_xxxxx...

ANTHROPIC_API_KEY=sk-ant-xxxxx...

NODE_ENV=production
```

### Step 4: Deploy
1. Click the "Deploy" button
2. Wait 3-5 minutes for the build to complete
3. Railway will show you the deployment URL

### Step 5: Test
```bash
curl https://your-railway-url.railway.app/health
```

You should see:
```json
{"status":"ok","timestamp":"...","environment":"production"}
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` |
| `GMAIL_ADDRESS` | Gmail account for IMAP | `leads@company.com` |
| `GMAIL_PASSWORD` | Gmail app-specific password | `xxxx xxxx xxxx xxxx` |
| `RESEND_API_KEY` | Resend email API key | `re_xxxxx...` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-xxxxx...` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port (optional) | `3000` |

---

## Monitoring & Logs

### View Logs
1. Go to your Railway project
2. Click the **Logs** tab
3. See real-time server logs

### View Metrics
1. Click the **Metrics** tab
2. Monitor CPU, memory, and network usage

### Restart Service
1. Click the service
2. Click the **⋮** menu
3. Select "Restart"

---

## Custom Domain (Optional)

1. Go to your Railway project
2. Click **Settings**
3. Under "Domains", click "Add Domain"
4. Enter your custom domain
5. Update your DNS records as instructed

---

## Troubleshooting

### Deployment Failed
**Check:**
- All environment variables are set
- Database connection string is correct
- GitHub repo is connected properly

### API Returns 500 Error
**Check:**
- Environment variables are correct
- Database is accessible
- API keys are valid

### Logs Show Module Not Found
**This shouldn't happen with Railway!** If it does:
1. Restart the service
2. Check that `npm run build` completes successfully
3. Verify `dist/api/index.js` exists

---

## Pricing

Railway offers:
- **Free tier**: $5/month credit (usually enough for testing)
- **Pay as you go**: $0.50 per GB-hour of compute

For a typical lead qualifier app:
- Database: ~$10/month (Neon)
- API server: ~$5-15/month (Railway)
- Email service: Pay per email (Resend)

---

## Next Steps

After deployment:

1. **Test the API:**
   ```bash
   curl -H "X-API-Key: your_api_key" https://your-railway-url/api/leads
   ```

2. **Set up email forwarding:**
   - Add your forwarding email to Gmail
   - Configure IMAP in Gmail settings

3. **Monitor in production:**
   - Check Railway logs regularly
   - Set up alerts for errors

4. **Scale as needed:**
   - Railway auto-scales based on traffic
   - Upgrade database if needed

---

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Community:** https://discord.gg/railway
- **Our API Docs:** See `API_DOCUMENTATION.md`

---

**Deployment Date:** May 30, 2026
**Status:** Ready to Deploy ✅
