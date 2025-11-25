# Quick Start: Deploy to AWS

## Prerequisites Checklist

- [ ] AWS Account created
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] PowerShell (Windows) or Bash (Linux/Mac) available
- [ ] SSL Certificate requested in ACM (for custom domain) - See [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md)

## One-Command Deployment

### Basic Deployment (CloudFront URL only)

**Windows:**
```powershell
npm run deploy:aws
```

**Linux/Mac:**
```bash
chmod +x deploy-aws.sh
npm run deploy:aws:linux
```

### Deployment with Custom Domain (www.seva-innovations.com)

**First, set up SSL certificate** - See [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md)

Then deploy with certificate:

**Windows:**
```powershell
.\deploy-aws.ps1 -CertificateArn "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
```

**Linux/Mac:**
```bash
./deploy-aws.sh seva-innovations-website seva-innovations-website us-east-1 www.seva-innovations.com "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
```

## What Happens

1. ✅ Creates S3 bucket for your website
2. ✅ Creates CloudFront CDN distribution
3. ✅ Configures custom domain (if certificate provided)
4. ✅ Uploads all website files
5. ✅ Invalidates CloudFront cache
6. ✅ Provides your website URL

## Your Website URL

After deployment, you'll see:
```
Your website is available at:
  https://www.seva-innovations.com (after DNS configuration)
  https://d1234567890.cloudfront.net
```

**Note**: 
- First deployment takes 5-15 minutes for CloudFront to fully activate
- If using custom domain, configure DNS in Route 53 after deployment

## DNS Configuration

After deployment with certificate, configure DNS in Route 53:

1. Get CloudFront domain from deployment output
2. Create CNAME record in Route 53:
   - **Name**: `www`
   - **Type**: `CNAME`
   - **Value**: `d1234567890.cloudfront.net`

**Note**: You already have Route 53 hosted zone for `seva-innovations.com`. You just need to add the `www` CNAME record.

See [ROUTE53-DNS-SETUP.md](./ROUTE53-DNS-SETUP.md) for detailed DNS setup instructions based on your current Route 53 configuration.

## Updating Your Website

To update content after initial deployment:

```powershell
npm run deploy:aws:upload-only
```

## Need Help?

- **SSL Certificate Setup**: [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md)
- **Full Documentation**: [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md)

