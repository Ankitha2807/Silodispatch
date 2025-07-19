const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_AzaxT5qLnCuqBZ',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;
    console.log('Creating Razorpay order with:', { amount, currency, receipt, notes });
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const options = {
      amount: Math.round(amount * 100), // amount in paise, ensure it's an integer
      currency: currency.toUpperCase(),
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: notes || {}
    };
    console.log('Razorpay options:', options);
    
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);
    res.json(order);
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      description: err.description
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create Razorpay order';
    if (err.code === 'BAD_REQUEST_ERROR') {
      errorMessage = 'Invalid request parameters';
    } else if (err.code === 'AUTHENTICATION_ERROR') {
      errorMessage = 'Authentication failed - check your API keys';
    } else if (err.code === 'RATE_LIMIT_ERROR') {
      errorMessage = 'Too many requests - please try again later';
    }
    
    res.status(500).json({ error: errorMessage, details: err.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
    
    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
      .update(text)
      .digest('hex');
    
    if (signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Create payment record
    const payment = new Payment({
      orderId: orderId,
      method: 'UPI',
      amount: order.amount,
      status: 'CONFIRMED'
    });
    await payment.save();
    
    // Update order status if needed
    if (order.status === 'ASSIGNED') {
      order.status = 'DELIVERED';
      await order.save();
    }
    
    res.json({ message: 'Payment verified successfully', payment });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ message: 'Payment verification failed', error: err.message });
  }
});

// Test endpoint to check Razorpay configuration
router.get('/test', async (req, res) => {
  try {
    console.log('Testing Razorpay configuration...');
    console.log('Key ID:', process.env.RAZORPAY_KEY_ID || 'rzp_test_AzaxT5qLnCuqBZ');
    console.log('Key Secret:', process.env.RAZORPAY_KEY_SECRET ? '***SET***' : '***NOT SET***');
    
    // Test 1: Check if keys are valid by creating a minimal test order
    const testOrder = await razorpay.orders.create({
      amount: 100, // 1 rupee
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now(),
      payment_capture: 1,
    });
    
    // Test 2: Check if we can fetch the order
    const fetchedOrder = await razorpay.orders.fetch(testOrder.id);
    
    res.json({ 
      message: 'Razorpay configuration is working',
      testOrder: testOrder.id,
      fetchedOrder: fetchedOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_AzaxT5qLnCuqBZ',
      environment: process.env.RAZORPAY_KEY_ID?.includes('test') ? 'TEST' : 'LIVE'
    });
  } catch (err) {
    console.error('Razorpay test failed:', err);
    res.status(500).json({ 
      message: 'Razorpay configuration test failed', 
      error: err.message,
      errorCode: err.code,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_AzaxT5qLnCuqBZ',
      environment: process.env.RAZORPAY_KEY_ID?.includes('test') ? 'TEST' : 'LIVE'
    });
  }
});

// Webhook endpoint to handle Razorpay payment notifications
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
    
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = JSON.parse(req.body);
    console.log('Webhook received:', event.event);
    
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;
      
      if (orderId) {
        // Update payment status
        await Payment.findOneAndUpdate(
          { orderId: orderId },
          { 
            status: 'CONFIRMED',
            razorpayPaymentId: payment.id
          },
          { upsert: true, new: true }
        );
        
        // Update order status
        await Order.findByIdAndUpdate(orderId, { status: 'DELIVERED' });
        
        console.log(`Payment confirmed for order: ${orderId}`);
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook endpoint to handle Razorpay payment notifications
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
    
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = JSON.parse(req.body);
    console.log('Webhook received:', event.event);
    
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;
      
      if (orderId) {
        // Update payment status
        await Payment.findOneAndUpdate(
          { orderId: orderId },
          { 
            status: 'CONFIRMED',
            razorpayPaymentId: payment.id
          },
          { upsert: true, new: true }
        );
        
        // Update order status
        await Order.findByIdAndUpdate(orderId, { status: 'DELIVERED' });
        
        console.log(`Payment confirmed for order: ${orderId}`);
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router; 