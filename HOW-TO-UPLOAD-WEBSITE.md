# How to Upload and Update Your Website on AWS

This guide shows you exactly where and how to upload your website files to AWS.

## Quick Answer

**To upload your website to AWS, run this command:**

```powershell
npm run deploy:aws
```

Or directly:

```powershell
.\deploy-aws.ps1
```

This automatically:
1. Creates the AWS infrastructure (S3 bucket + CloudFront)
2. Uploads all your website files to S3
3. Configures CloudFront CDN

## Where Your Files Go

Your website files are stored in:
- **S3 Bucket**: `seva-innovations-website-ACCOUNT_ID` (created automatically)
- **Served via**: CloudFront CDN distribution

You don't need to manually upload files to S3 - the script does it for you!

## Step-by-Step: First Time Deployment

### 1. Open PowerShell in Your Project Folder

Navigate to your project directory:
```powershell
cd C:\Users\offic\Documents\seva-innovations-main-main
```

### 2. Deploy Everything (Infrastructure + Files)

```powershell
npm run deploy:aws
```

**What happens:**
- ✅ Creates S3 bucket
- ✅ Creates CloudFront distribution
- ✅ Uploads all HTML, CSS, JS, images, PDFs
- ✅ Invalidates CloudFront cache
- ✅ Shows you the website URL

**Time:** 5-15 minutes (first time)

### 3. Get Your Website URL

After deployment, you'll see output like:
```
Your website is available at:
  https://d1234567890.cloudfront.net
```

## Updating Your Website (After First Deployment)

### Option 1: Update Files Only (Recommended)

When you make changes to your HTML, CSS, or images:

```powershell
npm run deploy:aws:upload-only
```

Or:
```powershell
.\deploy-aws.ps1 -SkipCloudFormation
```

**What happens:**
- ✅ Uploads only changed files to S3
- ✅ Invalidates CloudFront cache
- ✅ Your changes appear in 5-15 minutes

**Time:** 2-5 minutes

### Option 2: Manual Upload via AWS Console

If you prefer using the web interface:

1. **Go to S3 Console**: https://console.aws.amazon.com/s3/
2. **Find your bucket**: Look for `seva-innovations-website-ACCOUNT_ID`
3. **Click on the bucket**
4. **Click "Upload"**
5. **Drag and drop your files** or click "Add files"
6. **Click "Upload"**
7. **Invalidate CloudFront cache** (see below)

### Option 3: Manual Upload via AWS CLI

```powershell
# Get your bucket name first
aws cloudformation describe-stacks `
  --stack-name seva-innovations-website `
  --region us-east-1 `
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" `
  --output text

# Then sync files (replace BUCKET_NAME with output above)
aws s3 sync . s3://BUCKET_NAME `
  --exclude "*.ps1" `
  --exclude "*.sh" `
  --exclude "*.yaml" `
  --exclude "*.md" `
  --exclude ".git/*" `
  --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation `
  --distribution-id YOUR_DISTRIBUTION_ID `
  --paths "/*"
```

## Making Changes to Your Website

### Example: Update HTML File

1. **Edit your file** (e.g., `Index.html`) in your code editor
2. **Save the file**
3. **Upload changes**:
   ```powershell
   npm run deploy:aws:upload-only
   ```
4. **Wait 5-15 minutes** for CloudFront cache to clear
5. **Refresh your website** to see changes

### Example: Add New Image

1. **Add image** to `ImageDump/` folder
2. **Upload changes**:
   ```powershell
   npm run deploy:aws:upload-only
   ```
3. **Wait for cache invalidation**
4. **View updated website**

### Example: Update CSS

1. **Edit** `styles.css`
2. **Save**
3. **Upload**:
   ```powershell
   npm run deploy:aws:upload-only
   ```
4. **Wait and refresh**

## Finding Your S3 Bucket

### Method 1: From Deployment Output

After running `npm run deploy:aws`, look for:
```
S3 Bucket: seva-innovations-website-123456789012
```

### Method 2: AWS Console

1. Go to: https://console.aws.amazon.com/s3/
2. Look for bucket starting with `seva-innovations-website-`

### Method 3: AWS CLI

```powershell
aws cloudformation describe-stacks `
  --stack-name seva-innovations-website `
  --region us-east-1 `
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" `
  --output text
```

## Finding Your CloudFront Distribution

### Method 1: From Deployment Output

Look for:
```
CloudFront URL: https://d1234567890.cloudfront.net
Distribution ID: E1234567890ABC
```

### Method 2: AWS Console

1. Go to: https://console.aws.amazon.com/cloudfront/
2. Find distribution for `seva-innovations-website`

### Method 3: AWS CLI

```powershell
aws cloudformation describe-stacks `
  --stack-name seva-innovations-website `
  --region us-east-1 `
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" `
  --output text
```

## Common Tasks

### View Files in S3 Bucket

**Via AWS Console:**
1. Go to S3 Console
2. Click your bucket name
3. Browse files

**Via AWS CLI:**
```powershell
aws s3 ls s3://YOUR_BUCKET_NAME --recursive
```

### Delete a File

**Via AWS Console:**
1. Go to S3 Console → Your bucket
2. Find file
3. Select checkbox
4. Click "Delete"

**Via AWS CLI:**
```powershell
aws s3 rm s3://YOUR_BUCKET_NAME/path/to/file.html
```

### Clear CloudFront Cache

After uploading files, clear cache so changes appear immediately:

```powershell
# Get distribution ID first
$distId = aws cloudformation describe-stacks `
  --stack-name seva-innovations-website `
  --region us-east-1 `
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" `
  --output text

# Create invalidation
aws cloudfront create-invalidation `
  --distribution-id $distId `
  --paths "/*"
```

## Workflow Summary

### Daily Workflow (Making Updates)

1. **Edit files** locally (HTML, CSS, JS, images)
2. **Test locally** (open HTML files in browser)
3. **Upload to AWS**:
   ```powershell
   npm run deploy:aws:upload-only
   ```
4. **Wait 5-15 minutes**
5. **Check website** at your CloudFront URL

### First Time Setup

1. **Request SSL certificate** (if using custom domain)
2. **Deploy infrastructure + files**:
   ```powershell
   npm run deploy:aws
   ```
3. **Configure DNS** in Route 53
4. **Wait for DNS propagation**
5. **Test website**

## Troubleshooting

### Files Not Updating

- **Check**: Did you run the upload command?
- **Check**: Wait 5-15 minutes for CloudFront cache
- **Check**: Clear browser cache (Ctrl+F5)
- **Check**: Verify files are in S3 bucket

### Upload Fails

- **Check**: AWS credentials configured (`aws configure`)
- **Check**: You're in the correct directory
- **Check**: AWS CLI installed (`aws --version`)

### Can't Find Bucket

- **Check**: Stack was created successfully
- **Check**: Correct AWS region (`us-east-1`)
- **Check**: Correct AWS account

## Quick Reference Commands

```powershell
# Full deployment (first time)
npm run deploy:aws

# Update files only (after first deployment)
npm run deploy:aws:upload-only

# Deploy with custom domain
.\deploy-aws.ps1 -CertificateArn "YOUR_CERT_ARN"

# List files in S3
aws s3 ls s3://YOUR_BUCKET_NAME --recursive

# Sync files manually
aws s3 sync . s3://YOUR_BUCKET_NAME --exclude "*.ps1" --exclude "*.yaml" --exclude "*.md" --delete
```

## Where Everything Lives

```
Your Computer:
├── Index.html          → Uploaded to S3 → Served via CloudFront
├── styles.css          → Uploaded to S3 → Served via CloudFront
├── formsubmit.js       → Uploaded to S3 → Served via CloudFront
├── ImageDump/          → Uploaded to S3 → Served via CloudFront
├── LMS PHOTOS/         → Uploaded to S3 → Served via CloudFront
└── PDFS/               → Uploaded to S3 → Served via CloudFront

AWS:
├── S3 Bucket           → Stores all your files
└── CloudFront          → Serves files globally via CDN
```

## Need Help?

- **First time setup**: See [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
- **SSL Certificate**: See [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md)
- **DNS Setup**: See [ROUTE53-DNS-SETUP.md](./ROUTE53-DNS-SETUP.md)
- **Full Guide**: See [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md)


