const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const multer = require('multer');
const csv = require('csv-parse');
const upload = multer();
const OTP = require('../models/OTP');
const User = require('../models/User');
const crypto = require('crypto');
const CashLedger = require('../models/CashLedger');

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
        console.log('Invalid record:', record);
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

// GET /api/orders (list all orders)
router.get('/', authMiddleware, async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

// GET /api/orders/:id (get one order)
router.get('/:id', authMiddleware, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
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
    // Send OTP via Twilio
    await client.messages.create({
      body: `Your OTP code is: ${otpCode}`,
      from: twilioPhone,
      to: phone
    });
    res.json({ message: 'OTP sent to customer' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// POST /api/orders/:id/verify-otp
router.post('/:id/verify-otp', authMiddleware, async (req, res) => {
  try {
    const { otpCode } = req.body;
    const otp = await OTP.findOne({ orderId: req.params.id, otpCode, expiry: { $gt: new Date() } });
    if (!otp) return res.status(400).json({ message: 'Invalid or expired OTP' });
    await OTP.deleteOne({ _id: otp._id });
    res.json({ message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify OTP', error: err.message });
  }
});

// POST /api/orders/:id/collect-cash
router.post('/:id/collect-cash', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentType !== 'COD') return res.status(400).json({ message: 'Not a COD order' });
    // Log cash in ledger
    await CashLedger.create({ driverId: req.user._id, orderId: order._id, amount: order.amount, receivedAt: new Date() });
    order.paymentStatus = 'RECEIVED';
    await order.save();
    res.json({ message: 'Cash received and logged' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to collect cash', error: err.message });
  }
});

// POST /api/orders/:id/collect-upi
router.post('/:id/collect-upi', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentType !== 'UPI') return res.status(400).json({ message: 'Not a UPI order' });
    // Mock UPI payment success
    order.paymentStatus = 'RECEIVED';
    await order.save();
    res.json({ message: 'UPI payment marked as received (mock)' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to collect UPI payment', error: err.message });
  }
});

// POST /api/orders/:id/mark-delivered
router.post('/:id/mark-delivered', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    order.deliveredBy = req.user._id;
    await order.save();
    res.json({ message: 'Order marked as delivered' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as delivered', error: err.message });
  }
});

module.exports = router; 