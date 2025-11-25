# AWS Deployment Checklist for www.seva-innovations.com

Follow these steps in order to deploy your website to AWS.

## ✅ Prerequisites

- [ ] AWS Account active
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] Route 53 hosted zone exists for `seva-innovations.com` ✅ (You already have this!)

## Step 1: Request SSL Certificate

- [ ] Request certificate in ACM (us-east-1 region):
  ```powershell
  aws acm request-certificate `
    --domain-name www.seva-innovations.com `
    --subject-alternative-names seva-innovations.com `
    --validation-method DNS `
    --region us-east-1
  ```
- [ ] Save the Certificate ARN returned

## Step 2: Validate Certificate

- [ ] Get DNS validation records:
  ```powershell
  aws acm describe-certificate `
    --certificate-arn YOUR_CERT_ARN `
    --region us-east-1 `
    --query "Certificate.DomainValidationOptions"
  ```
- [ ] Add CNAME validation records to Route 53
- [ ] Wait for certificate status to become `ISSUED` (check every few minutes)
- [ ] Verify certificate status:
  ```powershell
  aws acm describe-certificate `
    --certificate-arn YOUR_CERT_ARN `
    --region us-east-1 `
    --query "Certificate.Status"
  ```
  Should return: `ISSUED`

## Step 3: Deploy Infrastructure

- [ ] Deploy CloudFormation stack with certificate:
  ```powershell
  .\deploy-aws.ps1 -CertificateArn "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID"
  ```
- [ ] Wait for stack creation/update to complete (5-15 minutes)
- [ ] Save CloudFront distribution domain from output (e.g., `d1234567890.cloudfront.net`)

## Step 4: Configure DNS in Route 53

- [ ] Go to Route 53 → Hosted zones → `seva-innovations.com`
- [ ] Create new record:
  - **Record name**: `www`
  - **Record type**: `CNAME`
  - **Value**: `d1234567890.cloudfront.net` (from Step 3)
  - **TTL**: `300`
- [ ] Save record

**Optional - Root Domain Redirect:**
- [ ] Create S3 bucket named `seva-innovations.com` for redirect
- [ ] Configure S3 bucket website redirect to `www.seva-innovations.com`
- [ ] Update existing A record for `seva-innovations.com` to alias to S3 bucket

## Step 5: Verify Deployment

- [ ] Wait for DNS propagation (1-2 hours, check with whatsmydns.net)
- [ ] Test `https://www.seva-innovations.com` (should show your website)
- [ ] Test `https://seva-innovations.com` (should redirect to www if configured)
- [ ] Verify SSL certificate (green padlock in browser)
- [ ] Test website functionality

## Step 6: Update Website Content (Future)

When you need to update website files:

```powershell
npm run deploy:aws:upload-only
```

## Troubleshooting

### Certificate Not Validating
- Check CNAME records are correct in Route 53
- Verify no typos in validation records
- Wait up to 30 minutes for DNS propagation

### www Not Resolving
- Verify CNAME record exists in Route 53
- Check CloudFront distribution is "Deployed"
- Wait for DNS propagation

### SSL Certificate Error
- Ensure certificate is in `us-east-1` region
- Verify certificate includes both `www.seva-innovations.com` and `seva-innovations.com`
- Check certificate status is `ISSUED`

## Quick Reference

**Get CloudFront Domain:**
```powershell
aws cloudformation describe-stacks `
  --stack-name seva-innovations-website `
  --region us-east-1 `
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" `
  --output text
```

**Get Hosted Zone ID:**
```powershell
aws route53 list-hosted-zones-by-name `
  --dns-name seva-innovations.com `
  --query "HostedZones[0].Id" `
  --output text
```

**Check Certificate Status:**
```powershell
aws acm describe-certificate `
  --certificate-arn YOUR_CERT_ARN `
  --region us-east-1 `
  --query "Certificate.Status" `
  --output text
```

## Documentation

- **SSL Certificate Setup**: [SSL-CERTIFICATE-SETUP.md](./SSL-CERTIFICATE-SETUP.md)
- **Route 53 DNS Setup**: [ROUTE53-DNS-SETUP.md](./ROUTE53-DNS-SETUP.md)
- **Full Deployment Guide**: [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md)

