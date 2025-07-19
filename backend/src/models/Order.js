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
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema); 