import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Badge, Button } from 'react-bootstrap'; // Added Card, Badge, and Button imports

function DriverSettlement() {
  const { driverId } = useParams();
  const [settlementData, setSettlementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // tomorrow
  });
  const [showAll, setShowAll] = useState(false);
  const [settlementRequests, setSettlementRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);

  const fetchSettlementData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      
      // Only add date filters if not showing all
      if (!showAll) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      console.log('Fetching settlement for driver:', driverId);
      console.log('Driver ID type:', typeof driverId, 'Value:', driverId);
      console.log('Show all:', showAll, 'Date range:', dateRange);
      
      const res = await fetch(`/api/settlement/driver/${driverId}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settlement data');
      
      console.log('Settlement data received:', data);
      
      if (data.totalActions === 0 && data.cashEntries.length === 0 && data.payments.length === 0) {
        setError('No settlement data found for this driver. Make sure the driver has performed some actions.');
        
        // Try to debug by fetching all actions
        try {
          const debugRes = await fetch('/api/settlement/debug/actions', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const debugData = await debugRes.json();
          console.log('Debug data:', debugData);
          
          // Check if this driver has any actions
          const driverActions = debugData.recentActions.filter(a => 
            a.driverId === driverId || a.driverId === driverId.toString()
          );
          console.log('Actions for this driver:', driverActions);
          
          if (driverActions.length > 0) {
            setError(`Driver has ${driverActions.length} actions but settlement query returned 0. Try enabling "Show All" to bypass date filtering.`);
          }
        } catch (debugErr) {
          console.error('Debug fetch failed:', debugErr);
        }
      } else {
        setSettlementData(data);
      }
    } catch (err) {
      console.error('Settlement fetch error:', err);
      setError(err.message);
    }
    setLoading(false);
  }, [driverId, dateRange.startDate, dateRange.endDate, showAll]);

  const fetchSettlementRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/settlement/requests/driver/${driverId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settlement requests');
      
      setSettlementRequests(data.requests || []);
    } catch (err) {
      console.error('Fetch settlement requests error:', err);
    }
  }, [driverId]);

  const handleRequestSettlement = async () => {
    if (!window.confirm('Are you sure you want to submit a settlement request? This will be sent to your supervisor for approval.')) {
      return;
    }
    
    setRequestLoading(true);
    try {
      const requestData = {
        startDate: showAll ? null : dateRange.startDate,
        endDate: showAll ? null : dateRange.endDate,
        notes: `Settlement request for period: ${showAll ? 'All time' : `${dateRange.startDate} to ${dateRange.endDate}`}`
      };
      
      const res = await fetch('/api/settlement/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit settlement request');
      
      alert(`Settlement request submitted successfully! Amount: ₹${data.summary.totalAmount}`);
      fetchSettlementRequests(); // Refresh requests
      fetchSettlementData(); // Refresh settlement data
    } catch (err) {
      console.error('Submit settlement request error:', err);
      alert('Failed to submit settlement request: ' + err.message);
    }
    setRequestLoading(false);
  };

  const handleCompleteSettlement = async () => {
    if (!window.confirm('Are you sure you want to mark this settlement as complete?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/settlement/driver/${driverId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to complete settlement');
      }
      
      alert('Settlement marked as complete!');
      fetchSettlementData(); // Refresh data
    } catch (err) {
      console.error('Complete settlement error:', err);
      alert('Failed to complete settlement: ' + err.message);
    }
  };

  useEffect(() => {
    fetchSettlementData();
    fetchSettlementRequests();
  }, [fetchSettlementData, fetchSettlementRequests]);

  if (loading) return <div className="text-center mt-5"><h4>Loading settlement data...</h4></div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!settlementData) return <div>No settlement data found</div>;

  return (
    <div className="container mt-4">
      <h2>Driver Settlement Report</h2>
      
      {/* Settlement Requests Status */}
      {settlementRequests.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <Card className="border-info">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">Settlement Requests</h5>
              </Card.Header>
              <Card.Body>
                {settlementRequests.map((request, index) => (
                  <div key={request._id} className="mb-3 p-3 border rounded">
                    <div className="row">
                      <div className="col-md-3">
                        <strong>Status:</strong>
                        <Badge 
                          bg={
                            request.status === 'PENDING' ? 'warning' :
                            request.status === 'COMPLETED' ? 'success' :
                            request.status === 'REJECTED' ? 'danger' : 'secondary'
                          }
                          className="ms-2"
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <div className="col-md-3">
                        <strong>Amount:</strong> ₹{request.requestedAmount}
                      </div>
                      <div className="col-md-3">
                        <strong>Requested:</strong> {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                      <div className="col-md-3">
                        {request.approvedAt && (
                          <>
                            <strong>Processed:</strong> {new Date(request.approvedAt).toLocaleDateString()}
                          </>
                        )}
                      </div>
                    </div>
                    {request.notes && (
                      <div className="mt-2">
                        <strong>Notes:</strong> {request.notes}
                      </div>
                    )}
                  </div>
                ))}
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="row mb-4">
        <div className="col-md-6">
          <Card>
            <Card.Body>
              <h5 className="card-title">Date Range</h5>
              <div className="row">
                <div className="col-6">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    disabled={showAll}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    disabled={showAll}
                  />
                </div>
              </div>
              <div className="mt-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showAll"
                    checked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="showAll">
                    Show All Actions (bypass date filter)
                  </label>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Settlement Summary */}
      {settlementData && (
        <div className="row mb-4">
          <div className="col-md-6">
            <Card className="bg-success text-white">
              <Card.Body>
                <h5 className="card-title">Successful Payments</h5>
                <h3 className="mb-0">₹{settlementData.summary?.upiCollected || 0}</h3>
                <small>Total UPI/Online payments collected</small>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-6">
            <Card className="bg-primary text-white">
              <Card.Body>
                <h5 className="card-title">COD Cash Collected</h5>
                <h3 className="mb-0">₹{settlementData.summary?.cashCollected || 0}</h3>
                <small>Total cash to settle with supervisor</small>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Successful Payments List */}
      {settlementData && settlementData.payments && settlementData.payments.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Successful Payment Details</h5>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementData.payments.map((payment, index) => (
                        <tr key={index}>
                          <td>{payment.orderId?.orderId || 'N/A'}</td>
                          <td>₹{payment.amount}</td>
                          <td>{payment.method}</td>
                          <td>{new Date(payment.timestamp).toLocaleString()}</td>
                          <td>
                            <span className="badge bg-success">Success</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* COD Cash Collection Summary */}
      {settlementData && settlementData.cashEntries && settlementData.cashEntries.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <Card>
              <Card.Header>
                <h5 className="mb-0">COD Cash Collection Summary</h5>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Cash Amount</th>
                        <th>Collection Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementData.cashEntries.map((entry, index) => (
                        <tr key={index}>
                          <td>{entry.orderId?.orderId || 'N/A'}</td>
                          <td>₹{entry.amount}</td>
                          <td>{new Date(entry.timestamp).toLocaleString()}</td>
                          <td>
                            <span className="badge bg-primary">Collected</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Settlement Summary Card */}
      {settlementData && (
        <div className="row mb-4">
          <div className="col-12">
            <Card className="border-warning">
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">Settlement Summary</h5>
              </Card.Header>
              <Card.Body>
                <div className="row">
                  <div className="col-md-4">
                    <div className="text-center">
                      <h6>Total Actions</h6>
                      <h4>{settlementData.totalActions || 0}</h4>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <h6>Successful Payments</h6>
                      <h4 className="text-success">₹{settlementData.summary?.upiCollected || 0}</h4>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center">
                      <h6>Cash to Settle</h6>
                      <h4 className="text-primary">₹{settlementData.summary?.cashCollected || 0}</h4>
                    </div>
                  </div>
                </div>
                <hr />
                <div className="text-center">
                  <p className="mb-2">
                    <strong>Total Settlement Amount:</strong> ₹{(settlementData.summary?.upiCollected || 0) + (settlementData.summary?.cashCollected || 0)}
                  </p>
                  <small className="text-muted">
                    Date Range: {dateRange.startDate} to {dateRange.endDate}
                    {showAll && ' (All Actions)'}
                  </small>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* Complete Settlement Button */}
      {settlementData && (
        <div className="row mb-4">
          <div className="col-12">
            <Card>
              <Card.Body className="text-center">
                <h5>Ready to Settle?</h5>
                <p className="text-muted">
                  Total Settlement Amount: ₹{(settlementData.summary?.upiCollected || 0) + (settlementData.summary?.cashCollected || 0)}
                </p>
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={handleRequestSettlement}
                  disabled={requestLoading}
                >
                  {requestLoading ? 'Submitting Request...' : 'Request Settlement'}
                </Button>
                <p className="text-muted mt-2">
                  <small>This will submit a settlement request to your supervisor for approval.</small>
                </p>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverSettlement; 