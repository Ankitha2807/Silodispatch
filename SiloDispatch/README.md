# SiloDispatch — Feed-Bag Delivery Management System

## Stack
- **Backend:** Node.js, Express.js, MongoDB (Mongoose)
- **Frontend:** React, PWA
- **Auth:** JWT, Role-based (Supervisor, Driver)

## Monorepo Structure

```
SiloDispatch/
├── backend/      # Express.js API, MongoDB models, auth, business logic
├── frontend/     # React PWA, dashboards, driver interface
├── scripts/      # Seed and evaluation scripts
├── docs/         # ERD, sequence diagrams, clustering logic, API spec
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Features
- Order upload, clustering, batch assignment
- OTP-based delivery verification
- Payment flows (UPI, COD, Prepaid)
- End-of-day settlement, finance export
- Supervisor dashboard & Driver PWA

See `backend/README.md` and `frontend/README.md` for setup instructions. 