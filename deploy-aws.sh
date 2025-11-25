#!/bin/bash
# AWS Deployment Script for SEVA Innovations Website
# This script deploys the static website to AWS S3 and CloudFront

set -e

BUCKET_NAME="${1:-seva-innovations-website}"
STACK_NAME="${2:-seva-innovations-website}"
REGION="${3:-us-east-1}"
DOMAIN_NAME="${4:-www.seva-innovations.com}"
CERTIFICATE_ARN="${5:-}"
SKIP_CF="${6:-false}"
SKIP_UPLOAD="${7:-false}"

echo "========================================"
echo "SEVA Innovations - AWS Deployment"
echo "========================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "✗ AWS CLI not found. Please install AWS CLI first."
    echo "  Download from: https://aws.amazon.com/cli/"
    exit 1
fi

echo "✓ AWS CLI found: $(aws --version)"
echo ""

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "✗ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

echo "✓ AWS credentials configured"
echo "  $(aws sts get-caller-identity)"
echo ""

# Step 1: Deploy CloudFormation Stack
if [ "$SKIP_CF" != "true" ]; then
    echo "Step 1: Deploying CloudFormation Stack..."
    
    # Build parameters
    PARAMS="ParameterKey=BucketName,ParameterValue=$BUCKET_NAME ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME"
    
    if [ -n "$CERTIFICATE_ARN" ]; then
        PARAMS="$PARAMS ParameterKey=CertificateArn,ParameterValue=$CERTIFICATE_ARN"
        echo "  Using custom domain: $DOMAIN_NAME"
        echo "  Using certificate: $CERTIFICATE_ARN"
    else
        echo "  Warning: No certificate ARN provided. Using CloudFront default certificate."
        echo "  To use custom domain, provide CertificateArn parameter."
    fi
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
        echo "  Stack exists. Updating..."
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://cloudformation-template.yaml \
            --parameters $PARAMS \
            --region "$REGION" \
            --capabilities CAPABILITY_IAM
        
        echo "  Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
    else
        echo "  Stack does not exist. Creating..."
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://cloudformation-template.yaml \
            --parameters $PARAMS \
            --region "$REGION" \
            --capabilities CAPABILITY_IAM
        
        echo "  Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --region "$REGION"
    fi
    
    echo "✓ CloudFormation stack deployed successfully"
    echo ""
    
    # Get stack outputs
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
    
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text)
    
    echo "Stack Outputs:"
    echo "  S3 Bucket: $S3_BUCKET"
    echo "  CloudFront URL: https://$CLOUDFRONT_URL"
    echo "  Distribution ID: $DISTRIBUTION_ID"
    
    if [ -n "$CERTIFICATE_ARN" ]; then
        echo "  Custom Domain: https://$DOMAIN_NAME"
        echo ""
        echo "  ⚠ IMPORTANT: Configure DNS in Route 53:"
        echo "    Create CNAME record: $DOMAIN_NAME -> $CLOUDFRONT_URL"
    fi
else
    # Get stack outputs if skipping CloudFormation
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
    
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text)
fi

# Step 2: Upload files to S3
if [ "$SKIP_UPLOAD" != "true" ]; then
    echo ""
    echo "Step 2: Uploading files to S3..."
    
    # Sync files to S3 (excluding deployment files)
    aws s3 sync . "s3://$S3_BUCKET" \
        --region "$REGION" \
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
    
    echo "✓ Files uploaded successfully"
    
    # Step 3: Invalidate CloudFront cache
    echo ""
    echo "Step 3: Invalidating CloudFront cache..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --region "$REGION" \
        --query "Invalidation.Id" \
        --output text)
    
    if [ $? -eq 0 ]; then
        echo "✓ Cache invalidation created: $INVALIDATION_ID"
        echo "  Note: Cache invalidation may take 5-15 minutes to complete"
    else
        echo "⚠ Cache invalidation failed (non-critical)"
    fi
fi

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Your website is available at:"
if [ -n "$CERTIFICATE_ARN" ]; then
    echo "  https://$DOMAIN_NAME (after DNS configuration)"
fi
echo "  https://$CLOUDFRONT_URL"
echo ""
echo "Next steps:"
echo "  1. Wait for CloudFront distribution to be fully deployed (5-15 minutes)"
echo "  2. Test your website at the URL above"
if [ -n "$CERTIFICATE_ARN" ]; then
    echo "  3. Configure DNS in Route 53: Create CNAME record pointing $DOMAIN_NAME to $CLOUDFRONT_URL"
else
    echo "  3. To use custom domain, request ACM certificate and re-run with CertificateArn parameter"
fi
echo ""

