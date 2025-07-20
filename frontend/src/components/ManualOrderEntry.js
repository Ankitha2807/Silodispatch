import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

function ManualOrderEntry() {
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState([{
    customerName: '',
    address: '',
    pincode: '',
    phone: '',
    weight: '',
    amount: '',
    paymentType: 'COD'
  }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAddOrder = () => {
    setOrders([...orders, {
      customerName: '',
      address: '',
      pincode: '',
      phone: '',
      weight: '',
      amount: '',
      paymentType: 'COD'
    }]);
  };

  const handleRemoveOrder = (index) => {
    if (orders.length > 1) {
      const newOrders = orders.filter((_, i) => i !== index);
      setOrders(newOrders);
    }
  };

  const handleOrderChange = (index, field, value) => {
    const newOrders = [...orders];
    newOrders[index][field] = value;
    setOrders(newOrders);
  };

  const validateOrders = () => {
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order.customerName.trim()) {
        setError(`Order ${i + 1}: Customer name is required`);
        return false;
      }
      if (!order.address.trim()) {
        setError(`Order ${i + 1}: Address is required`);
        return false;
      }
      if (!order.pincode.trim()) {
        setError(`Order ${i + 1}: Pincode is required`);
        return false;
      }
      if (!order.phone.trim()) {
        setError(`Order ${i + 1}: Phone number is required`);
        return false;
      }
      if (!order.weight || order.weight <= 0) {
        setError(`Order ${i + 1}: Weight must be greater than 0`);
        return false;
      }
      if (order.paymentType === 'COD' && (!order.amount || order.amount <= 0)) {
        setError(`Order ${i + 1}: Amount is required for COD orders`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    if (!validateOrders()) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ orders })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create orders');

      setMessage(`Successfully created ${orders.length} order(s)!`);
      setOrders([{
        customerName: '',
        address: '',
        pincode: '',
        phone: '',
        weight: '',
        amount: '',
        paymentType: 'COD'
      }]);
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setMessage('');
    setError('');
    setOrders([{
      customerName: '',
      address: '',
      pincode: '',
      phone: '',
      weight: '',
      amount: '',
      paymentType: 'COD'
    }]);
  };

  return (
    <>
      <Card className="mb-4 shadow-sm border-0 bg-light">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              <FontAwesomeIcon icon={faPlus} className="me-2 text-primary" />
              Manual Order Entry
            </h5>
            <Button 
              variant="primary" 
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Add Orders
            </Button>
          </div>
          <p className="text-muted mb-0">
            Manually enter orders one by one or add multiple orders at once. 
            Perfect for small orders or corrections.
          </p>
        </Card.Body>
      </Card>

      {/* Manual Order Entry Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Manual Order Entry
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {message && <Alert variant="success" onClose={() => setMessage('')} dismissible>{message}</Alert>}
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6>Orders ({orders.length})</h6>
              <Button variant="outline-primary" size="sm" onClick={handleAddOrder}>
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                Add Another Order
              </Button>
            </div>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {orders.map((order, index) => (
              <Card key={index} className="mb-3 border">
                <Card.Header className="d-flex justify-content-between align-items-center py-2">
                  <span className="fw-bold">Order {index + 1}</span>
                  {orders.length > 1 && (
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleRemoveOrder(index)}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Customer Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={order.customerName}
                          onChange={(e) => handleOrderChange(index, 'customerName', e.target.value)}
                          placeholder="Enter customer name"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Phone Number *</Form.Label>
                        <Form.Control
                          type="tel"
                          value={order.phone}
                          onChange={(e) => handleOrderChange(index, 'phone', e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Address *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={order.address}
                      onChange={(e) => handleOrderChange(index, 'address', e.target.value)}
                      placeholder="Enter complete address"
                    />
                  </Form.Group>
                  
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pincode *</Form.Label>
                        <Form.Control
                          type="text"
                          value={order.pincode}
                          onChange={(e) => handleOrderChange(index, 'pincode', e.target.value)}
                          placeholder="Enter pincode"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Weight (kg) *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="0"
                          value={order.weight}
                          onChange={(e) => handleOrderChange(index, 'weight', e.target.value)}
                          placeholder="Enter weight"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Payment Type</Form.Label>
                        <Form.Select
                          value={order.paymentType}
                          onChange={(e) => handleOrderChange(index, 'paymentType', e.target.value)}
                        >
                          <option value="COD">COD</option>
                          <option value="PREPAID">PREPAID</option>
                          <option value="UPI">UPI</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Amount (₹)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={order.amount}
                          onChange={(e) => handleOrderChange(index, 'amount', e.target.value)}
                          placeholder="Enter amount"
                          disabled={order.paymentType === 'PREPAID'}
                        />
                        {order.paymentType === 'PREPAID' && (
                          <Form.Text className="text-muted">
                            Amount will be set to 0 for PREPAID orders
                          </Form.Text>
                        )}
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            disabled={loading}
            className="d-flex align-items-center"
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Creating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="me-2" />
                Create Orders
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ManualOrderEntry; 