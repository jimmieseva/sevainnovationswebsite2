# Troubleshooting CloudFormation Stack Failure

The stack failed to create. Check what went wrong:

## Step 1: Check Stack Events

```bash
aws cloudformation describe-stack-events \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --max-items 20 \
  --query "StackEvents[?ResourceStatus=='CREATE_FAILED']"
```

## Step 2: Check Stack Status

```bash
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "Stacks[0].[StackStatus,StackStatusReason]"
```

## Step 3: Common Issues and Fixes

### Issue: Bucket Name Already Exists
**Error**: `BucketAlreadyExists`

**Fix**: The bucket name must be globally unique. Update the bucket name parameter:

```bash
aws cloudformation delete-stack \
  --stack-name seva-innovations-website \
  --region us-east-1

# Wait for deletion, then redeploy with different bucket name
./deploy-cloudshell.sh
```

Or modify the CloudFormation template to use a more unique name.

### Issue: IAM Permissions
**Error**: `AccessDenied` or `UnauthorizedOperation`

**Fix**: Ensure your IAM role has permissions for:
- CloudFormation
- S3
- CloudFront
- IAM (for creating OAC)

### Issue: Invalid Template
**Error**: `Template format error`

**Fix**: Validate the template:

```bash
aws cloudformation validate-template \
  --template-body file://cloudformation-template.yaml \
  --region us-east-1
```

### Issue: Region Mismatch
**Error**: Certificate or resource in wrong region

**Fix**: Ensure everything is in `us-east-1`:

```bash
aws configure set region us-east-1
```

## Step 4: Delete Failed Stack and Retry

```bash
# Delete the failed stack
aws cloudformation delete-stack \
  --stack-name seva-innovations-website \
  --region us-east-1

# Wait for deletion (check status)
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 2>&1 | grep -i "does not exist"

# Once deleted, retry deployment
./deploy-cloudshell.sh
```

## Quick Diagnostic Commands

```bash
# Get the exact error message
aws cloudformation describe-stack-events \
  --stack-name seva-innovations-website \
  --region us-east-1 \
  --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[LogicalResourceId,ResourceStatusReason]" \
  --output table

# Check if stack still exists
aws cloudformation describe-stacks \
  --stack-name seva-innovations-website \
  --region us-east-1 2>&1
```


