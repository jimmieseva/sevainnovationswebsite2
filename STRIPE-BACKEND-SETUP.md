# Stripe Backend Setup Guide for TactiLink E-Commerce

This guide explains how to configure Stripe payments for the TactiLink website.

## Quick Start

### Step 1: Get Your Stripe API Keys

1. Create a Stripe account at https://stripe.com
2. Go to https://dashboard.stripe.com/apikeys
3. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
4. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

> ⚠️ **Never expose your Secret Key** in frontend code or commit it to Git!

### Step 2: Configure the Frontend

Edit `config.js` in the project root:

```javascript
const SevaConfig = {
  // Change from 'demo' to 'test' for testing, 'live' for production
  PAYMENT_MODE: 'test',  // Options: 'demo' | 'test' | 'live'

  STRIPE_KEYS: {
    test: 'pk_test_YOUR_ACTUAL_TEST_KEY_HERE',
    live: 'pk_live_YOUR_ACTUAL_LIVE_KEY_HERE'
  },

  API_ENDPOINTS: {
    test: 'https://YOUR_API_GATEWAY_URL/api/create-checkout-session',
    live: 'https://YOUR_PRODUCTION_API_URL/api/create-checkout-session'
  },
  // ... rest of config
};
```

### Step 3: Deploy the Backend

Choose one of these options:

---

## Option A: AWS Lambda + API Gateway (Recommended)

Best for static sites hosted on S3/CloudFront.

### 1. Create Lambda Function

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm init -y
npm install stripe

# Zip the function
zip -r lambda-function.zip node_modules/ lambda-stripe-checkout.js
```

### 2. Deploy to AWS

**Via AWS Console:**
1. Go to AWS Lambda Console → Create function
2. Name: `tactilink-stripe-checkout`
3. Runtime: Node.js 18.x or 20.x
4. Upload the zip file
5. Set handler to `lambda-stripe-checkout.handler`

**Set Environment Variables:**
- `STRIPE_SECRET_KEY`: `sk_test_YOUR_SECRET_KEY` (or `sk_live_` for production)
- `ALLOWED_ORIGINS`: `https://seva-innovations.com,https://www.seva-innovations.com`

### 3. Create API Gateway

1. Go to API Gateway Console → Create API → REST API
2. Create resource: `/api`
3. Create resource under `/api`: `/create-checkout-session`
4. Create method: `POST`
5. Integration type: Lambda Function
6. Select your Lambda function
7. Enable CORS on the resource
8. Deploy API to a stage (e.g., `prod`)

### 4. Update config.js

```javascript
API_ENDPOINTS: {
  test: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/create-checkout-session',
  live: 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/create-checkout-session'
}
```

---

## Option B: Vercel Serverless Function

Best if already using Vercel for hosting.

### 1. Create API Route

Create file `api/create-checkout-session.js`:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lineItems, successUrl, cancelUrl } = req.body;

    const stripeLineItems = lineItems.map(item => ({
      price_data: {
        currency: item.currency || 'usd',
        product_data: {
          name: item.productName,
          description: item.productDescription
        },
        unit_amount: item.amount
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    res.status(200).json({ id: session.id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 2. Set Environment Variable

In Vercel dashboard → Settings → Environment Variables:
- `STRIPE_SECRET_KEY`: Your Stripe secret key

### 3. Update config.js

```javascript
API_ENDPOINTS: {
  test: '/api/create-checkout-session',
  live: '/api/create-checkout-session'
}
```

---

## Option C: Node.js/Express Server

For custom server deployments.

### 1. Create Server

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { lineItems, successUrl, cancelUrl, customerEmail } = req.body;

    const stripeLineItems = lineItems.map(item => ({
      price_data: {
        currency: item.currency || 'usd',
        product_data: {
          name: item.productName,
          description: item.productDescription
        },
        unit_amount: item.amount
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail
    });

    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 2. Deploy and Update config.js

Deploy to your server and update the API endpoint URL in `config.js`.

---

## Testing

### Test Card Numbers

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Card declined |
| 4000 0027 6000 3184 | 3D Secure required |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any valid ZIP (e.g., 78701)

### Test Checklist

1. ✅ Set `PAYMENT_MODE: 'test'` in config.js
2. ✅ Add test publishable key to config.js
3. ✅ Deploy backend with test secret key
4. ✅ Test adding items to cart
5. ✅ Test checkout flow with test card
6. ✅ Verify success redirect
7. ✅ Verify cancel redirect

---

## Going Live

### Pre-Launch Checklist

1. [ ] Switch Stripe dashboard to Live mode
2. [ ] Get Live API keys from Stripe
3. [ ] Update `STRIPE_SECRET_KEY` environment variable with live key
4. [ ] Update `config.js`:
   - Set `PAYMENT_MODE: 'live'`
   - Add live publishable key
5. [ ] Test with a real card (small amount)
6. [ ] Set up Stripe webhooks for order fulfillment
7. [ ] Configure email notifications

### Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Use HTTPS** for all API endpoints
3. **Validate amounts** on the backend (don't trust client)
4. **Set up webhooks** to verify payments server-side
5. **Implement rate limiting** on your API
6. **Log all transactions** for auditing

---

## Webhooks (Optional)

Set up webhooks to handle post-payment events:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-api-url/webhook`
3. Select events: `checkout.session.completed`, `payment_intent.payment_failed`
4. Copy webhook signing secret
5. Add `STRIPE_WEBHOOK_SECRET` environment variable to backend

Use `exports.webhookHandler` in `backend/lambda-stripe-checkout.js` for the webhook endpoint.

---

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- SEVA Support: connect@seva-innovations.com
