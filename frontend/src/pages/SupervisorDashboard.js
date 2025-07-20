import React from 'react';
import SupervisorSummary from '../components/SupervisorSummary';
import DriverInfoPanel from '../components/DriverInfoPanel';
import BatchManagementPanel from '../components/BatchManagementPanel';
import CompletedBatchesPanel from '../components/CompletedBatchesPanel';
import OrderUpload from '../components/OrderUpload';
import ManualOrderEntry from '../components/ManualOrderEntry';

function SupervisorDashboard({ user }) {
  return (
    <div>
      <SupervisorSummary />
      <OrderUpload />
      <ManualOrderEntry />
      <DriverInfoPanel />
      <BatchManagementPanel />
      <CompletedBatchesPanel />
    </div>
  );
}

export default SupervisorDashboard; 