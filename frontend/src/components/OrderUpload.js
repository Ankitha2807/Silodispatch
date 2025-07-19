import React, { useState } from 'react';
import { Button, Form, Alert, Spinner, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faCogs, faDownload, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

function OrderUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');
  const [batchError, setBatchError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!file) return setError('Please select a CSV file.');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/orders/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setMessage('Orders uploaded successfully!');
      setFile(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleGenerateBatches = async () => {
    setBatchMsg('');
    setBatchError('');
    setBatchLoading(true);
    try {
      const res = await fetch('/api/batches/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Batch generation failed');
      setBatchMsg('Batches generated successfully!');
    } catch (err) {
      setBatchError(err.message);
    }
    setBatchLoading(false);
  };

  return (
    <Card className="mb-4 shadow-sm border-0 bg-light">
      <Card.Body>
        <Row className="mb-3 g-2 align-items-center">
          <Col md={8} sm={12}>
            <Card className="mb-2 bg-white border-0 shadow-sm">
              <Card.Body className="py-2 px-3 d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faInfoCircle} className="text-info me-2" />
                <div>
                  <span className="fw-bold">CSV Format:</span> <span className="text-muted small">customerName, address, pincode, phone, weight, amount, paymentType</span><br />
                  <span className="text-muted small">Example: John Doe, 123 Main St, 560001, 9876543210, 25, 1200, PREPAID</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} sm={12} className="text-md-end text-sm-start mb-2 mb-md-0">
            <a href="/order_template.csv" download className="btn btn-outline-primary d-flex align-items-center justify-content-center w-100 w-md-auto">
              <FontAwesomeIcon icon={faDownload} className="me-2" /> Download Template
            </a>
          </Col>
        </Row>
        <Row className="align-items-end g-2">
          <Col md={7} sm={12}>
            <Form onSubmit={handleUpload} className="d-flex gap-2 align-items-end">
              <Form.Group controlId="formFile" className="mb-0 flex-grow-1">
                <Form.Label className="fw-bold mb-1">Upload Orders (CSV)</Form.Label>
                <Form.Control type="file" accept=".csv" onChange={handleFileChange} disabled={loading} />
              </Form.Group>
              <Button type="submit" variant="primary" disabled={loading} className="d-flex align-items-center">
                {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FontAwesomeIcon icon={faUpload} className="me-2" />}
                Upload
              </Button>
            </Form>
          </Col>
          <Col md={5} sm={12} className="mt-2 mt-md-0">
            <Button variant="success" onClick={handleGenerateBatches} disabled={batchLoading} className="w-100 d-flex align-items-center justify-content-center">
              {batchLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <FontAwesomeIcon icon={faCogs} className="me-2" />}
              Generate Batches
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={12}>
            {message && <Alert variant="success" onClose={() => setMessage('')} dismissible>{message}</Alert>}
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {batchMsg && <Alert variant="success" onClose={() => setBatchMsg('')} dismissible>{batchMsg}</Alert>}
            {batchError && <Alert variant="danger" onClose={() => setBatchError('')} dismissible>{batchError}</Alert>}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default OrderUpload; 