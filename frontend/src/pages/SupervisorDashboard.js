import React from 'react';
import SupervisorSummary from '../components/SupervisorSummary';
import DriverInfoPanel from '../components/DriverInfoPanel';
import BatchManagementPanel from '../components/BatchManagementPanel';
import OrderUpload from '../components/OrderUpload';

function SupervisorDashboard({ user }) {
  return (
    <div>
      <SupervisorSummary />
      <OrderUpload />
      <DriverInfoPanel />
      <BatchManagementPanel />
    </div>
  );
}

export default SupervisorDashboard; 