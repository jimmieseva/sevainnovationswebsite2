# SEVA Innovations - Deployment Setup Instructions

## Manual GitHub Repository Creation

Since the CLI tools aren't responding, here's how to set up the repository manually:

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `seva-innovations-website`
3. Description: `SEVA Innovations company website with Google Maps integration`
4. Set to **Public**
5. Don't initialize with README (we already have files)
6. Click "Create repository"

### Step 2: Push Your Code
After creating the repository, GitHub will show you commands. Use these in PowerShell:

```powershell
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/seva-innovations-website.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import from GitHub: `seva-innovations-website`
4. Vercel will auto-detect it's a static site
5. Click "Deploy"

## Alternative: Direct Vercel Deployment

You can also deploy directly from your local folder:

1. Go to https://vercel.com
2. Click "New Project"
3. Choose "Browse All Templates"
4. Select "Other" or "Static Site"
5. Upload your project folder or drag and drop

## Project Features
- ✅ Google Maps integration for 16333 Great Oaks Dr. STE 100, Round Rock, TX 78681
- ✅ Complete contact information
- ✅ Responsive design
- ✅ Professional styling
- ✅ All SEVA Innovations services and products

The website is ready to deploy!
