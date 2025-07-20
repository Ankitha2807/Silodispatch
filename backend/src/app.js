require('dotenv').config();
console.log('OPENCAGE_API_KEY:', process.env.OPENCAGE_API_KEY); 
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);
console.log('Razorpay Key:', process.env.RAZORPAY_KEY_ID);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const batchesRouter = require('./routes/batches');
const otpRouter = require('./routes/otp');
const paymentRouter = require('./routes/payment');
const settlementRouter = require('./routes/settlement');
const financeRouter = require('./routes/finance');
const summaryRouter = require('./routes/summary');
const usersRouter = require('./routes/users');

app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/otp', otpRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/settlement', settlementRouter);
app.use('/api/finance', financeRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/users', usersRouter);

// Example protected route (requires auth)
// const { authMiddleware, requireRole } = require('./middleware/authMiddleware');
// app.get('/api/protected', authMiddleware, (req, res) => {
//   res.json({ message: 'Protected content', user: req.user });
// });

// Placeholder route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});

module.exports = app; 