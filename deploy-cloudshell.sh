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


