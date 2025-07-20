import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Badge, Table, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function SupervisorSettlements() {
  const [allDriverSettlements, setAllDriverSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // tomorrow
  });
  const [showAll, setShowAll] = useState(false);

  const fetchAllSettlements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      
      // Only add date filters if not showing all
      if (!showAll) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      console.log('Fetching all driver settlements with params:', params.toString());
      const res = await fetch(`/api/settlement/all-drivers?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settlements');
      
      console.log('All settlements data:', data);
      setAllDriverSettlements(data.drivers || []);
    } catch (err) {
      console.error('Settlements fetch error:', err);
      setError(err.message);
    }
    setLoading(false);
  }, [dateRange.startDate, dateRange.endDate, showAll]);

  const handleCompleteSettlement = async (driverId) => {
    try {
      const params = new URLSearchParams();
      
      // Only add date filters if not showing all
      if (!showAll) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      
      const res = await fetch(`/api/settlement/driver/${driverId}/complete?${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to complete settlement');
      
      alert(`Settlement completed for driver! Total amount: ₹${data.totalAmount}`);
      fetchAllSettlements(); // Refresh data
    } catch (err) {
      alert('Failed to complete settlement: ' + err.message);
    }
  };

  useEffect(() => {
    fetchAllSettlements();
  }, [fetchAllSettlements]);

  if (loading) return <div>Loading settlements...</div>;
  if (error) return <div className="text-danger">Error: {error}</div>;

  return (
    <div className="container mt-4">
      <h2>Driver Settlements Overview</h2>
      
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

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="bg-primary text-white">
            <Card.Body>
              <h5 className="card-title">Total Drivers</h5>
              <h3>{allDriverSettlements.length}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="bg-success text-white">
            <Card.Body>
              <h5 className="card-title">Total Collections</h5>
              <h3>₹{allDriverSettlements.reduce((sum, driver) => sum + (driver.summary?.totalCollected || 0), 0)}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="bg-info text-white">
            <Card.Body>
              <h5 className="card-title">Total Deliveries</h5>
              <h3>{allDriverSettlements.reduce((sum, driver) => sum + (driver.summary?.totalDeliveries || 0), 0)}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="bg-warning text-white">
            <Card.Body>
              <h5 className="card-title">Total Actions</h5>
              <h3>{allDriverSettlements.reduce((sum, driver) => sum + (driver.actions?.length || 0), 0)}</h3>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Driver Settlements */}
      {allDriverSettlements.length === 0 ? (
        <Card>
          <Card.Body>
            <h5 className="text-center text-muted">No settlement data found for the selected date range.</h5>
            <p className="text-center text-muted">Make sure drivers have performed actions during this period.</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="row">
          {allDriverSettlements.map((driverData, index) => (
            <div key={driverData.driver._id} className="col-md-6 mb-4">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">
                    {driverData.driver.name || 'Unknown Driver'}
                    <Badge bg="secondary" className="ms-2">
                      {driverData.driver.email || 'No email'}
                    </Badge>
                  </h5>
                </Card.Header>
                <Card.Body>
                  {/* Summary */}
                  <Row className="mb-3">
                    <Col md={6}>
                      <div className="text-center">
                        <h4 className="text-primary">₹{driverData.summary?.totalCollected || 0}</h4>
                        <small>Total Collected</small>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-center">
                        <h4 className="text-success">{driverData.summary?.totalDeliveries || 0}</h4>
                        <small>Deliveries</small>
                      </div>
                    </Col>
                  </Row>

                  {/* Breakdown */}
                  <Row className="mb-3">
                    <Col md={6}>
                      <div className="text-center">
                        <h5 className="text-warning">₹{driverData.summary?.cashCollected || 0}</h5>
                        <small>Cash</small>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-center">
                        <h5 className="text-info">₹{driverData.summary?.upiCollected || 0}</h5>
                        <small>UPI</small>
                      </div>
                    </Col>
                  </Row>

                  {/* Action Summary */}
                  <div className="mb-3">
                    <h6>Actions Summary</h6>
                    <div className="row text-center">
                      <div className="col-2">
                        <div className="border rounded p-1">
                          <small>{driverData.summary?.actionSummary?.otpSent || 0}</small>
                          <br />
                          <small>OTP Sent</small>
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="border rounded p-1">
                          <small>{driverData.summary?.actionSummary?.otpVerified || 0}</small>
                          <br />
                          <small>OTP Verified</small>
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="border rounded p-1">
                          <small>{driverData.summary?.actionSummary?.cashCollected || 0}</small>
                          <br />
                          <small>Cash Collected</small>
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="border rounded p-1">
                          <small>{driverData.summary?.actionSummary?.upiCollected || 0}</small>
                          <br />
                          <small>UPI Collected</small>
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="border rounded p-1">
                          <small>{driverData.summary?.actionSummary?.delivered || 0}</small>
                          <br />
                          <small>Delivered</small>
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="border rounded p-1">
                          <small>{driverData.summary?.actionSummary?.navigationStarted || 0}</small>
                          <br />
                          <small>Navigation</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <Link 
                      to={`/supervisor/driver-settlement/${driverData.driver._id}`} 
                      className="btn btn-primary btn-sm"
                    >
                      View Details
                    </Link>
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => handleCompleteSettlement(driverData.driver._id)}
                      disabled={driverData.cashEntries.filter(e => !e.settled).length === 0}
                    >
                      Complete Settlement
                    </Button>
                  </div>

                  {/* Recent Actions */}
                  {driverData.actions.length > 0 && (
                    <div className="mt-3">
                      <h6>Recent Actions</h6>
                      <div className="table-responsive">
                        <Table size="sm">
                          <thead>
                            <tr>
                              <th>Action</th>
                              <th>Time</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {driverData.actions.slice(0, 3).map((action, idx) => (
                              <tr key={action._id || idx}>
                                <td>
                                  <Badge bg={getActionColor(action.actionType)}>
                                    {action.actionType.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td>{new Date(action.timestamp).toLocaleTimeString()}</td>
                                <td>
                                  <Badge bg={action.success ? 'success' : 'danger'}>
                                    {action.success ? 'Success' : 'Failed'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getActionColor(actionType) {
  const colors = {
    'OTP_SENT': 'primary',
    'OTP_VERIFIED': 'success',
    'CASH_COLLECTED': 'warning',
    'UPI_COLLECTED': 'info',
    'MARKED_DELIVERED': 'success',
    'NAVIGATION_STARTED': 'secondary'
  };
  return colors[actionType] || 'secondary';
}

export default SupervisorSettlements; 