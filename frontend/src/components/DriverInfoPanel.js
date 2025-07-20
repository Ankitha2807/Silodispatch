import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function DriverInfoPanel({ driver }) {
  const [settlementData, setSettlementData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSettlementData = useCallback(async () => {
    if (!driver || !driver._id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/settlement/driver/${driver._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSettlementData(data);
      }
    } catch (err) {
      console.error('Failed to fetch settlement data:', err);
    }
    setLoading(false);
  }, [driver?._id]);

  useEffect(() => {
    if (driver && driver._id) {
      fetchSettlementData();
    }
  }, [driver, fetchSettlementData]);

  if (!driver) return null;

  return (
    <Card className="mb-3">
      <Card.Header>
        <h5 className="mb-0">Driver Information</h5>
      </Card.Header>
      <Card.Body>
        <div className="row">
          <div className="col-md-6">
            <h6>Basic Info</h6>
            <p><strong>Name:</strong> {driver.name}</p>
            <p><strong>Email:</strong> {driver.email}</p>
            <p><strong>Phone:</strong> {driver.phone}</p>
            <p><strong>Status:</strong> 
              <Badge bg={driver.status === 'ACTIVE' ? 'success' : 'secondary'} className="ms-2">
                {driver.status}
              </Badge>
            </p>
          </div>
          <div className="col-md-6">
            <h6>Today's Summary</h6>
            {loading ? (
              <p>Loading settlement data...</p>
            ) : settlementData ? (
              <div>
                <p><strong>Total Collected:</strong> ₹{settlementData.summary.totalCollected}</p>
                <p><strong>Cash:</strong> ₹{settlementData.summary.cashCollected}</p>
                <p><strong>UPI:</strong> ₹{settlementData.summary.upiCollected}</p>
                <p><strong>Deliveries:</strong> {settlementData.summary.totalDeliveries}</p>
              </div>
            ) : (
              <p>No settlement data available</p>
            )}
          </div>
        </div>
        
        {settlementData && (
          <div className="mt-3">
            <h6>Recent Actions</h6>
            <div className="row text-center">
              <div className="col-2">
                <div className="border rounded p-2">
                  <h5>{settlementData.summary.actionSummary.otpSent}</h5>
                  <small>OTP Sent</small>
                </div>
              </div>
              <div className="col-2">
                <div className="border rounded p-2">
                  <h5>{settlementData.summary.actionSummary.otpVerified}</h5>
                  <small>OTP Verified</small>
                </div>
              </div>
              <div className="col-2">
                <div className="border rounded p-2">
                  <h5>{settlementData.summary.actionSummary.cashCollected}</h5>
                  <small>Cash Collected</small>
                </div>
              </div>
              <div className="col-2">
                <div className="border rounded p-2">
                  <h5>{settlementData.summary.actionSummary.upiCollected}</h5>
                  <small>UPI Collected</small>
                </div>
              </div>
              <div className="col-2">
                <div className="border rounded p-2">
                  <h5>{settlementData.summary.actionSummary.delivered}</h5>
                  <small>Delivered</small>
                </div>
              </div>
              <div className="col-2">
                <div className="border rounded p-2">
                  <h5>{settlementData.summary.actionSummary.navigationStarted}</h5>
                  <small>Navigation</small>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-3">
          <Link to={`/driver/settlement/${driver._id}`} className="btn btn-primary btn-sm">
            View Detailed Settlement
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

export default DriverInfoPanel; 