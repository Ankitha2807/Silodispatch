const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const multer = require('multer');
const csv = require('csv-parse');
const upload = multer();
const OTP = require('../models/OTP');
const User = require('../models/User');
const crypto = require('crypto');
const CashLedger = require('../models/CashLedger');
const DriverAction = require('../models/DriverAction');
const Payment = require('../models/Payment');
const { checkAndUpdateBatchStatus } = require('../controllers/batchController');

const router = express.Router();

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const orders = [];
  csv.parse(req.file.buffer.toString(), { columns: true, trim: true }, async (err, records) => {
    if (err) return res.status(400).json({ message: 'CSV parse error', error: err.message });

    console.log('Parsed records:', records.length);
    let validCount = 0;
    for (const record of records) {
      const phone = record.customerPhone || record.phone;
      if (record.address && record.pincode && record.weight && record.paymentType && record.customerName && phone) {
        orders.push({
          address: record.address,
          pincode: record.pincode,
          weight: Number(record.weight),
          paymentType: record.paymentType,
          customerName: record.customerName,
          customerPhone: phone,
          amount: record.amount || 0,
          status: 'PENDING'
        });
        validCount++;
      } else {
        if (record && (record.address || record._id)) {
          console.log('Invalid record:', record.address || record._id);
        } else {
          console.log('Invalid record');
        }
      }
    }
    console.log('Valid orders to insert:', validCount);
    try {
      await Order.insertMany(orders);
      res.json({ message: `Uploaded ${orders.length} orders.` });
    } catch (dbErr) {
      console.log('DB insert error:', dbErr);
      res.status(500).json({ message: 'DB insert error', error: dbErr.message });
    }
  });
});

router.get('/delivered', async (req, res) => {
  try {
    console.log('GET /api/orders/delivered called');
    const deliveredOrders = await Order.find({ status: 'DELIVERED' });
    res.json(deliveredOrders);
  } catch (err) {
    console.error('Error in /delivered:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch delivered orders', error: err.message });
  }
});

// Get all pending orders (not delivered)
router.get('/pending', async (req, res) => {
  try {
    console.log('GET /api/orders/pending called');
    const pendingOrders = await Order.find({ status: { $ne: 'DELIVERED' } });
    res.json(pendingOrders);
  } catch (err) {
    console.error('Error in /pending:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch pending orders', error: err.message });
  }
});

// GET /api/orders (list all orders)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    console.error('Error in /orders:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
});

// GET /api/orders/:id (get one order)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Error in /:id:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch order', error: err.message });
  }
});

// GET /api/orders/debug/:id - Debug order details
router.get('/debug/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    res.json({
      orderId: order._id,
      paymentType: order.paymentType,
      amount: order.amount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      address: order.address,
      pincode: order.pincode
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order details', error: err.message });
  }
});

// PATCH /api/orders/:id (update order)
router.patch('/:id', authMiddleware, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

// DELETE /api/orders/:id (delete order)
router.delete('/:id', authMiddleware, async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ message: 'Order deleted' });
});

// Danger: Only for development/testing!
router.delete('/all', authMiddleware, async (req, res) => {
  try {
    await Order.deleteMany({});
    res.json({ message: 'All orders deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete orders', error: err.message });
  }
});

// POST /api/orders/:id/send-otp
router.post('/:id/send-otp', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    const phone = order?.customerPhone;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number not found for this order.' });
    }

    // Twilio setup
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const client = twilio(accountSid, authToken);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    // Remove any existing OTP for this order
    await OTP.deleteMany({ orderId });
    // Save new OTP
    await OTP.create({ orderId, otpCode, expiry });
    
    // Record driver action
    await DriverAction.create({
      driverId: req.user.id,
      orderId: orderId,
      batchId: order.batchId,
      actionType: 'OTP_SENT',
      actionData: {
        otpCode: otpCode,
        notes: 'OTP sent to customer'
      }
    });
    
    // Send OTP via Twilio
    await client.messages.create({
      body: `Your OTP code is: ${otpCode}`,
      from: twilioPhone,
      to: phone
    });
    res.json({ message: 'OTP sent to customer' });
  } catch (err) {
    // Record failed action
    try {
      await DriverAction.create({
        driverId: req.user.id,
        orderId: req.params.id,
        actionType: 'OTP_SENT',
        success: false,
        errorMessage: err.message
      });
    } catch (actionErr) {
      console.error('Failed to record failed action:', actionErr);
    }
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// POST /api/orders/:id/verify-otp
router.post('/:id/verify-otp', authMiddleware, async (req, res) => {
  try {
    const { otpCode } = req.body;
    const orderId = req.params.id;
    const otp = await OTP.findOne({ orderId: orderId, otpCode, expiry: { $gt: new Date() } });
    if (!otp) return res.status(400).json({ message: 'Invalid or expired OTP' });
    
    await OTP.deleteOne({ _id: otp._id });
    
    // Update order with OTP verification
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    order.otpVerified = true;
    order.otpVerifiedAt = new Date();
    order.otpVerifiedBy = req.user.id;
    order.status = 'ASSIGNED'; // Update status to show progress
    await order.save();
    
    // Record driver action
    await DriverAction.create({
      driverId: req.user.id,
      orderId: orderId,
      batchId: order.batchId,
      actionType: 'OTP_VERIFIED',
      actionData: {
        otpCode: otpCode,
        notes: 'OTP verified successfully'
      }
    });
    
    res.json({ message: 'OTP verified', order: order });
  } catch (err) {
    // Record failed action
    try {
      await DriverAction.create({
        driverId: req.user.id,
        orderId: req.params.id,
        actionType: 'OTP_VERIFIED',
        success: false,
        errorMessage: err.message
      });
    } catch (actionErr) {
      console.error('Failed to record failed action:', actionErr);
    }
    res.status(500).json({ message: 'Failed to verify OTP', error: err.message });
  }
});

// POST /api/orders/:id/collect-cash
router.post('/:id/collect-cash', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    console.log('Cash collection attempt for order:', {
      orderId: order._id,
      paymentType: order.paymentType,
      amount: order.amount,
      status: order.status
    });
    
    if (order.paymentType !== 'COD') {
      return res.status(400).json({ 
        message: 'Not a COD order', 
        orderPaymentType: order.paymentType,
        orderId: order._id 
      });
    }
    
    // Check if payment already collected
    if (order.paymentStatus === 'RECEIVED') {
      return res.status(400).json({ 
        message: 'Payment already collected for this order',
        orderId: order._id 
      });
    }
    
    // Log cash in ledger
    await CashLedger.create({ 
      driverId: req.user.id, 
      orderId: order._id, 
      amount: order.amount, 
      collectedAt: new Date() 
    });
    
    // Update order payment status
    order.paymentStatus = 'RECEIVED';
    order.paymentCollectedAt = new Date();
    order.paymentCollectedBy = req.user.id;
    order.paymentMethod = 'CASH';
    await order.save();
    
    // Create or update payment record
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        method: 'COD',
        amount: order.amount,
        status: 'CONFIRMED',
        timestamp: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Record driver action
    await DriverAction.create({
      driverId: req.user.id,
      orderId: orderId,
      batchId: order.batchId,
      actionType: 'CASH_COLLECTED',
      actionData: {
        amount: order.amount,
        paymentMethod: 'CASH',
        notes: 'Cash collected from customer'
      }
    });
    
    console.log('Cash collection successful for order:', order._id);
    res.json({ message: 'Cash received and logged', order: order });
  } catch (err) {
    console.error('Cash collection error:', err);
    // Record failed action
    try {
      await DriverAction.create({
        driverId: req.user.id,
        orderId: req.params.id,
        actionType: 'CASH_COLLECTED',
        success: false,
        errorMessage: err.message
      });
    } catch (actionErr) {
      console.error('Failed to record failed action:', actionErr);
    }
    res.status(500).json({ message: 'Failed to collect cash', error: err.message });
  }
});

// POST /api/orders/:id/collect-upi
router.post('/:id/collect-upi', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentType !== 'UPI') return res.status(400).json({ message: 'Not a UPI order' });
    
    // Update order payment status
    order.paymentStatus = 'RECEIVED';
    order.paymentCollectedAt = new Date();
    order.paymentCollectedBy = req.user.id;
    order.paymentMethod = 'UPI';
    await order.save();
    
    // Create or update payment record
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        method: 'UPI',
        amount: order.amount,
        status: 'CONFIRMED',
        timestamp: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Record driver action
    await DriverAction.create({
      driverId: req.user.id,
      orderId: orderId,
      batchId: order.batchId,
      actionType: 'UPI_COLLECTED',
      actionData: {
        amount: order.amount,
        paymentMethod: 'UPI',
        notes: 'UPI payment collected from customer'
      }
    });
    
    res.json({ message: 'UPI payment marked as received' });
  } catch (err) {
    // Record failed action
    try {
      await DriverAction.create({
        driverId: req.user.id,
        orderId: req.params.id,
        actionType: 'UPI_COLLECTED',
        success: false,
        errorMessage: err.message
      });
    } catch (actionErr) {
      console.error('Failed to record failed action:', actionErr);
    }
    res.status(500).json({ message: 'Failed to collect UPI payment', error: err.message });
  }
});

// POST /api/orders/:id/mark-delivered
router.post('/:id/mark-delivered', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Check if payment is received for COD/UPI orders (but not PREPAID)
    if ((order.paymentType === 'COD' || order.paymentType === 'UPI') && order.paymentStatus !== 'RECEIVED') {
      return res.status(400).json({ message: 'Payment must be collected before marking as delivered' });
    }
    
    // For PREPAID orders, payment is already done, so we can proceed
    if (order.paymentType === 'PREPAID') {
      order.paymentStatus = 'RECEIVED'; // Mark as received since it was prepaid
      order.paymentMethod = 'PREPAID';
      
      // Create payment record for PREPAID orders
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        {
          orderId: order._id,
          method: 'PREPAID',
          amount: order.amount,
          status: 'CONFIRMED',
          timestamp: new Date()
        },
        { upsert: true, new: true }
      );
    }
    
    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    order.deliveredBy = req.user.id;
    await order.save();
    
    // Record driver action
    await DriverAction.create({
      driverId: req.user.id,
      orderId: orderId,
      batchId: order.batchId,
      actionType: 'MARKED_DELIVERED',
      actionData: {
        paymentType: order.paymentType,
        notes: `Order marked as delivered (${order.paymentType})`
      }
    });
    
    // Check if batch is completed (all orders delivered)
    let batchCompleted = false;
    if (order.batchId) {
      const updatedBatch = await checkAndUpdateBatchStatus(order.batchId);
      if (updatedBatch && updatedBatch.status === 'COMPLETED') {
        batchCompleted = true;
      }
    }
    
    console.log(`Order ${orderId} marked as delivered. Payment type: ${order.paymentType}`);
    res.json({ 
      message: 'Order marked as delivered', 
      order: order,
      batchCompleted: batchCompleted
    });
  } catch (err) {
    console.error('Mark delivered error:', err);
    // Record failed action
    try {
      await DriverAction.create({
        driverId: req.user.id,
        orderId: req.params.id,
        actionType: 'MARKED_DELIVERED',
        success: false,
        errorMessage: err.message
      });
    } catch (actionErr) {
      console.error('Failed to record failed action:', actionErr);
    }
    res.status(500).json({ message: 'Failed to mark as delivered', error: err.message });
  }
});

// POST /api/orders/manual (create orders manually)
router.post('/manual', authMiddleware, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: 'Orders array is required and cannot be empty' });
    }

    const createdOrders = [];
    
    for (const orderData of orders) {
      // Validate required fields
      if (!orderData.customerName || !orderData.address || !orderData.pincode || 
          !orderData.phone || !orderData.weight) {
        return res.status(400).json({ 
          message: 'Missing required fields: customerName, address, pincode, phone, weight' 
        });
      }

      // Set amount to 0 for PREPAID orders
      const amount = orderData.paymentType === 'PREPAID' ? 0 : (orderData.amount || 0);

      const order = new Order({
        customerName: orderData.customerName,
        address: orderData.address,
        pincode: orderData.pincode,
        customerPhone: orderData.phone,
        weight: parseFloat(orderData.weight),
        amount: parseFloat(amount),
        paymentType: orderData.paymentType,
        status: 'PENDING',
        paymentStatus: orderData.paymentType === 'PREPAID' ? 'RECEIVED' : 'PENDING',
        createdBy: req.user.id
      });

      await order.save();
      createdOrders.push(order);
    }

    res.json({ 
      message: `Successfully created ${createdOrders.length} order(s)`,
      orders: createdOrders
    });
  } catch (err) {
    console.error('Manual order creation error:', err);
    res.status(500).json({ message: 'Failed to create orders', error: err.message });
  }
});

// POST /api/orders/:id/start-navigation
router.post('/:id/start-navigation', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Record driver action
    await DriverAction.create({
      driverId: req.user.id,
      orderId: orderId,
      batchId: order.batchId,
      actionType: 'NAVIGATION_STARTED',
      actionData: {
        location: order.address,
        notes: 'Started navigation to delivery location'
      }
    });

    res.json({ message: 'Navigation started' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record navigation', error: err.message });
  }
});

// Get all delivered orders

module.exports = router; 