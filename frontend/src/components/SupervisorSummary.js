import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faUserCheck, faRupeeSign, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

function SupervisorSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError('');
      try {
        const [resSummary, resBatches, resDrivers] = await Promise.all([
          fetch('/api/summary', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/batches/all', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/users?role=DRIVER', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        ]);
        const dataSummary = await resSummary.json();
        const dataBatches = await resBatches.json();
        const dataDrivers = await resDrivers.json();
        if (!resSummary.ok) throw new Error(dataSummary.message || 'Failed to fetch summary');
        if (!resBatches.ok) throw new Error(dataBatches.message || 'Failed to fetch batches');
        if (!resDrivers.ok) throw new Error(dataDrivers.message || 'Failed to fetch drivers');
        setSummary(dataSummary);
        setBatches(dataBatches);
        setDrivers(dataDrivers);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchSummary();
  }, []);

  // Calculate available and on-delivery drivers
  let availableDrivers = 0;
  let onDeliveryDrivers = 0;
  let codDrivers = 0;
  if (batches.length && drivers.length) {
    // Map driverId to batches assigned
    const driverBatchMap = {};
    batches.forEach(batch => {
      if (batch.assignedDriverId && batch.orders) {
        const driverId = batch.assignedDriverId._id;
        if (!driverBatchMap[driverId]) driverBatchMap[driverId] = [];
        driverBatchMap[driverId].push(batch);
      }
    });
    drivers.forEach(driver => {
      const driverId = driver._id;
      const assignedBatches = driverBatchMap[driverId] || [];
      if (assignedBatches.length === 0) {
        availableDrivers += 1;
      } else {
        // A driver is available if all their orders in all batches are DELIVERED
        const allDelivered = assignedBatches.every(batch =>
          batch.orders.every(order => order.status === 'DELIVERED')
        );
        if (allDelivered) {
          availableDrivers += 1;
        } else {
          onDeliveryDrivers += 1;
        }
      }
    });
    // For COD pending, count unique drivers with at least one batch with a COD order not delivered
    const codDriverSet = new Set();
    batches.forEach(batch => {
      if (batch.assignedDriverId && batch.orders) {
        const hasPendingCOD = batch.orders.some(order => order.paymentType === 'COD' && order.status !== 'DELIVERED');
        if (hasPendingCOD) {
          codDriverSet.add(batch.assignedDriverId._id);
        }
      }
    });
    codDrivers = codDriverSet.size;
  }

  if (loading) return <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!summary) return null;

  // Calculate % change from yesterday and vs target
  let orderChange = null;
  let revenueChange = null;
  let orderVsTarget = null;
  let revenueVsTarget = null;
  if (summary.yesterdayOrders !== undefined && summary.yesterdayOrders !== 0) {
    orderChange = ((summary.pendingOrders - summary.yesterdayOrders) / summary.yesterdayOrders) * 100;
  }
  if (summary.yesterdayRevenue !== undefined && summary.yesterdayRevenue !== 0) {
    revenueChange = ((summary.totalRevenue - summary.yesterdayRevenue) / summary.yesterdayRevenue) * 100;
  }
  if (summary.orderTarget) {
    orderVsTarget = (summary.pendingOrders / summary.orderTarget) * 100;
  }
  if (summary.revenueTarget) {
    revenueVsTarget = (summary.totalRevenue / summary.revenueTarget) * 100;
  }

  return (
    <div className="row mb-4 g-3">
      <div className="col-md-3">
        <div className="card h-100 shadow-sm border-0 bg-light">
          <div className="card-body d-flex align-items-center gap-3">
            <div className="rounded-circle bg-warning bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <FontAwesomeIcon icon={faClipboardList} size="lg" className="text-warning" />
            </div>
            <div>
              <div className="fw-bold fs-4">{summary.pendingOrders}</div>
              <div className="text-muted">Unassigned Orders</div>
              <div className="small text-success">
                {orderChange !== null ? `${orderChange > 0 ? '+' : ''}${orderChange.toFixed(1)}% from yesterday` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card h-100 shadow-sm border-0 bg-light">
          <div className="card-body d-flex align-items-center gap-3">
            <div className="rounded-circle bg-success bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <FontAwesomeIcon icon={faUserCheck} size="lg" className="text-success" />
            </div>
            <div>
              <div className="fw-bold fs-4">{summary.activeDrivers}</div>
              <div className="text-muted">Active Drivers</div>
              <div className="small text-primary">{availableDrivers} available, {onDeliveryDrivers} on delivery</div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card h-100 shadow-sm border-0 bg-light">
          <div className="card-body d-flex align-items-center gap-3">
            <div className="rounded-circle bg-info bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <FontAwesomeIcon icon={faRupeeSign} size="lg" className="text-info" />
            </div>
            <div>
              <div className="fw-bold fs-4">₹{summary.totalRevenue}</div>
              <div className="text-muted">Total Revenue</div>
              <div className="small text-success">
                {revenueVsTarget !== null ? `${revenueVsTarget.toFixed(1)}% vs target` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card h-100 shadow-sm border-0 bg-light">
          <div className="card-body d-flex align-items-center gap-3">
            <div className="rounded-circle bg-danger bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
              <FontAwesomeIcon icon={faMoneyBillWave} size="lg" className="text-danger" />
            </div>
            <div>
              <div className="fw-bold fs-4">₹{summary.codPending}</div>
              <div className="text-muted">COD Pending</div>
              <div className="small text-secondary">Across {codDrivers} drivers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupervisorSummary; 