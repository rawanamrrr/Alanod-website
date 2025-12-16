# Environment Variables Setup for Supabase

## Your Keys

Based on what you provided:
- **Publishable Key**: `sb_publishable_2vNOZgWKaZgf48WNzN8SDw_KDtRF2Sp` → This is your **ANON KEY** (public)
- **Secret Key**: `sb_secret_Xt9wTBJRDGXpLH2YPFOVVA_zWmZ8qeU` → This is your **SERVICE ROLE KEY** (private)

## What You Still Need

You also need your **Project URL**. To find it:

1. In Supabase dashboard, go to **Settings** → **API**
2. Look for **"Project URL"** - it looks like: `https://xxxxx.supabase.co`
3. Copy that URL

## Update Your .env.local File

Open your `.env.local` file and add/update these lines:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2vNOZgWKaZgf48WNzN8SDw_KDtRF2Sp
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Xt9wTBJRDGXpLH2YPFOVVA_zWmZ8qeU

# Keep your existing values
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_USER=sensefragrances1@gmail.com
EMAIL_PASS=oopg ejhq tfil firm
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Important:** Replace `YOUR-PROJECT-ID` with your actual project ID from the Project URL.

