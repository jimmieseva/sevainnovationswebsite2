# AWS Deployment Script for SEVA Innovations Website
# This script deploys the static website to AWS S3 and CloudFront

param(
    [string]$BucketName = "seva-innovations-website",
    [string]$StackName = "seva-innovations-website",
    [string]$Region = "us-east-1",
    [string]$DomainName = "www.seva-innovations.com",
    [string]$CertificateArn = "",
    [switch]$SkipCloudFormation = $false,
    [switch]$SkipUpload = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SEVA Innovations - AWS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "  Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if AWS credentials are configured
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "AWS credentials not configured"
    }
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
    Write-Host "  $awsIdentity" -ForegroundColor Gray
} catch {
    Write-Host "✗ AWS credentials not configured. Please run 'aws configure'" -ForegroundColor Red
    exit 1
}

# Step 1: Deploy CloudFormation Stack
if (-not $SkipCloudFormation) {
    Write-Host ""
    Write-Host "Step 1: Deploying CloudFormation Stack..." -ForegroundColor Yellow
    
    # Check if stack exists
    $stackExists = aws cloudformation describe-stacks --stack-name $StackName --region $Region 2>&1
    
    # Build parameters
    $params = @(
        "ParameterKey=BucketName,ParameterValue=$BucketName",
        "ParameterKey=DomainName,ParameterValue=$DomainName"
    )
    
    if ($CertificateArn -ne "") {
        $params += "ParameterKey=CertificateArn,ParameterValue=$CertificateArn"
        Write-Host "  Using custom domain: $DomainName" -ForegroundColor Gray
        Write-Host "  Using certificate: $CertificateArn" -ForegroundColor Gray
    } else {
        Write-Host "  Warning: No certificate ARN provided. Using CloudFront default certificate." -ForegroundColor Yellow
        Write-Host "  To use custom domain, provide CertificateArn parameter." -ForegroundColor Yellow
    }
    
    $paramsString = $params -join " "
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Stack exists. Updating..." -ForegroundColor Gray
        $deployCmd = "aws cloudformation update-stack --stack-name $StackName --template-body file://cloudformation-template.yaml --parameters $paramsString --region $Region --capabilities CAPABILITY_IAM"
    } else {
        Write-Host "  Stack does not exist. Creating..." -ForegroundColor Gray
        $deployCmd = "aws cloudformation create-stack --stack-name $StackName --template-body file://cloudformation-template.yaml --parameters $paramsString --region $Region --capabilities CAPABILITY_IAM"
    }
    
    Invoke-Expression $deployCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ CloudFormation deployment failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  Waiting for stack to be ready..." -ForegroundColor Gray
    aws cloudformation wait stack-create-complete --stack-name $StackName --region $Region 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        aws cloudformation wait stack-update-complete --stack-name $StackName --region $Region 2>&1 | Out-Null
    }
    
    Write-Host "✓ CloudFormation stack deployed successfully" -ForegroundColor Green
    
    # Get stack outputs
    $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    
    $s3Bucket = ($outputs | Where-Object { $_.OutputKey -eq "S3BucketName" }).OutputValue
    $cloudFrontUrl = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteURL" }).OutputValue
    $distributionId = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
    
    Write-Host ""
    Write-Host "Stack Outputs:" -ForegroundColor Cyan
    Write-Host "  S3 Bucket: $s3Bucket" -ForegroundColor White
    Write-Host "  CloudFront URL: https://$cloudFrontUrl" -ForegroundColor White
    Write-Host "  Distribution ID: $distributionId" -ForegroundColor White
    
    if ($CertificateArn -ne "") {
        Write-Host "  Custom Domain: https://$DomainName" -ForegroundColor White
        Write-Host ""
        Write-Host "  ⚠ IMPORTANT: Configure DNS in Route 53:" -ForegroundColor Yellow
        Write-Host "    Create CNAME record: $DomainName -> $cloudFrontUrl" -ForegroundColor White
    }
} else {
    # Get stack outputs if skipping CloudFormation
    $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $s3Bucket = ($outputs | Where-Object { $_.OutputKey -eq "S3BucketName" }).OutputValue
    $cloudFrontUrl = ($outputs | Where-Object { $_.OutputKey -eq "WebsiteURL" }).OutputValue
    $distributionId = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
}

# Step 2: Upload files to S3
if (-not $SkipUpload) {
    Write-Host ""
    Write-Host "Step 2: Uploading files to S3..." -ForegroundColor Yellow
    
    # Files to upload (excluding deployment files)
    $excludePatterns = @(
        "*.ps1",
        "*.sh",
        "*.yaml",
        "*.yml",
        "*.md",
        ".git*",
        "node_modules",
        "*.log"
    )
    
    # Build sync command
    $syncCmd = "aws s3 sync . s3://$s3Bucket --region $Region --delete"
    
    foreach ($pattern in $excludePatterns) {
        $syncCmd += " --exclude `"$pattern`""
    }
    
    # Include specific directories
    $syncCmd += " --exclude `"ImageDump/*`" --include `"ImageDump/*`""
    $syncCmd += " --exclude `"LMS PHOTOS/*`" --include `"LMS PHOTOS/*`""
    $syncCmd += " --exclude `"PDFS/*`" --include `"PDFS/*`""
    
    Write-Host "  Syncing files..." -ForegroundColor Gray
    Invoke-Expression $syncCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ S3 upload failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Files uploaded successfully" -ForegroundColor Green
    
    # Step 3: Invalidate CloudFront cache
    Write-Host ""
    Write-Host "Step 3: Invalidating CloudFront cache..." -ForegroundColor Yellow
    
    $invalidationId = aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" --region $Region --query "Invalidation.Id" --output text
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Cache invalidation created: $invalidationId" -ForegroundColor Green
        Write-Host "  Note: Cache invalidation may take 5-15 minutes to complete" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Cache invalidation failed (non-critical)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your website is available at:" -ForegroundColor White
if ($CertificateArn -ne "") {
    Write-Host "  https://$DomainName (after DNS configuration)" -ForegroundColor Cyan
}
Write-Host "  https://$cloudFrontUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for CloudFront distribution to be fully deployed (5-15 minutes)" -ForegroundColor White
Write-Host "  2. Test your website at the URL above" -ForegroundColor White
if ($CertificateArn -ne "") {
    Write-Host "  3. Configure DNS in Route 53: Create CNAME record pointing $DomainName to $cloudFrontUrl" -ForegroundColor White
} else {
    Write-Host "  3. To use custom domain, request ACM certificate and re-run with CertificateArn parameter" -ForegroundColor White
}
Write-Host ""

