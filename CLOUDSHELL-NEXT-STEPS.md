# CloudShell Deployment - Next Steps

You've successfully cloned the repository. Follow these steps to deploy:

## Step 1: Navigate to Project Directory

```bash
cd sevainnovationswebsite2
ls -la
```

## Step 2: Verify Files Are Present

```bash
# Check for CloudFormation template
ls cloudformation-template.yaml

# Check for deployment scripts
ls deploy*.sh

# Verify AWS CLI is available
aws --version

# Verify AWS credentials
aws sts get-caller-identity
```

## Step 3: Set Region (Important!)

```bash
# CloudFront and ACM certificates must be in us-east-1
aws configure set region us-east-1

# Verify
aws configure get region
```

## Step 4: Deploy Your Website

### Option A: Quick Deploy (Without Custom Domain - Testing)

```bash
# Make script executable
chmod +x deploy-cloudshell.sh

# Deploy
./deploy-cloudshell.sh
```

### Option B: Deploy with Custom Domain (www.seva-innovations.com)

**First, get your SSL certificate ARN:**

```bash
# List certificates in us-east-1
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='www.seva-innovations.com'].CertificateArn" --output text
```

**Then deploy with certificate:**

```bash
# Replace CERT_ARN with your actual certificate ARN
./deploy-cloudshell.sh "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
```

### Option C: Use Existing Bash Script

```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

## Step 5: Monitor Deployment

The deployment will:
1. Create/update CloudFormation stack (5-15 minutes)
2. Upload files to S3 (2-5 minutes)
3. Invalidate CloudFront cache

**Watch the progress** - you'll see output showing each step.

## Step 6: Get Your Website URL

After deployment completes, you'll see output like:

```
Your website is available at:
  https://d1234567890.cloudfront.net
```

**Save this URL!**

## Step 7: Configure DNS (If Using Custom Domain)

After deployment with certificate, configure Route 53:

1. Get CloudFront domain from deployment output
2. Go to Route 53 → Hosted zones → `seva-innovations.com`
3. Create CNAME record:
   - **Name**: `www`
   - **Type**: `CNAME`
   - **Value**: `d1234567890.cloudfront.net` (from output)
   - **TTL**: `300`

## Troubleshooting

### If Script Fails

**Check stack status:**
```bash
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].StackStatus"
```

**View stack events:**
```bash
aws cloudformation describe-stack-events \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --max-items 10
```

### If Files Don't Upload

**Manually upload to S3:**
```bash
# Get bucket name
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
  --output text)

# Upload files
aws s3 sync . s3://$S3_BUCKET \
  --exclude "*.sh" --exclude "*.yaml" --exclude "*.md" \
  --delete
```

## Quick Reference Commands

```bash
# Check current directory
pwd

# List files
ls -la

# Check AWS region
aws configure get region

# Check stack outputs
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs"

# List S3 files
aws s3 ls s3://BUCKET_NAME --recursive

# Check CloudFront status
aws cloudfront get-distribution \
  --id DISTRIBUTION_ID \
  --query "Distribution.Status"
```

## Expected Output

When deployment succeeds, you'll see:

```
========================================
SEVA Innovations - CloudShell Deployment
========================================

✓ AWS CLI found: aws-cli/2.x.x
✓ AWS Identity: arn:aws:iam::ACCOUNT:user/USER

Deploying CloudFormation stack...
Creating new stack...
✓ Stack deployed

Stack Outputs:
  S3 Bucket: seva-innovations-website-ACCOUNT_ID
  CloudFront URL: https://d1234567890.cloudfront.net
  Distribution ID: E1234567890ABC

Uploading files to S3...
✓ Files uploaded

Invalidating CloudFront cache...
✓ Cache invalidation created: I1234567890ABC

========================================
Deployment Complete!
========================================

Your website is available at:
  https://d1234567890.cloudfront.net

Next steps:
  1. Wait 5-15 minutes for CloudFront to deploy
  2. Test your website
```

## Next Steps After Deployment

1. ✅ Wait 5-15 minutes for CloudFront distribution to fully deploy
2. ✅ Test your website at the CloudFront URL
3. ✅ If using custom domain, configure DNS in Route 53
4. ✅ Wait for DNS propagation (1-48 hours)
5. ✅ Test custom domain: `https://www.seva-innovations.com`


