/**
 * Stripe Checkout API - Backend Handler
 * 
 * IMPORTANT: Prices received from frontend come from admin panel settings.
 * The admin sets prices in site-content.js -> shopping-cart.js reads them ->
 * stripe-checkout.js sends them here -> Stripe charges the customer.
 * 
 * Deploy this to:
 * - AWS Lambda + API Gateway
 * - Vercel Serverless Functions
 * - Node.js/Express server
 * 
 * SETUP:
 * 1. npm install stripe
 * 2. Set STRIPE_SECRET_KEY environment variable
 * 3. Deploy and get your API URL
 * 4. Update stripe-checkout.js with your API URL
 */

// For AWS Lambda
exports.handler = async (event) => {
  // Initialize Stripe with secret key from environment
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { lineItems, successUrl, cancelUrl } = body;

    if (!lineItems || lineItems.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No items provided' })
      };
    }

    // Log received items (prices come from admin panel)
    console.log('Creating checkout session with items:');
    let totalAmount = 0;
    lineItems.forEach(item => {
      console.log(`  ${item.name}: $${(item.amount / 100).toFixed(2)} x ${item.quantity}`);
      totalAmount += item.amount * item.quantity;
    });
    console.log(`Total: $${(totalAmount / 100).toFixed(2)}`);

    // Create Stripe line items - amount is in cents from admin settings
    const stripeLineItems = lineItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || undefined
        },
        unit_amount: item.amount // Price in cents from admin panel
      },
      quantity: item.quantity
    }));

    // Create Checkout Session with admin-configured prices
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: successUrl || 'https://seva-innovations.com/tactilink.html?payment=success',
      cancel_url: cancelUrl || 'https://seva-innovations.com/tactilink.html?payment=cancel',
      // Optional: Add metadata for order tracking
      metadata: {
        source: 'tactilink_store',
        item_count: lineItems.length.toString(),
        total_cents: totalAmount.toString()
      }
    });

    console.log('Checkout session created:', session.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};


// For Vercel Serverless Functions (api/create-checkout-session.js)
// Export this if using Vercel:
/*
export default async function handler(req, res) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
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
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description
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

    res.json({ id: session.id });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
*/


// For Express.js server:
/*
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { lineItems, successUrl, cancelUrl } = req.body;

    const stripeLineItems = lineItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description
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

    res.json({ id: session.id });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server on port 3000'));
*/
