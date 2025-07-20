import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Badge, Table, Row, Col, Modal, Form } from 'react-bootstrap';

function SupervisorSettlementRequests() {
  const [settlementRequests, setSettlementRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(''); // 'approve' or 'reject'
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchSettlementRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settlement/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settlement requests');
      
      console.log('Settlement requests data:', data);
      setSettlementRequests(data.requests || []);
    } catch (err) {
      console.error('Settlement requests fetch error:', err);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/settlement/requests/${selectedRequest._id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ notes })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve settlement request');
      
      alert(`Settlement request approved! Amount: ₹${data.summary.totalAmount}`);
      setShowModal(false);
      setSelectedRequest(null);
      setNotes('');
      fetchSettlementRequests(); // Refresh data
    } catch (err) {
      console.error('Approve settlement request error:', err);
      alert('Failed to approve settlement request: ' + err.message);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/settlement/requests/${selectedRequest._id}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ notes })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject settlement request');
      
      alert('Settlement request rejected');
      setShowModal(false);
      setSelectedRequest(null);
      setNotes('');
      fetchSettlementRequests(); // Refresh data
    } catch (err) {
      console.error('Reject settlement request error:', err);
      alert('Failed to reject settlement request: ' + err.message);
    }
    setProcessing(false);
  };

  const openModal = (request, action) => {
    setSelectedRequest(request);
    setModalAction(action);
    setNotes('');
    setShowModal(true);
  };

  useEffect(() => {
    fetchSettlementRequests();
  }, [fetchSettlementRequests]);

  if (loading) return <div className="text-center mt-5"><h4>Loading settlement requests...</h4></div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  const pendingRequests = settlementRequests.filter(r => r.status === 'PENDING');
  const completedRequests = settlementRequests.filter(r => r.status === 'COMPLETED');
  const rejectedRequests = settlementRequests.filter(r => r.status === 'REJECTED');

  return (
    <div className="container mt-4">
      <h2>Settlement Requests Management</h2>
      
      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="bg-warning text-white">
            <Card.Body>
              <h5 className="card-title">Pending</h5>
              <h3>{pendingRequests.length}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="bg-success text-white">
            <Card.Body>
              <h5 className="card-title">Completed</h5>
              <h3>{completedRequests.length}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="bg-danger text-white">
            <Card.Body>
              <h5 className="card-title">Rejected</h5>
              <h3>{rejectedRequests.length}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="bg-info text-white">
            <Card.Body>
              <h5 className="card-title">Total</h5>
              <h3>{settlementRequests.length}</h3>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <Card>
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">Pending Settlement Requests</h5>
              </Card.Header>
              <Card.Body>
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Driver</th>
                        <th>Amount</th>
                        <th>Cash</th>
                        <th>UPI</th>
                        <th>Requested</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => (
                        <tr key={request._id}>
                          <td>
                            <strong>{request.driverId?.name || 'Unknown'}</strong><br />
                            <small>{request.driverId?.email || 'No email'}</small>
                          </td>
                          <td>
                            <strong>₹{request.requestedAmount}</strong>
                          </td>
                          <td>₹{request.cashAmount}</td>
                          <td>₹{request.upiAmount}</td>
                          <td>{new Date(request.requestedAt).toLocaleString()}</td>
                          <td>
                            <Button 
                              variant="success" 
                              size="sm" 
                              className="me-2"
                              onClick={() => openModal(request, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => openModal(request, 'reject')}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {/* All Requests */}
      <div className="row">
        <div className="col-12">
          <Card>
            <Card.Header>
              <h5 className="mb-0">All Settlement Requests</h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Requested</th>
                      <th>Processed</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementRequests.map((request) => (
                      <tr key={request._id}>
                        <td>
                          <strong>{request.driverId?.name || 'Unknown'}</strong><br />
                          <small>{request.driverId?.email || 'No email'}</small>
                        </td>
                        <td>
                          <strong>₹{request.requestedAmount}</strong>
                        </td>
                        <td>
                          <Badge 
                            bg={
                              request.status === 'PENDING' ? 'warning' :
                              request.status === 'COMPLETED' ? 'success' :
                              request.status === 'REJECTED' ? 'danger' : 'secondary'
                            }
                          >
                            {request.status}
                          </Badge>
                        </td>
                        <td>{new Date(request.requestedAt).toLocaleString()}</td>
                        <td>
                          {request.approvedAt ? new Date(request.approvedAt).toLocaleString() : '-'}
                        </td>
                        <td>
                          {request.notes ? (
                            <small className="text-muted">{request.notes}</small>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Approval/Rejection Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalAction === 'approve' ? 'Approve' : 'Reject'} Settlement Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div>
              <p><strong>Driver:</strong> {selectedRequest.driverId?.name}</p>
              <p><strong>Amount:</strong> ₹{selectedRequest.requestedAmount}</p>
              <p><strong>Cash:</strong> ₹{selectedRequest.cashAmount}</p>
              <p><strong>UPI:</strong> ₹{selectedRequest.upiAmount}</p>
              <p><strong>Requested:</strong> {new Date(selectedRequest.requestedAt).toLocaleString()}</p>
              
              <Form.Group className="mb-3">
                <Form.Label>Notes (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Add notes for ${modalAction === 'approve' ? 'approval' : 'rejection'}...`}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={modalAction === 'approve' ? 'success' : 'danger'}
            onClick={modalAction === 'approve' ? handleApprove : handleReject}
            disabled={processing}
          >
            {processing ? 'Processing...' : (modalAction === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default SupervisorSettlementRequests; 