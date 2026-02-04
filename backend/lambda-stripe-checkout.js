/**
 * AWS Lambda Function for Stripe Checkout Session Creation
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Create a new Lambda function in AWS Console
 * 2. Set runtime to Node.js 18.x or 20.x
 * 3. Upload this file as index.js (or use inline editor)
 * 4. Install stripe package: npm install stripe
 * 5. Set environment variables:
 *    - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 *    - ALLOWED_ORIGINS: Comma-separated list of allowed origins (e.g., https://seva-innovations.com)
 * 6. Create API Gateway endpoint pointing to this Lambda
 * 7. Enable CORS on API Gateway
 * 8. Update config.js with your API Gateway URL
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Allowed origins for CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

/**
 * Get CORS headers for response
 */
function getCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes('*') ? '*' : 
    (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

/**
 * Lambda handler function
 */
exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '*';
  const headers = getCorsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { lineItems, successUrl, cancelUrl, customerEmail, metadata } = body;

    // Validate required fields
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'lineItems array is required' })
      };
    }

    // Validate each line item
    for (const item of lineItems) {
      if (!item.productName || !item.amount || !item.quantity) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Each line item must have productName, amount, and quantity' 
          })
        };
      }
      
      // Validate amount is positive integer (cents)
      if (!Number.isInteger(item.amount) || item.amount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Amount must be a positive integer (in cents)' 
          })
        };
      }
    }

    // Build Stripe line items
    const stripeLineItems = lineItems.map(item => ({
      price_data: {
        currency: item.currency || 'usd',
        product_data: {
          name: item.productName,
          description: item.productDescription || undefined,
          metadata: {
            productId: item.productId || undefined,
            sku: item.sku || undefined
          }
        },
        unit_amount: item.amount
      },
      quantity: item.quantity
    }));

    // Get origin for redirect URLs
    const requestOrigin = event.headers?.origin || event.headers?.Origin || 'https://seva-innovations.com';
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: successUrl || `${requestOrigin}/tactilink.html?payment=success`,
      cancel_url: cancelUrl || `${requestOrigin}/tactilink.html?payment=canceled`,
      customer_email: customerEmail || undefined,
      metadata: {
        source: 'tactilink-website',
        ...(metadata || {})
      },
      // Optional: Enable shipping address collection
      // shipping_address_collection: {
      //   allowed_countries: ['US', 'CA']
      // },
      // Optional: Add shipping options
      // shipping_options: [
      //   {
      //     shipping_rate_data: {
      //       type: 'fixed_amount',
      //       fixed_amount: { amount: 0, currency: 'usd' },
      //       display_name: 'Free shipping',
      //       delivery_estimate: {
      //         minimum: { unit: 'business_day', value: 5 },
      //         maximum: { unit: 'business_day', value: 7 }
      //       }
      //     }
      //   }
      // ]
    });

    // Return session ID
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        id: session.id,
        url: session.url // Optional: direct URL for redirection
      })
    };

  } catch (error) {
    console.error('Stripe error:', error);

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request to payment processor' })
      };
    }

    // Generic error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Payment processing error. Please try again or contact support.' 
      })
    };
  }
};

/**
 * Webhook handler for Stripe events (optional - for order fulfillment)
 * Deploy as a separate Lambda function
 */
exports.webhookHandler = async (event) => {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return { statusCode: 500, body: 'Webhook secret not configured' };
  }

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      console.log('Payment successful:', session.id);
      // TODO: Fulfill the order
      // - Send confirmation email
      // - Update order database
      // - Trigger shipping process
      break;
      
    case 'payment_intent.payment_failed':
      const failedIntent = stripeEvent.data.object;
      console.log('Payment failed:', failedIntent.id);
      // TODO: Handle failed payment
      // - Notify customer
      // - Log for analytics
      break;
      
    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
