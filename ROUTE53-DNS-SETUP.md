# Route 53 DNS Setup for www.seva-innovations.com

Based on your current Route 53 configuration, here's how to set up DNS for your CloudFront distribution.

## Current DNS Records

Your Route 53 hosted zone currently has:
- ✅ A record for `seva-innovations.com` → `54.241.195.156` (existing server)
- ✅ MX, NS, SOA records (standard DNS)
- ✅ Email records (SPF, DKIM, autodiscover, enterprise enrollment)
- ❌ **Missing**: `www` subdomain record

## Step 1: Add www CNAME Record

After deploying your CloudFront distribution, you'll need to add a CNAME record for `www`.

### In Route 53 Console:

1. Go to Route 53 → Hosted zones → `seva-innovations.com`
2. Click **"Create record"**
3. Configure:
   - **Record name**: `www`
   - **Record type**: `CNAME - Routes traffic to another domain name and some AWS resources`
   - **Value**: `d1234567890.cloudfront.net` (your CloudFront domain from deployment output)
   - **TTL**: `300` (5 minutes)
   - **Routing policy**: `Simple routing`
4. Click **"Create records"**

### Using AWS CLI:

```powershell
# Replace YOUR_CLOUDFRONT_DOMAIN with the actual domain from deployment output
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.seva-innovations.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_CLOUDFRONT_DOMAIN"}]
      }
    }]
  }'
```

**To find your Hosted Zone ID:**
```powershell
aws route53 list-hosted-zones-by-name --dns-name seva-innovations.com --query "HostedZones[0].Id" --output text
```

## Step 2: Update Root Domain (Optional but Recommended)

You have two options for the root domain (`seva-innovations.com`):

### Option A: Redirect Root to www (Recommended)

Create an S3 bucket to redirect `seva-innovations.com` → `www.seva-innovations.com`:

1. **Create S3 bucket** named exactly `seva-innovations.com`:
   ```powershell
   aws s3 mb s3://seva-innovations.com --region us-east-1
   ```

2. **Enable static website hosting with redirect**:
   ```powershell
   aws s3 website s3://seva-innovations.com \
     --index-document index.html \
     --error-document error.html \
     --region us-east-1
   
   # Create redirect configuration
   aws s3api put-bucket-website \
     --bucket seva-innovations.com \
     --website-configuration '{
       "RedirectAllRequestsTo": {
         "HostName": "www.seva-innovations.com",
         "Protocol": "https"
       }
     }' \
     --region us-east-1
   ```

3. **Update Route 53 A record** to use S3 bucket alias:
   - In Route 53, edit the existing A record for `seva-innovations.com`
   - Change Type to: **A - Routes traffic to an IPv4 address and some AWS resources**
   - Enable **Alias**
   - Alias target: Select **"S3 website endpoint"**
   - Choose region: `us-east-1`
   - Select bucket: `seva-innovations.com`
   - Click **"Save changes"**

### Option B: Point Root Domain Directly to CloudFront

If you want `seva-innovations.com` to also point to CloudFront:

1. **Update the A record** in Route 53:
   - Record name: `seva-innovations.com` (or leave blank for root)
   - Record type: **A - Routes traffic to an IPv4 address and some AWS resources**
   - Enable **Alias**: Yes
   - Alias target: **CloudFront distribution**
   - Select your CloudFront distribution
   - Click **"Save changes"**

**Note**: For Option B, ensure your SSL certificate includes both `www.seva-innovations.com` AND `seva-innovations.com` as subject alternative names.

## Step 3: Verify DNS Configuration

After making changes, verify:

### Check DNS Resolution:

```powershell
# Check www subdomain
nslookup www.seva-innovations.com

# Check root domain
nslookup seva-innovations.com
```

### Test HTTPS:

```powershell
# Test www
curl -I https://www.seva-innovations.com

# Test root (if configured)
curl -I https://seva-innovations.com
```

### Check DNS Propagation:

Visit: https://www.whatsmydns.net/#CNAME/www.seva-innovations.com

## Complete DNS Record Summary

After setup, your Route 53 records should include:

| Record Name | Type | Value | Purpose |
|------------|------|-------|---------|
| `www` | CNAME | `d1234567890.cloudfront.net` | Website (CloudFront) |
| `seva-innovations.com` | A (Alias) | S3 bucket or CloudFront | Root domain redirect |
| `seva-innovations.com` | MX | `0 sevainnovations-com01b...` | Email (keep existing) |
| `@` | TXT | `"v=spf1..."` | Email SPF (keep existing) |
| `autodiscover` | CNAME | `autodiscover.outlook.com` | Email (keep existing) |
| `selector1._domainkey` | CNAME | `selector1-sevainnovations-co...` | Email DKIM (keep existing) |
| `selector2._domainkey` | CNAME | `selector2-sevainnovations-co...` | Email DKIM (keep existing) |

## Important Notes

1. **Don't delete existing records**: Keep all email-related records (MX, SPF, DKIM, autodiscover, enterprise enrollment) as they are.

2. **Current A record**: The A record pointing to `54.241.195.156` appears to be an old server. You can:
   - Replace it with CloudFront alias (Option B above)
   - Or redirect to www using S3 (Option A above)

3. **DNS Propagation**: Changes take 5 minutes to 48 hours to propagate globally, but usually within 1-2 hours.

4. **SSL Certificate**: Ensure your ACM certificate includes:
   - `www.seva-innovations.com` (primary)
   - `seva-innovations.com` (if using root domain)

## Troubleshooting

### www Not Resolving

- Verify CNAME record is created correctly
- Check CloudFront distribution is "Deployed" (not "In Progress")
- Wait for DNS propagation (use whatsmydns.net to check)

### SSL Certificate Error

- Ensure certificate includes both `www.seva-innovations.com` and `seva-innovations.com`
- Certificate must be in `us-east-1` region
- Certificate status must be `ISSUED`

### Root Domain Not Working

- If using S3 redirect, verify bucket name is exactly `seva-innovations.com`
- If using CloudFront alias, ensure certificate includes root domain
- Check A record is configured as Alias to CloudFront/S3

## Next Steps After DNS Setup

1. ✅ Wait for DNS propagation (1-2 hours typically)
2. ✅ Test `https://www.seva-innovations.com`
3. ✅ Test `https://seva-innovations.com` (should redirect to www)
4. ✅ Verify SSL certificate is working (green padlock)
5. ✅ Test website functionality

## Quick Reference Commands

**Get Hosted Zone ID:**
```powershell
aws route53 list-hosted-zones-by-name --dns-name seva-innovations.com
```

**List Current Records:**
```powershell
aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID
```

**Get CloudFront Distribution Domain:**
```powershell
aws cloudformation describe-stacks --stack-name seva-innovations-website --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomainName'].OutputValue" --output text
```

