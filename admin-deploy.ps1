# Admin Deployment Script for SEVA Innovations Website
# This script runs as administrator and handles the complete deployment process

param(
    [string]$CertificateArn = "",
    [switch]$SkipPrerequisites = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SEVA Innovations - Admin Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: Not running as administrator" -ForegroundColor Yellow
    Write-Host "  Some operations may require elevated permissions" -ForegroundColor Gray
}

# Step 1: Check Prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Yellow
Write-Host ""

$prerequisitesMet = $true

# Check AWS CLI
Write-Host "Checking AWS CLI..." -ForegroundColor Gray
try {
    $awsVersion = aws --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] AWS CLI installed: $awsVersion" -ForegroundColor Green
    } else {
        throw "AWS CLI not found"
    }
} catch {
    Write-Host "  [FAIL] AWS CLI not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Installing AWS CLI..." -ForegroundColor Yellow
    
    # Download and install AWS CLI
    $installerUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
    $installerPath = "$env:TEMP\AWSCLIV2.msi"
    
    try {
        Write-Host "  Downloading AWS CLI installer..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "  Installing AWS CLI (this may take a few minutes)..." -ForegroundColor Gray
        Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /quiet /norestart" -Wait -NoNewWindow
        
        # Refresh PATH
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
        $userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
        $env:Path = "$machinePath;$userPath"
        
        # Verify installation
        Start-Sleep -Seconds 5
        $awsVersion = aws --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] AWS CLI installed successfully: $awsVersion" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] AWS CLI installation may have failed. Please install manually." -ForegroundColor Red
            Write-Host "  Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
            $prerequisitesMet = $false
        }
    } catch {
        Write-Host "  [FAIL] Failed to install AWS CLI automatically" -ForegroundColor Red
        Write-Host "  Please install manually from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
        Write-Host "  Error: $_" -ForegroundColor Red
        $prerequisitesMet = $false
    }
}

if (-not $prerequisitesMet -and -not $SkipPrerequisites) {
    Write-Host ""
    Write-Host "Prerequisites not met. Please install AWS CLI and run again." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Gray
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] AWS credentials configured" -ForegroundColor Green
        $identityObj = $awsIdentity | ConvertFrom-Json
        Write-Host "    Account: $($identityObj.Account)" -ForegroundColor Gray
        Write-Host "    User/Role: $($identityObj.Arn)" -ForegroundColor Gray
    } else {
        throw "AWS credentials not configured"
    }
} catch {
    Write-Host "  [FAIL] AWS credentials not configured" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please configure AWS credentials:" -ForegroundColor Yellow
    Write-Host "    1. Run: aws configure" -ForegroundColor White
    Write-Host "    2. Enter your AWS Access Key ID" -ForegroundColor White
    Write-Host "    3. Enter your AWS Secret Access Key" -ForegroundColor White
    Write-Host "    4. Enter default region (us-east-1 recommended)" -ForegroundColor White
    Write-Host "    5. Enter default output format (json recommended)" -ForegroundColor White
    Write-Host ""
    
    $configure = Read-Host "Would you like to configure AWS credentials now? (y/n)"
    if ($configure -eq "y" -or $configure -eq "Y") {
        aws configure
        Write-Host ""
        Write-Host "Verifying credentials..." -ForegroundColor Gray
        $awsIdentity = aws sts get-caller-identity 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] AWS credentials verified" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Credential verification failed" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  Deployment cannot proceed without AWS credentials" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 2: Check SSL Certificate (if custom domain)
if ($CertificateArn -ne "") {
    Write-Host "Step 2: Verifying SSL Certificate..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $certStatus = aws acm describe-certificate --certificate-arn $CertificateArn --region us-east-1 --query "Certificate.Status" --output text 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($certStatus -eq "ISSUED") {
                Write-Host "  [OK] SSL Certificate is valid and issued" -ForegroundColor Green
            } else {
                Write-Host "  [WARN] SSL Certificate status: $certStatus" -ForegroundColor Yellow
                Write-Host "  Certificate must be ISSUED before deployment" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [WARN] Could not verify certificate status" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [WARN] Could not verify certificate: $_" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 3: Deploy Infrastructure and Files
Write-Host "Step 3: Deploying to AWS..." -ForegroundColor Yellow
Write-Host ""

# Build deployment command
$deployParams = @{
    DomainName = "www.seva-innovations.com"
}

if ($CertificateArn -ne "") {
    $deployParams.CertificateArn = $CertificateArn
    Write-Host "  Deploying with custom domain: www.seva-innovations.com" -ForegroundColor Gray
    Write-Host "  Using certificate: $CertificateArn" -ForegroundColor Gray
} else {
    Write-Host "  Deploying without custom domain (will use CloudFront default URL)" -ForegroundColor Gray
    Write-Host "  To use custom domain, provide -CertificateArn parameter" -ForegroundColor Yellow
}

Write-Host ""

# Run deployment script
try {
    if ($CertificateArn -ne "") {
        & .\deploy-aws.ps1 -CertificateArn $CertificateArn
    } else {
        & .\deploy-aws.ps1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "[SUCCESS] Deployment Completed!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[FAIL] Deployment failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "[FAIL] Deployment failed: $_" -ForegroundColor Red
    Write-Host "  Error details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 5-15 minutes for CloudFront distribution to fully deploy" -ForegroundColor White
Write-Host "  2. If using custom domain, configure DNS in Route 53" -ForegroundColor White
Write-Host "  3. Test your website at the provided URL" -ForegroundColor White
Write-Host ""
