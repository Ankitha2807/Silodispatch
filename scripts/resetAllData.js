const mongoose = require('mongoose');
const DriverAction = require('./backend/src/models/DriverAction');
const Payment = require('./backend/src/models/Payment');
const CashLedger = require('./backend/src/models/CashLedger');
const SettlementRequest = require('./backend/src/models/SettlementRequest');
const Order = require('./backend/src/models/Order');
const Batch = require('./backend/src/models/Batch');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/silodispatch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function resetAllData() {
  try {
    console.log('🔄 Starting to reset all data...');
    
    // Clear Driver Actions
    const actionsResult = await DriverAction.deleteMany({});
    console.log(`✅ Cleared ${actionsResult.deletedCount} driver actions`);
    
    // Clear Payments
    const paymentsResult = await Payment.deleteMany({});
    console.log(`✅ Cleared ${paymentsResult.deletedCount} payments`);
    
    // Clear Cash Ledger entries
    const cashResult = await CashLedger.deleteMany({});
    console.log(`✅ Cleared ${cashResult.deletedCount} cash ledger entries`);
    
    // Clear Settlement Requests
    const settlementResult = await SettlementRequest.deleteMany({});
    console.log(`✅ Cleared ${settlementResult.deletedCount} settlement requests`);
    
    // Reset Order statuses to PENDING
    const orderResult = await Order.updateMany(
      { status: { $in: ['IN_TRANSIT', 'DELIVERED', 'OUT_FOR_DELIVERY'] } },
      { 
        $set: { 
          status: 'PENDING',
          paymentStatus: 'PENDING',
          otpVerified: false,
          otpSent: false,
          deliveredBy: null,
          deliveredAt: null,
          cashCollected: false,
          upiCollected: false
        } 
      }
    );
    console.log(`✅ Reset ${orderResult.modifiedCount} orders to PENDING status`);
    
    // Reset Batch assignments
    const batchResult = await Batch.updateMany(
      { assignedDriverId: { $exists: true } },
      { 
        $unset: { 
          assignedDriverId: "",
          assignedAt: "",
          status: ""
        },
        $set: {
          status: 'PENDING'
        }
      }
    );
    console.log(`✅ Reset ${batchResult.modifiedCount} batch assignments`);
    
    console.log('🎉 All data reset successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Driver Actions: ${actionsResult.deletedCount}`);
    console.log(`   - Payments: ${paymentsResult.deletedCount}`);
    console.log(`   - Cash Ledger Entries: ${cashResult.deletedCount}`);
    console.log(`   - Settlement Requests: ${settlementResult.deletedCount}`);
    console.log(`   - Orders Reset: ${orderResult.modifiedCount}`);
    console.log(`   - Batch Assignments Reset: ${batchResult.modifiedCount}`);
    
    console.log('\n🚀 Ready for fresh testing!');
    
  } catch (error) {
    console.error('❌ Error resetting data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
resetAllData(); 