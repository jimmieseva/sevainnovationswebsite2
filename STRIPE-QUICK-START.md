# Stripe Payment Quick Start Guide

## Current Status

✅ Frontend payment UI added to TactiLink page
✅ Three products configured:
   - RS-232C TactiLink Cable: $89.99
   - Extended Range Cable: $129.99
   - TactiLink Professional Kit: $199.99

## Next Steps to Enable Payments

### Step 1: Get Stripe Account & Keys

1. Sign up at https://stripe.com
2. Go to Dashboard → Developers → API keys
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### Step 2: Update Frontend

Edit `stripe-payment.js` and replace:

```javascript
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE');
```

With your actual publishable key:

```javascript
const stripe = Stripe('pk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890');
```

### Step 3: Set Up Backend API

You need to create a backend endpoint: `POST /api/create-checkout-session`

**Option A: AWS Lambda (Recommended for your AWS setup)**

See `STRIPE-BACKEND-SETUP.md` for detailed Lambda function code.

**Option B: Quick Test with Stripe CLI**

For testing, you can use Stripe's test mode without a backend initially. The fallback contact form will handle orders.

### Step 4: Update API Endpoint URL

In `stripe-payment.js`, update the fetch URL:

```javascript
const response = await fetch('https://YOUR_API_GATEWAY_URL/api/create-checkout-session', {
```

Replace with your actual API Gateway or backend URL.

## Testing

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date (e.g., 12/34)
3. Any 3-digit CVC (e.g., 123)
4. Any ZIP code

## Products Currently Configured

| Product | Price | Product ID |
|---------|-------|------------|
| RS-232C TactiLink Cable | $150.00 | `price_rs232c` |
| TactiLink Professional Kit | $3,500.00 | `price_kit` |

## Files Modified

- `tactilink.html` - Added product section with payment buttons
- `stripe-payment.js` - Payment handling logic
- `STRIPE-BACKEND-SETUP.md` - Backend setup instructions

## Fallback Behavior

If backend is not available, clicking "Purchase Now" will:
1. Scroll to contact form
2. Pre-fill with product information
3. Allow customer to place order via email/phone

This ensures customers can always place orders even if payment processing is temporarily unavailable.

## Production Checklist

- [ ] Get Stripe account and API keys
- [ ] Update `stripe-payment.js` with publishable key
- [ ] Set up backend API endpoint (Lambda/Node.js)
- [ ] Update API endpoint URL in `stripe-payment.js`
- [ ] Test with Stripe test cards
- [ ] Set up Stripe webhooks for payment events
- [ ] Switch to live keys when ready
- [ ] Update success/cancel URLs for production domain

## Support

- Stripe Docs: https://stripe.com/docs
- Backend Setup: See `STRIPE-BACKEND-SETUP.md`
- Contact: connect@seva-innovations.com
