# Deploying from AWS CloudShell

AWS CloudShell comes pre-configured with AWS CLI and credentials. Follow these steps to deploy your website.

## Step 1: Upload Files to CloudShell

### Option A: Clone from GitHub (if your code is on GitHub)

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/seva-innovations-website.git
cd seva-innovations-website
```

### Option B: Upload Files via CloudShell UI

1. In CloudShell, click the **Actions** menu (three dots)
2. Select **Upload file**
3. Upload your project files one by one, or create a zip and upload it

### Option C: Create Files Directly in CloudShell

You can copy-paste the deployment files directly into CloudShell.

## Step 2: Verify AWS Access

```bash
# Check AWS CLI version
aws --version

# Verify your AWS identity
aws sts get-caller-identity

# Check current region
aws configure get region
```

## Step 3: Deploy Using Bash Script

If you have the `deploy-aws.sh` script:

```bash
# Make script executable
chmod +x deploy-aws.sh

# Deploy without custom domain (for testing)
./deploy-aws.sh

# Or deploy with custom domain and certificate
./deploy-aws.sh seva-innovations-website seva-innovations-website us-east-1 www.seva-innovations.com "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
```

## Step 4: Manual Deployment (If Script Not Available)

### Create CloudFormation Stack

```bash
# Create stack
aws cloudformation create-stack \
  --stack-name seva-innovations-website \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=BucketName,ParameterValue=seva-innovations-website ParameterKey=DomainName,ParameterValue=www.seva-innovations.com \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM

# Wait for stack creation
aws cloudformation wait stack-create-complete \
  --stack-name seva-innovations-website \
  --region us-east-1
```

### Get Stack Outputs

```bash
# Get S3 bucket name
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
  --output text)

echo "S3 Bucket: $S3_BUCKET"

# Get CloudFront domain
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" \
  --output text)

echo "CloudFront URL: https://$CLOUDFRONT_URL"

# Get Distribution ID
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

echo "Distribution ID: $DIST_ID"
```

### Upload Files to S3

```bash
# Sync files to S3 (exclude deployment files)
aws s3 sync . s3://$S3_BUCKET \
  --region us-east-1 \
  --delete \
  --exclude "*.ps1" \
  --exclude "*.sh" \
  --exclude "*.yaml" \
  --exclude "*.yml" \
  --exclude "*.md" \
  --exclude ".git/*" \
  --exclude ".gitignore" \
  --exclude "node_modules/*" \
  --exclude "*.log"
```

### Invalidate CloudFront Cache

```bash
# Create cache invalidation
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*" \
  --region us-east-1
```

## Step 5: Verify Deployment

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].StackStatus"

# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id $DIST_ID \
  --query "Distribution.Status"

# List files in S3
aws s3 ls s3://$S3_BUCKET --recursive
```

## Quick Deployment Script for CloudShell

Create this file in CloudShell as `deploy-cloudshell.sh`:

```bash
#!/bin/bash
set -e

STACK_NAME="seva-innovations-website"
BUCKET_NAME="seva-innovations-website"
REGION="us-east-1"
DOMAIN_NAME="www.seva-innovations.com"
CERT_ARN="${1:-}"

echo "========================================"
echo "SEVA Innovations - CloudShell Deployment"
echo "========================================"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI not found"
    exit 1
fi

echo "✓ AWS CLI found: $(aws --version)"
echo "✓ AWS Identity: $(aws sts get-caller-identity --query 'Arn' --output text)"
echo ""

# Build parameters
PARAMS="ParameterKey=BucketName,ParameterValue=$BUCKET_NAME ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME"
if [ -n "$CERT_ARN" ]; then
    PARAMS="$PARAMS ParameterKey=CertificateArn,ParameterValue=$CERT_ARN"
    echo "Using certificate: $CERT_ARN"
fi

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    echo "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://cloudformation-template.yaml \
        --parameters $PARAMS \
        --region "$REGION" \
        --capabilities CAPABILITY_IAM
    
    aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
else
    echo "Creating new stack..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://cloudformation-template.yaml \
        --parameters $PARAMS \
        --region "$REGION" \
        --capabilities CAPABILITY_IAM
    
    aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
fi

echo "✓ Stack deployed"
echo ""

# Get outputs
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
    --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" \
    --output text)

DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text)

echo "Stack Outputs:"
echo "  S3 Bucket: $S3_BUCKET"
echo "  CloudFront URL: https://$CLOUDFRONT_URL"
echo "  Distribution ID: $DIST_ID"
echo ""

# Upload files
echo "Uploading files to S3..."
aws s3 sync . s3://$S3_BUCKET \
    --region "$REGION" \
    --delete \
    --exclude "*.ps1" \
    --exclude "*.sh" \
    --exclude "*.yaml" \
    --exclude "*.yml" \
    --exclude "*.md" \
    --exclude ".git/*" \
    --exclude "node_modules/*" \
    --exclude "*.log"

echo "✓ Files uploaded"
echo ""

# Invalidate cache
echo "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

echo "✓ Cache invalidation created: $INVALIDATION_ID"
echo ""

echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Your website is available at:"
if [ -n "$CERT_ARN" ]; then
    echo "  https://$DOMAIN_NAME (after DNS configuration)"
fi
echo "  https://$CLOUDFRONT_URL"
echo ""
echo "Next steps:"
echo "  1. Wait 5-15 minutes for CloudFront to deploy"
if [ -n "$CERT_ARN" ]; then
    echo "  2. Configure DNS: Create CNAME record $DOMAIN_NAME -> $CLOUDFRONT_URL"
fi
echo "  3. Test your website"
echo ""
```

Then run:
```bash
chmod +x deploy-cloudshell.sh
./deploy-cloudshell.sh
# Or with certificate:
./deploy-cloudshell.sh "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
```

## CloudShell Tips

1. **Persistent Storage**: CloudShell has 1GB persistent storage in your home directory
2. **File Upload**: Use Actions → Upload file in CloudShell UI
3. **Git Available**: Git is pre-installed in CloudShell
4. **Region**: Make sure you're in `us-east-1` for CloudFront and ACM certificates
5. **Session Timeout**: CloudShell sessions timeout after 20 minutes of inactivity

## Troubleshooting

### Files Not Found
- Make sure you're in the correct directory (`cd` to your project folder)
- Use `ls` to list files
- Upload files via CloudShell UI if needed

### Permission Errors
- CloudShell uses your IAM user/role permissions
- Ensure you have CloudFormation, S3, and CloudFront permissions

### Stack Already Exists
- The script will automatically update existing stacks
- To delete: `aws cloudformation delete-stack --stack-name seva-innovations-website --region us-east-1`

## Quick Commands Reference

```bash
# Check current directory
pwd

# List files
ls -la

# Change directory
cd /path/to/project

# Check AWS region
aws configure get region

# Set region if needed
aws configure set region us-east-1

# View stack outputs
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs"

# List S3 files
aws s3 ls s3://BUCKET_NAME --recursive

# Check CloudFront status
aws cloudfront get-distribution --id DIST_ID --query "Distribution.Status"
```

