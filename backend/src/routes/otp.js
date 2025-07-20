const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const OTP = require('../models/OTP');
const twilio = require('twilio');
const router = express.Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/otp/generate (generate OTP for order)
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { orderId, phone } = req.body;
    if (!orderId || !phone) {
      return res.status(400).json({ error: 'orderId and phone are required' });
    }
    const otpCode = generateOTP();
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
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP generation error:', err);
    res.status(500).json({ error: 'Failed to generate/send OTP' });
  }
});

// POST /api/otp/verify (verify OTP for order)
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { orderId, otpCode } = req.body;
    if (!orderId || !otpCode) {
      return res.status(400).json({ error: 'orderId and otpCode are required' });
    }
    const otpRecord = await OTP.findOne({ orderId, otpCode });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    if (otpRecord.expiry < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'OTP expired' });
    }
    // OTP is valid, delete it after use
    await OTP.deleteOne({ _id: otpRecord._id });
    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

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

module.exports = router; 