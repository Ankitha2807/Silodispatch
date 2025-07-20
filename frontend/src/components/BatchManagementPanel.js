import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faCheckCircle, faTruck, faUserPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal, Button, Form, Alert, Table } from 'react-bootstrap';

function BatchManagementPanel() {
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignMsg, setAssignMsg] = useState('');
  const [assignError, setAssignError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const resBatches = await fetch('/api/batches/all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const batchesData = await resBatches.json();
        if (!resBatches.ok) throw new Error(batchesData.message || 'Failed to fetch batches');
        setBatches(batchesData);
        const resOrders = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const ordersData = await resOrders.json();
        if (!resOrders.ok) throw new Error(ordersData.message || 'Failed to fetch orders');
        setOrders(ordersData);
        const resDrivers = await fetch('/api/users?role=DRIVER', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const driversData = await resDrivers.json();
        if (!resDrivers.ok) throw new Error(driversData.message || 'Failed to fetch drivers');
        setDrivers(driversData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const refreshBatches = async () => {
    setLoading(true);
    try {
      const resBatches = await fetch('/api/batches/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const batchesData = await resBatches.json();
      setBatches(batchesData);
    } catch {}
    setLoading(false);
  };

  const handleAssignClick = (batch) => {
    setSelectedBatch(batch);
    setSelectedDriver('');
    setAssignMsg('');
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleAssignDriver = async () => {
    setAssignMsg('');
    setAssignError('');
    if (!selectedDriver) {
      setAssignError('Please select a driver.');
      return;
    }
    try {
      const res = await fetch(`/api/batches/${selectedBatch._id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ driverId: selectedDriver })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Assignment failed');
      setAssignMsg('Driver assigned successfully!');
      setShowAssignModal(false);
      refreshBatches();
    } catch (err) {
      setAssignError(err.message);
    }
  };

  const handleShowModal = async (batch) => {
    setShowAssignModal(false); // Close assign modal if open
    setShowModal(true);
    setSelectedBatch(null); // Show loading state in modal
    try {
      const res = await fetch(`/api/batches/${batch._id}/details`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedBatch(data);
      } else {
        setSelectedBatch({ _id: batch._id, orders: [], assignedDriverId: null });
      }
    } catch {
      setSelectedBatch({ _id: batch._id, orders: [], assignedDriverId: null });
    }
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBatch(null);
  };
  const handleShowAssignModal = (batch) => {
    setShowModal(false); // Close details modal if open
    setSelectedBatch(batch);
    setShowAssignModal(true);
  };

  if (loading) return <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  // Calculate summary stats
  // Ready batches: Batches without driver assignment that are not completed
  const readyBatches = batches.filter(b => 
    !b.assignedDriverId && 
    b.status !== 'COMPLETED'
  ).length;
  
  // Assigned batches: Batches with driver assignment that are not completed
  const assignedBatches = batches.filter(b => 
    b.assignedDriverId && 
    b.status !== 'COMPLETED'
  ).length;
  
  // Completed batches: Batches marked as completed
  const completedBatches = batches.filter(b => b.status === 'COMPLETED').length;

  return (
    <div className="mb-4">
      <h4 className="mb-3">Batch Management</h4>
      <div className="row mb-3 g-3">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 bg-light">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle bg-info bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <FontAwesomeIcon icon={faTruck} className="text-info" />
              </div>
              <div>
                <div className="fw-bold fs-5">{readyBatches}</div>
                <div className="text-muted small">Ready Batches</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 bg-light">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle bg-success bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <FontAwesomeIcon icon={faCheckCircle} className="text-success" />
              </div>
              <div>
                <div className="fw-bold fs-5">{assignedBatches}</div>
                <div className="text-muted small">Assigned Batches</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 shadow-sm border-0 bg-light">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-circle bg-primary bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <FontAwesomeIcon icon={faCheckCircle} className="text-primary" />
              </div>
              <div>
                <div className="fw-bold fs-5">{completedBatches}</div>
                <div className="text-muted small">Completed Batches</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.25rem' }}>
        <table className="table table-bordered table-striped mb-0">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Status</th>
              <th>Pincode</th>
              <th>Orders</th>
              <th>Weight (kg)</th>
              <th>Value</th>
              <th>Driver</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(batch => (
              <tr key={batch._id}>
                <td>{batch._id.slice(-5).toUpperCase()}</td>
                <td>
                  {batch.status === 'COMPLETED' ? (
                    <span className="badge bg-primary">Completed</span>
                  ) : batch.assignedDriverId ? (
                    <span className="badge bg-success">Assigned</span>
                  ) : (
                    <span className="badge bg-warning text-dark">Unassigned</span>
                  )}
                </td>
                <td>{batch.orders[0]?.pincode || '-'}</td>
                <td>{batch.orders.length}</td>
                <td>{batch.totalWeight}</td>
                <td>₹{batch.orders.reduce((sum, o) => sum + (o.amount || 0), 0)}</td>
                <td>{batch.assignedDriverId ? batch.assignedDriverId.name : '-'}</td>
                <td>
                  {batch.status !== 'COMPLETED' && !batch.assignedDriverId && (
                    <button className="btn btn-sm btn-primary" onClick={() => handleAssignClick(batch)}>
                      <FontAwesomeIcon icon={faUserPlus} className="me-1" /> Assign Driver
                    </button>
                  )}
                  <Button variant="info" size="sm" onClick={() => handleShowModal(batch)} className="ms-2">
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Batch Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedBatch && <div>Loading batch details...</div>}
          {selectedBatch && (
            <div>
              <div><b>Batch ID:</b> {selectedBatch._id}</div>
              <div><b>Status:</b> 
                {selectedBatch.status === 'COMPLETED' ? (
                  <span className="badge bg-primary ms-2">Completed</span>
                ) : selectedBatch.assignedDriverId ? (
                  <span className="badge bg-success ms-2">Assigned</span>
                ) : (
                  <span className="badge bg-warning text-dark ms-2">Unassigned</span>
                )}
              </div>
              <div><b>Assigned Driver:</b> {selectedBatch.assignedDriverId
                ? (selectedBatch.assignedDriverId.name || selectedBatch.assignedDriverId.email || selectedBatch.assignedDriverId._id)
                : 'Unassigned'}</div>
              <div><b>Total Weight:</b> {selectedBatch.orders.reduce((sum, o) => sum + (o.weight || 0), 0)} kg</div>
              <div><b>Number of Orders:</b> {selectedBatch.orders.length}</div>
              {selectedBatch.status === 'COMPLETED' && (
                <>
                  <div><b>Completed At:</b> {new Date(selectedBatch.completedAt).toLocaleString()}</div>
                  <div><b>Completion Notes:</b> {selectedBatch.completionNotes || 'All orders delivered successfully'}</div>
                </>
              )}
              <hr />
              <h5>Orders</h5>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Pincode</th>
                    <th>Weight</th>
                    <th>Amount</th>
                    <th>Payment Type</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.orders.map(order => (
                    <tr key={order._id}>
                      <td>{order.address}</td>
                      <td>{order.pincode}</td>
                      <td>{order.weight}</td>
                      <td>{order.amount || '-'}</td>
                      <td>{order.paymentType}</td>
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
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Assign Driver</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {assignMsg && <Alert variant="success">{assignMsg}</Alert>}
          {assignError && <Alert variant="danger">{assignError}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Select Driver</Form.Label>
            <Form.Select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} required>
              <option value="">Select a driver</option>
              {drivers.map(driver => (
                <option key={driver._id} value={driver._id}>{driver.name} ({driver.email})</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignDriver}>
            <FontAwesomeIcon icon={faUserPlus} className="me-1" /> Assign
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default BatchManagementPanel; 