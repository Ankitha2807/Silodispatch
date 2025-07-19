# SiloDispatch Backend

## Overview
Express.js REST API for order, batch, OTP, payment, and settlement management. Uses MongoDB (Mongoose) and JWT-based authentication.

## Folder Structure
```
backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.example
├── package.json
└── README.md
```

## Setup
1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and set values
4. `npm run dev` (or use Docker) 