# Domain Configuration: www.seva-innovations.com

This document summarizes the custom domain configuration for your AWS deployment.

## Current Configuration

- **Domain**: `www.seva-innovations.com`
- **Default in CloudFormation**: Yes (pre-configured)
- **SSL Certificate**: Required (must be set up separately)

## Deployment Options

### Option 1: Deploy Without SSL Certificate (Temporary)

Use CloudFront default URL for initial testing:

```powershell
npm run deploy:aws
```

This will deploy to: `https://d1234567890.cloudfront.net`

### Option 2: Deploy With Custom Domain (Recommended)

**Step 1**: Request SSL certificate (see [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md))

**Step 2**: Deploy with certificate ARN:

```powershell
.\deploy-aws.ps1 -CertificateArn "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
```

**Step 3**: Configure DNS in Route 53 (see instructions below)

## DNS Configuration

After deployment with certificate, you need to configure DNS:

### If Using Route 53

1. Go to Route 53 Console
2. Select hosted zone for `seva-innovations.com`
3. Create CNAME record:
   - **Name**: `www`
   - **Type**: `CNAME`
   - **Value**: `d1234567890.cloudfront.net` (from deployment output)
   - **TTL**: `300`

### If Using Another DNS Provider

Add CNAME record:
- **Host**: `www`
- **Type**: `CNAME`
- **Points to**: `d1234567890.cloudfront.net`
- **TTL**: `300`

## CloudFormation Template Settings

The template is pre-configured with:
- **DomainName**: `www.seva-innovations.com` (default parameter)
- **Conditional SSL**: Uses ACM certificate when provided
- **Aliases**: Automatically adds domain to CloudFront distribution
- **HTTPS**: Enforced via CloudFront

## Verification Steps

1. **Check Certificate Status**:
   ```powershell
   aws acm describe-certificate --certificate-arn YOUR_ARN --region us-east-1 --query "Certificate.Status"
   ```
   Should return: `ISSUED`

2. **Check CloudFront Distribution**:
   ```powershell
   aws cloudformation describe-stacks --stack-name seva-innovations-website --region us-east-1 --query "Stacks[0].Outputs"
   ```

3. **Test DNS Resolution**:
   ```powershell
   nslookup www.seva-innovations.com
   ```

4. **Test HTTPS**:
   ```powershell
   curl -I https://www.seva-innovations.com
   ```

## Troubleshooting

### Domain Not Working

- Verify DNS CNAME record is correct
- Check DNS propagation: https://www.whatsmydns.net/
- Ensure CloudFront distribution is "Deployed" (not "In Progress")
- Verify certificate includes `www.seva-innovations.com`

### SSL Certificate Errors

- Certificate must be in `us-east-1` region
- Certificate must be validated (status: `ISSUED`)
- Certificate must include both `www.seva-innovations.com` and `seva-innovations.com`

### CloudFront Not Updating

- Wait 5-15 minutes for distribution to deploy
- Check CloudFront console for errors
- Verify certificate ARN is correct in stack parameters

## Next Steps

1. ✅ Request SSL certificate in ACM (us-east-1)
2. ✅ Validate certificate via DNS
3. ✅ Deploy with certificate ARN
4. ✅ Configure DNS CNAME record
5. ✅ Wait for DNS propagation (1-48 hours)
6. ✅ Test website at https://www.seva-innovations.com

## Support

- **SSL Setup**: [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md)
- **Full Deployment Guide**: [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md)
- **Quick Start**: [QUICK-START-AWS.md](./QUICK-START-AWS.md)

