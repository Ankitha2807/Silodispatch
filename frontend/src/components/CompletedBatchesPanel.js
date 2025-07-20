import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEye, faTrophy } from '@fortawesome/free-solid-svg-icons';

function CompletedBatchesPanel() {
  const [completedBatches, setCompletedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCompletedBatches();
  }, []);

  const fetchCompletedBatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/batches/completed', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch completed batches');
      setCompletedBatches(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleShowModal = (batch) => {
    setSelectedBatch(batch);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBatch(null);
  };

  const calculateCompletionTime = (batch) => {
    if (!batch.completedAt || !batch.createdAt) return 'N/A';
    const created = new Date(batch.createdAt);
    const completed = new Date(batch.completedAt);
    const diffMs = completed - created;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  if (loading) return <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="mb-4">
      <Card>
        <Card.Header className="bg-success text-white d-flex align-items-center">
          <FontAwesomeIcon icon={faTrophy} className="me-2" />
          <h5 className="mb-0">Completed Batches</h5>
          <Badge bg="light" text="dark" className="ms-auto">{completedBatches.length}</Badge>
        </Card.Header>
        <Card.Body>
          {completedBatches.length === 0 ? (
            <div className="text-center text-muted py-4">
              <FontAwesomeIcon icon={faCheckCircle} size="2x" className="mb-3" />
              <p>No completed batches yet. Keep up the great work!</p>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Driver</th>
                    <th>Orders</th>
                    <th>Total Weight</th>
                    <th>Total Value</th>
                    <th>Completed At</th>
                    <th>Duration</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completedBatches.map(batch => (
                    <tr key={batch._id}>
                      <td>
                        <strong>{batch._id.slice(-5).toUpperCase()}</strong>
                      </td>
                      <td>
                        {batch.assignedDriverId ? (
                          <span>{batch.assignedDriverId.name || batch.assignedDriverId.email}</span>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <Badge bg="primary">{batch.orders.length}</Badge>
                      </td>
                      <td>{batch.totalWeight} kg</td>
                      <td>₹{batch.orders.reduce((sum, o) => sum + (o.amount || 0), 0)}</td>
                      <td>
                        {batch.completedAt ? (
                          <small>{new Date(batch.completedAt).toLocaleString()}</small>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">{calculateCompletionTime(batch)}</small>
                      </td>
                      <td>
                        <Button 
                          variant="outline-info" 
                          size="sm" 
                          onClick={() => handleShowModal(batch)}
                        >
                          <FontAwesomeIcon icon={faEye} className="me-1" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Batch Details Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            Completed Batch Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBatch && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Batch ID:</strong> {selectedBatch._id}
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong> 
                  <Badge bg="success" className="ms-2">Completed</Badge>
                </div>
              </div>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Driver:</strong> 
                  {selectedBatch.assignedDriverId ? (
                    <span className="ms-2">{selectedBatch.assignedDriverId.name || selectedBatch.assignedDriverId.email}</span>
                  ) : (
                    <span className="text-muted ms-2">Unassigned</span>
                  )}
                </div>
                <div className="col-md-6">
                  <strong>Total Weight:</strong> {selectedBatch.totalWeight} kg
                </div>
              </div>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Completed At:</strong> 
                  <small className="ms-2">
                    {selectedBatch.completedAt ? new Date(selectedBatch.completedAt).toLocaleString() : 'N/A'}
                  </small>
                </div>
                <div className="col-md-6">
                  <strong>Duration:</strong> {calculateCompletionTime(selectedBatch)}
                </div>
              </div>
              
              {selectedBatch.completionNotes && (
                <div className="mb-3">
                  <strong>Completion Notes:</strong>
                  <p className="text-muted mb-0">{selectedBatch.completionNotes}</p>
                </div>
              )}
              
              <hr />
              <h6>Delivered Orders</h6>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Delivered At</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.orders.map(order => (
                    <tr key={order._id}>
                      <td>{order.customerName}</td>
                      <td>
                        <small>{order.address}, {order.pincode}</small>
                      </td>
                      <td>
                        <Badge bg={
                          order.paymentType === 'COD' ? 'warning' :
                          order.paymentType === 'UPI' ? 'info' : 'success'
                        }>
                          {order.paymentType}
                        </Badge>
                      </td>
                      <td>₹{order.amount || 0}</td>
                      <td>
                        <small>
                          {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'N/A'}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CompletedBatchesPanel; 