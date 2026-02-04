# Admin & Customer Account System

## Overview

This system provides:
1. **Admin Dashboard** - Manage orders, view statistics, and update order statuses
2. **Customer Account Portal** - Customers can view their order history and track shipments

## Files Created

### Core System Files
- `auth.js` - Authentication system for admin and customer login
- `order-management.js` - Order storage and management system
- `admin.js` - Admin dashboard functionality
- `customer-account.js` - Customer account functionality

### Pages
- `admin.html` - Admin dashboard page
- `customer-login.html` - Customer login and account page

## Admin Access

### Default Credentials
- **Email:** admin@seva-innovations.com
- **Password:** admin123

⚠️ **IMPORTANT:** Change the default password in production!

### Admin Features
1. **Dashboard**
   - View order statistics (total, pending, processing, revenue)
   - See recent orders
   - Real-time updates

2. **Order Management**
   - View all orders
   - Filter by status (pending, processing, shipped, delivered, cancelled)
   - Update order status
   - Add tracking numbers
   - View detailed order information

3. **Customer Management**
   - View all customers
   - See customer order history
   - View total spent per customer

4. **Settings**
   - Change admin password

### Accessing Admin Panel
1. Navigate to `admin.html` or click "Admin" from the Account dropdown
2. Enter admin credentials
3. Access the dashboard

## Customer Access

### How Customers Login
1. Customers navigate to `customer-login.html` or click "My Account" from the Account dropdown
2. Enter the email address used when placing orders
3. View their order history and status

### Customer Features
1. **Order History**
   - View all past orders
   - See order status with visual timeline
   - Track shipments with tracking numbers
   - View order details

2. **Account Summary**
   - Total orders count
   - Pending orders count
   - Delivered orders count

## Order Status Flow

1. **Pending** - Order placed, awaiting processing
2. **Processing** - Order being prepared
3. **Shipped** - Order shipped (can add tracking number)
4. **Delivered** - Order delivered
5. **Cancelled** - Order cancelled

## Order Storage

Currently uses **localStorage** for demo purposes. Orders are stored in the browser's local storage.

### Order Data Structure
```javascript
{
  id: "SEVA-1001",
  orderNumber: "SEVA-1001",
  timestamp: "2025-01-XX...",
  date: "January XX, 2025",
  status: "pending",
  customer: {
    name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567"
  },
  deliveryAddress: { ... },
  items: [ ... ],
  subtotal: 15000,
  total: 15000,
  trackingNumber: "",
  ...
}
```

## Integration with Checkout

The checkout process automatically:
1. Creates an order when payment is completed
2. Saves order to localStorage
3. Displays order number to customer
4. Clears shopping cart

## Production Considerations

### Backend Migration
For production, you should:
1. Replace localStorage with a backend database (PostgreSQL, MongoDB, etc.)
2. Implement proper authentication (JWT tokens, sessions)
3. Add API endpoints for:
   - Order creation
   - Order retrieval
   - Status updates
   - Customer authentication

### Security
1. **Change default admin password** immediately
2. Implement proper password hashing (bcrypt, etc.)
3. Use HTTPS in production
4. Add rate limiting for login attempts
5. Implement CSRF protection
6. Validate all inputs server-side

### Database Schema Suggestions
```sql
-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  status VARCHAR(50),
  total INTEGER,
  created_at TIMESTAMP,
  ...
);

-- Order items table
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id VARCHAR(100),
  quantity INTEGER,
  price INTEGER,
  ...
);
```

## Usage Examples

### Admin: Update Order Status
1. Go to Admin Dashboard → Orders
2. Find the order
3. Click "Update Status" dropdown
4. Select new status
5. If shipping, enter tracking number when prompted

### Customer: View Order Status
1. Go to Customer Login page
2. Enter email address
3. View order list with status badges
4. Click "View Details" for full order information
5. See order timeline showing progress

## Troubleshooting

### Admin can't login
- Check that you're using the correct email: `admin@seva-innovations.com`
- Default password is `admin123`
- Clear browser cache/localStorage if needed

### Customer can't see orders
- Ensure they're using the exact email address from their order
- Check that orders exist in localStorage
- Verify order was created during checkout

### Orders not saving
- Check browser console for errors
- Ensure `order-management.js` is loaded before checkout
- Verify localStorage is enabled in browser

## Future Enhancements

Potential features to add:
- Email notifications for order status changes
- Export orders to CSV/PDF
- Advanced search and filtering
- Order notes/comments
- Product management interface
- Inventory tracking
- Shipping label generation
- Customer communication tools
