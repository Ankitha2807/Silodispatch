const mongoose = require('mongoose');
const DriverAction = require('./src/models/DriverAction');
const Payment = require('./src/models/Payment');
const CashLedger = require('./src/models/CashLedger');
const SettlementRequest = require('./src/models/SettlementRequest');
const Order = require('./src/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/silodispatch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function clearTestData() {
  try {
    console.log('🔄 Starting to clear test data...');
    
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
    
    console.log('🎉 All test data cleared successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Driver Actions: ${actionsResult.deletedCount}`);
    console.log(`   - Payments: ${paymentsResult.deletedCount}`);
    console.log(`   - Cash Ledger Entries: ${cashResult.deletedCount}`);
    console.log(`   - Settlement Requests: ${settlementResult.deletedCount}`);
    
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
clearTestData(); 