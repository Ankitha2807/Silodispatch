const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  weight: { type: Number, required: true },
  paymentType: { type: String, enum: ['UPI', 'COD', 'PREPAID'], required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'DELIVERED'], default: 'PENDING' },
  amount: { type: Number, required: false },
  paymentStatus: { type: String, enum: ['PENDING', 'RECEIVED', 'FAILED'], default: 'PENDING' },
  deliveredAt: { type: Date },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentCollectedAt: { type: Date },
  paymentCollectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentMethod: { type: String, enum: ['CASH', 'UPI', 'PREPAID'] },
  otpVerified: { type: Boolean, default: false },
  otpVerifiedAt: { type: Date },
  otpVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema); 