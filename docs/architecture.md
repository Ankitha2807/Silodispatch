# SiloDispatch System Architecture

## 🏗️ System Overview
SiloDispatch is a full-stack delivery management platform optimizing route planning, batch generation, driver assignment, payment, and settlement using advanced clustering and real-time tracking.

## 📊 Architecture Diagram
```
┌──────────────────────────────────────────────────────────────┐
│                      SILODISPATCH SYSTEM                    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │  FRONTEND    │   │   BACKEND    │   │   DATABASE   │      │
│  │ (React.js)   │<->│ (Node.js)    │<->│  (MongoDB)   │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │  EXTERNAL    │   │ ALGORITHMS   │   │  ANALYTICS   │      │
│  │  SERVICES    │   │ (Clustering) │   │  & REPORTS   │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## 🛠️ Technical Stack
- **Frontend**: React.js, React Bootstrap, React Router, Fetch API
- **Backend**: Node.js, Express.js, Mongoose, JWT, Multer, csv-parse
- **Database**: MongoDB, geospatial indexes, referenced documents
- **External**: OpenCage API (geocoding), Razorpay (payments)

## 🗂️ Core Models
- **User**: { name, email, passwordHash, role }
- **Order**: { address, pincode, weight, paymentType, customerName, customerPhone, amount, status }
- **Batch**: { orders, assignedDriverId, totalWeight, status, createdAt, completedAt }
- **Payment**: { orderId, amount, method, status, createdAt }
- **DriverAction**: { driverId, orderId, batchId, action, timestamp }
- **CashLedger**: { driverId, orderId, amount, type, settledBy, createdAt }
- **SettlementRequest**: { driverId, batchId, cashEntries, payments, approvedBy, status }
- **OTP**: { orderId, code, createdAt, expiresAt }

## 🔄 Key Workflows
- **Authentication**: JWT, role-based access
- **Order Upload**: CSV/manual, validation, DB storage
- **Batch Generation**: K-Means clustering, geocoding, constraint splitting, DB persistence
- **Driver Assignment**: Supervisor assigns drivers to batches
- **Delivery Workflow**: Driver marks actions, collects payments, submits settlements
- **Payment & Settlement**: Real-time payment status, settlement requests, supervisor approval
- **Summary & Analytics**: Supervisor dashboard, trends, revenue, order stats

## 🧠 Clustering & Optimization
- **K-Means clustering** with real geocoding (OpenCage)
- **Constraints**: max 30 orders, 25kg per batch
- **Splitting**: Oversized clusters split by constraints
- **Persistence**: Batches saved, orders marked as ASSIGNED

## 🔒 Security
- JWT authentication, password hashing, role-based access, input validation, CORS, rate limiting

## 🚀 Deployment
- Dev: `./scripts/setup.sh`, local MongoDB
- Prod: Nginx, PM2, environment variables, Docker (optional)

## 📈 Monitoring & Analytics
- System metrics, error logs, audit logs, business KPIs

## 📚 API Endpoints (see API.yaml for full spec)
- `/api/auth/*`, `/api/orders/*`, `/api/batches/*`, `/api/users/*`, `/api/summary/*`, `/api/settlement/*`, `/api/otp/*`, `/api/finance/*` 