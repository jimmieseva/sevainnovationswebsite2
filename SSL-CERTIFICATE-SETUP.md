# SSL Certificate Setup for www.seva-innovations.com

This guide will help you set up an SSL certificate for your custom domain `www.seva-innovations.com` using AWS Certificate Manager (ACM).

## Prerequisites

- AWS Account
- Domain `seva-innovations.com` registered (can be with any registrar)
- Access to DNS records for the domain
- AWS CLI configured

## Step 1: Request SSL Certificate in ACM

**IMPORTANT**: CloudFront requires certificates to be in the `us-east-1` region.

### Option A: Using AWS CLI

```powershell
# Request certificate for www.seva-innovations.com and root domain
aws acm request-certificate \
  --domain-name www.seva-innovations.com \
  --subject-alternative-names seva-innovations.com \
  --validation-method DNS \
  --region us-east-1
```

This will return a Certificate ARN like:
```
arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

**Save this ARN** - you'll need it for deployment.

### Option B: Using AWS Console

1. Go to AWS Certificate Manager: https://console.aws.amazon.com/acm/home?region=us-east-1
2. Click "Request a certificate"
3. Select "Request a public certificate"
4. Domain names:
   - `www.seva-innovations.com`
   - `seva-innovations.com` (as alternative name)
5. Validation method: **DNS validation**
6. Click "Request"

## Step 2: Validate the Certificate

After requesting the certificate, AWS will provide DNS validation records.

### Using AWS CLI

```powershell
# Get certificate details and validation records
aws acm describe-certificate \
  --certificate-arn YOUR_CERTIFICATE_ARN \
  --region us-east-1 \
  --query "Certificate.DomainValidationOptions"
```

### Using AWS Console

1. In ACM console, click on your certificate
2. Expand "Domains" section
3. You'll see CNAME records that need to be added to your DNS

### Add DNS Validation Records

Add the CNAME records to your DNS provider (wherever `seva-innovations.com` is registered):

**Example CNAME records:**
```
_abc123def456.www.seva-innovations.com. CNAME _xyz789.abc.acm-validations.aws.
_abc123def456.seva-innovations.com. CNAME _xyz789.abc.acm-validations.aws.
```

**Where to add:**
- If using Route 53: Add to the hosted zone for `seva-innovations.com`
- If using another DNS provider: Add CNAME records in their DNS management interface

**Wait for validation** (usually 5-30 minutes). You can check status:

```powershell
aws acm describe-certificate \
  --certificate-arn YOUR_CERTIFICATE_ARN \
  --region us-east-1 \
  --query "Certificate.Status"
```

Status should be `ISSUED` when ready.

## Step 3: Deploy with Certificate

Once the certificate is validated and shows status `ISSUED`, deploy your website:

### Windows (PowerShell)

```powershell
.\deploy-aws.ps1 -CertificateArn "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
```

### Linux/Mac (Bash)

```bash
./deploy-aws.sh seva-innovations-website seva-innovations-website us-east-1 www.seva-innovations.com "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
```

Or using npm:

```powershell
npm run deploy:aws -- -CertificateArn "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
```

## Step 4: Configure Route 53 DNS

After deployment, configure DNS to point your domain to CloudFront:

### Get CloudFront Distribution Domain

From the deployment output, you'll see:
```
CloudFront URL: d1234567890.cloudfront.net
```

### Create Route 53 Record

**If using Route 53:**

1. Go to Route 53 Console: https://console.aws.amazon.com/route53/
2. Select hosted zone for `seva-innovations.com`
3. Create record:
   - **Record name**: `www`
   - **Record type**: `CNAME`
   - **Value**: `d1234567890.cloudfront.net` (your CloudFront domain)
   - **TTL**: `300` (or use alias record if available)

**Optional - Root Domain Redirect:**

To redirect `seva-innovations.com` to `www.seva-innovations.com`:

1. Create S3 bucket named exactly `seva-innovations.com`
2. Enable static website hosting with redirect to `www.seva-innovations.com`
3. Create Route 53 A record (alias) pointing to the S3 bucket

### If NOT using Route 53:

Add CNAME record in your DNS provider:
- **Name**: `www`
- **Type**: `CNAME`
- **Value**: `d1234567890.cloudfront.net` (your CloudFront domain)
- **TTL**: `300`

## Step 5: Wait for DNS Propagation

DNS changes can take up to 48 hours, but usually propagate within 1-2 hours.

Test your domain:
```powershell
# Test DNS resolution
nslookup www.seva-innovations.com

# Test HTTPS
curl -I https://www.seva-innovations.com
```

## Troubleshooting

### Certificate Status Stuck on "Pending Validation"

- Verify DNS records are correctly added
- Check for typos in CNAME records
- Wait up to 30 minutes for DNS propagation
- Ensure you're checking the certificate in `us-east-1` region

### CloudFront Distribution Shows "In Progress"

- CloudFront distributions take 5-15 minutes to deploy
- Wait for status to change to "Deployed"
- Check CloudFront console for any errors

### Domain Not Resolving

- Verify DNS records are correct
- Check DNS propagation: https://www.whatsmydns.net/
- Ensure CNAME points to correct CloudFront domain
- Wait for DNS propagation (can take up to 48 hours)

### SSL Certificate Error

- Ensure certificate is in `us-east-1` region
- Verify certificate includes both `www.seva-innovations.com` and `seva-innovations.com`
- Check certificate status is `ISSUED`
- Verify CloudFront distribution is using the correct certificate ARN

## Quick Reference

**Certificate ARN Format:**
```
arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID
```

**CloudFront Domain Format:**
```
dXXXXXXXXXXXX.cloudfront.net
```

**Deployment Command:**
```powershell
.\deploy-aws.ps1 -DomainName "www.seva-innovations.com" -CertificateArn "YOUR_CERT_ARN"
```

## Next Steps

After DNS is configured and propagated:
1. ✅ Your site will be available at `https://www.seva-innovations.com`
2. ✅ SSL certificate will be automatically renewed by AWS
3. ✅ CloudFront will cache your content globally
4. ✅ HTTPS will be enforced automatically

For updates to your website, use:
```powershell
npm run deploy:aws:upload-only
```

