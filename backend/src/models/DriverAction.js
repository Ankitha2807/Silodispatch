const mongoose = require('mongoose');

const driverActionSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  actionType: { 
    type: String, 
    enum: ['OTP_SENT', 'OTP_VERIFIED', 'CASH_COLLECTED', 'UPI_COLLECTED', 'MARKED_DELIVERED', 'NAVIGATION_STARTED'],
    required: true 
  },
  actionData: {
    amount: Number,
    paymentMethod: String,
    otpCode: String,
    location: String,
    notes: String
  },
  timestamp: { type: Date, default: Date.now },
  success: { type: Boolean, default: true },
  errorMessage: String
}, { timestamps: true });

// Indexes for efficient queries
driverActionSchema.index({ driverId: 1, timestamp: -1 });
driverActionSchema.index({ orderId: 1, actionType: 1 });
driverActionSchema.index({ batchId: 1, driverId: 1 });

module.exports = mongoose.model('DriverAction', driverActionSchema); 