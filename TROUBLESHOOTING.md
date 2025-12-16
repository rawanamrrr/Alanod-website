# Troubleshooting - Server Running but 500 Error

## ✅ Good News: Server IS Running!
The server is running on port 3000 - you can see it's listening.

## ❌ Problem: 500 Internal Server Error

This means there's likely a configuration issue. Here's how to fix it:

### Step 1: Check Your Terminal
Look at the terminal where you ran `pnpm dev` - you should see error messages in red. 

**What to look for:**
- "Missing env.NEXT_PUBLIC_SUPABASE_URL"
- "Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY"  
- Any Supabase connection errors

### Step 2: Verify Your .env.local File

Make sure your `.env.local` file in the project root has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jwbonsxidrbmuiopjafj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_2vNOZgWKaZgf48WNzN8SDw_KDtRF2Sp
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Xt9wTBJRDGXpLH2YPFOVVA_zWmZ8qeU
```

**Important Notes:**
- No spaces around the `=` sign
- No quotes around the values
- Each variable on its own line

### Step 3: Restart the Server

After fixing `.env.local`:
1. Stop the server (Ctrl+C in terminal)
2. Start it again: `pnpm dev`
3. Wait 30 seconds for it to compile
4. Try the browser again

### Step 4: Check Browser Console

In your browser:
1. Press F12 to open developer tools
2. Go to the "Console" tab
3. Refresh the page
4. Look for any error messages

---

## Quick Fix Checklist

- [ ] `.env.local` file exists in project root
- [ ] All 3 Supabase variables are set correctly
- [ ] No extra spaces or quotes in .env.local
- [ ] Server restarted after editing .env.local
- [ ] Waited 30+ seconds for compilation

---

## Still Not Working?

Share the error message from your terminal and I'll help fix it!

