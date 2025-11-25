# AWS Deployment Guide for SEVA Innovations Website

This guide will help you deploy the SEVA Innovations website to AWS using S3 and CloudFront.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure the AWS CLI
   - Download: https://aws.amazon.com/cli/
   - Configure: `aws configure`
   - You'll need:
     - AWS Access Key ID
     - AWS Secret Access Key
     - Default region (e.g., `us-east-1`)
     - Default output format (e.g., `json`)

3. **Permissions**: Your AWS user/role needs the following permissions:
   - CloudFormation (create/update stacks)
   - S3 (create buckets, upload files)
   - CloudFront (create distributions, invalidate cache)
   - IAM (create OAI)

## Quick Start

### Windows (PowerShell)

```powershell
# Full deployment (infrastructure + upload)
npm run deploy:aws

# Or directly:
.\deploy-aws.ps1
```

### Linux/Mac (Bash)

```bash
# Make script executable
chmod +x deploy-aws.sh

# Full deployment
npm run deploy:aws:linux

# Or directly:
./deploy-aws.sh
```

## Deployment Options

### Full Deployment (Recommended for first time)

This creates/updates the CloudFormation stack and uploads all files:

```powershell
.\deploy-aws.ps1
```

### Upload Only (After infrastructure is created)

Use this when you only want to update website files:

```powershell
.\deploy-aws.ps1 -SkipCloudFormation
```

Or:

```powershell
npm run deploy:aws:upload-only
```

### Infrastructure Only

Use this when you only want to update the CloudFormation stack:

```powershell
.\deploy-aws.ps1 -SkipUpload
```

Or:

```powershell
npm run deploy:aws:infra-only
```

## Custom Parameters

You can customize deployment parameters:

```powershell
.\deploy-aws.ps1 -BucketName "my-custom-bucket" -StackName "my-stack" -Region "us-west-2"
```

Parameters:
- `-BucketName`: S3 bucket name (must be globally unique)
- `-StackName`: CloudFormation stack name
- `-Region`: AWS region (default: `us-east-1`)

## What Gets Deployed

### Infrastructure (CloudFormation)

The CloudFormation template (`cloudformation-template.yaml`) creates:

1. **S3 Bucket**: Stores your website files
   - Configured for static website hosting
   - Public read access
   - Versioning enabled
   - CORS configured

2. **CloudFront Distribution**: CDN for fast global delivery
   - HTTPS enabled
   - HTTP/2 and HTTP/3 support
   - IPv6 enabled
   - Custom error pages (404 → Index.html for SPA routing)
   - Compression enabled
   - Cache optimization

3. **Origin Access Identity (OAI)**: Secure access from CloudFront to S3

### Files Uploaded

All website files are synced to S3:
- HTML files
- CSS files
- JavaScript files
- Images (ImageDump, LMS PHOTOS)
- PDFs

Excluded files:
- Deployment scripts (`.ps1`, `.sh`)
- CloudFormation templates (`.yaml`, `.yml`)
- Documentation (`.md`)
- Git files (`.git/`, `.gitignore`)
- Node modules

## Post-Deployment

After deployment, you'll receive:

1. **CloudFront URL**: Your website URL (e.g., `https://d1234567890.cloudfront.net`)
2. **S3 Bucket Name**: The S3 bucket storing your files
3. **Distribution ID**: CloudFront distribution ID for cache invalidation

### Important Notes

- **Initial Deployment**: CloudFront distribution takes 5-15 minutes to fully deploy
- **Cache Invalidation**: After uploading new files, cache invalidation takes 5-15 minutes
- **Custom Domain**: To use a custom domain, you'll need to:
  1. Create an ACM certificate in `us-east-1` region
  2. Update the CloudFormation template with `DomainName` and `CertificateArn` parameters
  3. Configure Route 53 DNS records

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Create CloudFormation Stack

```powershell
aws cloudformation create-stack \
  --stack-name seva-innovations-website \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=BucketName,ParameterValue=seva-innovations-website \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM
```

### 2. Wait for Stack Creation

```powershell
aws cloudformation wait stack-create-complete \
  --stack-name seva-innovations-website \
  --region us-east-1
```

### 3. Get Stack Outputs

```powershell
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].Outputs"
```

### 4. Upload Files to S3

```powershell
aws s3 sync . s3://YOUR_BUCKET_NAME \
  --exclude "*.ps1" \
  --exclude "*.sh" \
  --exclude "*.yaml" \
  --exclude "*.md" \
  --exclude ".git/*" \
  --delete
```

### 5. Invalidate CloudFront Cache

```powershell
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Troubleshooting

### AWS CLI Not Found

**Error**: `aws: command not found`

**Solution**: Install AWS CLI from https://aws.amazon.com/cli/

### AWS Credentials Not Configured

**Error**: `Unable to locate credentials`

**Solution**: Run `aws configure` and enter your credentials

### Bucket Name Already Exists

**Error**: `BucketAlreadyExists`

**Solution**: The bucket name must be globally unique. Use a different `-BucketName` parameter

### Stack Already Exists

**Error**: `Stack already exists`

**Solution**: The script will automatically update the stack. If you want to delete it first:

```powershell
aws cloudformation delete-stack --stack-name seva-innovations-website --region us-east-1
```

### Permission Denied

**Error**: `AccessDenied` or `UnauthorizedOperation`

**Solution**: Ensure your AWS user/role has the required permissions (see Prerequisites)

## Cost Estimation

Approximate monthly costs (varies by usage):

- **S3 Storage**: ~$0.023 per GB/month
- **S3 Requests**: ~$0.005 per 1,000 requests
- **CloudFront Data Transfer**: ~$0.085 per GB (first 10 TB)
- **CloudFront Requests**: ~$0.0075 per 10,000 requests

For a typical small business website:
- **Estimated monthly cost**: $1-10 (depending on traffic)

## Security Best Practices

1. **S3 Bucket Policy**: Only allows public read access, not write
2. **CloudFront OAI**: Restricts S3 access to CloudFront only
3. **HTTPS**: Enforced via CloudFront (redirects HTTP to HTTPS)
4. **Versioning**: Enabled on S3 bucket for backup/recovery

## Updating the Website

To update website content:

```powershell
# Just upload new files (infrastructure stays the same)
.\deploy-aws.ps1 -SkipCloudFormation
```

Or manually:

```powershell
aws s3 sync . s3://YOUR_BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Custom Domain Setup

To use a custom domain (e.g., `www.sevainnovations.com`):

1. **Request ACM Certificate** (in `us-east-1` region):
   ```powershell
   aws acm request-certificate \
     --domain-name sevainnovations.com \
     --subject-alternative-names "*.sevainnovations.com" \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate**: Follow DNS validation steps

3. **Update CloudFormation Stack** with certificate ARN:
   ```powershell
   aws cloudformation update-stack \
     --stack-name seva-innovations-website \
     --template-body file://cloudformation-template.yaml \
     --parameters \
       ParameterKey=BucketName,ParameterValue=seva-innovations-website \
       ParameterKey=DomainName,ParameterValue=www.sevainnovations.com \
       ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID \
     --region us-east-1
   ```

4. **Configure Route 53**: Create CNAME record pointing to CloudFront distribution

## Support

For issues or questions:
- Check AWS CloudFormation console for stack status
- Review CloudFront distribution status in AWS Console
- Check S3 bucket permissions and configuration

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)

