const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  method: { type: String, enum: ['UPI', 'COD', 'PREPAID'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'CONFIRMED'], default: 'PENDING' },
  razorpayPaymentId: { type: String },
  razorpayOrderId: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema); 