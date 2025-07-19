const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  otpCode: { type: String, required: true },
  expiry: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema); 