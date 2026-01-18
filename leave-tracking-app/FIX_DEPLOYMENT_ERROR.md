# Fix: Serverless Function Name Error

## Problem
Error: `A Serverless Function has an invalid name: "'Leave Tracking App/api/stats/overview.js'". They must be less than 128 characters long and must not contain any space.`

## Cause
Your repository/folder name "Leave Tracking App" contains spaces, which Vercel doesn't allow.

## Solution: Rename GitHub Repository

### Option 1: Rename Repository on GitHub (Recommended)

1. Go to your GitHub repository
2. Click **Settings** tab
3. Scroll down to **"Repository name"**
4. Change from: `Leave Tracking App`
5. Change to: `leave-tracking-app` (or `leave-tracker-app`)
6. Click **"Rename"**

### Option 2: Create New Repository (If you can't rename)

1. Create a new repository on GitHub with a name without spaces:
   - Example: `leave-tracking-app`
2. Push your code to the new repository:
   ```bash
   git remote set-url origin https://github.com/yourusername/leave-tracking-app.git
   git push -u origin main
   ```
3. Import the new repository in Vercel

## After Renaming

1. Go back to Vercel
2. If you renamed the repository:
   - Vercel should automatically detect the change
   - Or you may need to reconnect the repository
3. Try deploying again

## Alternative: Use Different Project Name in Vercel

If you can't rename the repository, you can:

1. In Vercel project settings, change the **Project Name** to something without spaces
2. However, the repository name will still cause issues, so renaming the repo is the best solution

---

**The easiest fix is to rename your GitHub repository to remove spaces!**
