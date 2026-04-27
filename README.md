<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=220&text=ShieldWrite&fontAlign=50&fontAlignY=40&color=0:0F172A,35:1E3A8A,70:0EA5E9,100:22C55E&fontColor=ffffff&desc=Security-first%20Blogging%20Platform&descAlign=50&descAlignY=62" alt="ShieldWrite Banner" />

  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2600&pause=900&color=0EA5E9&center=true&vCenter=true&repeat=true&width=760&lines=Secure+Authentication+%7C+MFA-Ready+%7C+RBAC;Argon2+Password+Hashing+%7C+Account+Lock+Protection;Node.js+%2B+Express+%2B+MongoDB+Architecture" alt="Typing Animation" />

  <p>
    <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Framework-Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Security-Argon2-4B5563?style=for-the-badge" alt="Argon2" />
  </p>

  <p>
    <img src="https://img.shields.io/badge/Status-Active_Development-0EA5E9?style=flat-square" alt="Status" />
    <img src="https://img.shields.io/badge/Focus-Security%20First-16A34A?style=flat-square" alt="Security First" />
    <img src="https://img.shields.io/badge/License-ISC-F59E0B?style=flat-square" alt="License" />
  </p>
</div>

## Overview
ShieldWrite is a secure full-stack blogging platform built with a strong focus on authentication, authorization, and practical backend security.

This repository currently contains a working backend with:
- Signup/Login flow
- Argon2 password hashing
- Failed login tracking
- Temporary account lock and automatic unlock logic
- Role field support for RBAC expansion

## Why ShieldWrite
Modern web apps need more than basic login. ShieldWrite is designed as a learning-to-production bridge for implementing secure identity patterns and scalable backend architecture.

## Core Features

### Authentication (Implemented)
- User signup with validation
- User login with credential verification
- Password hashing and verification using Argon2

### Security Controls (Implemented)
- Failed login attempt counter
- Account auto-block after repeated failures
- Time-based lock expiry and unlock
- Brute-force resistance baseline

### RBAC Foundations (Implemented)
- User roles in schema: user, admin
- Role exposed in login response for downstream authorization

### Blog Domain Models (Implemented)
- Blog model with author relation
- Draft/published status field
- Likes, shares, and comments counters

### Comment Domain Models (Implemented)
- Comment model with user-blog relations

### Planned Enhancements
- JWT authentication and protected routes
- MFA (OTP/TOTP)
- Email verification
- Redis for caching and OTP/session workloads
- Nginx rate limiting and edge hardening
- Full React frontend

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Argon2

### Tooling
- Nodemon
- Dotenv
- CORS
- Postman

## Project Structure
```text
ShieldWrite/
|-- backend/
|   |-- server.js
|   |-- package.json
|   `-- src/
|       |-- config/
|       |   `-- db.js
|       |-- controllers/
|       |   `-- auth.Controller.js
|       |-- middleware/
|       |-- models/
|       |   |-- user.model.js
|       |   |-- blog.model.js
|       |   `-- comment.model.js
|       `-- routes/
|           `-- auth.Routes.js
|-- frontend/
`-- ngnix/
```

## Security Workflow
```mermaid
flowchart TD
    A[User Signup] --> B[Argon2 Hash Password]
    B --> C[Persist User]
    C --> D[User Login]
    D --> E{Account Blocked?}
    E -- No --> F[Verify Password]
    E -- Yes --> G{Lock Expired?}
    G -- No --> H[Reject Login]
    G -- Yes --> I[Reset Lock + Attempts]
    I --> F
    F -- Invalid --> J[Increase Failed Attempts]
    J --> K{Attempts >= 3}
    K -- Yes --> L[Block Account + Set lockuntil]
    K -- No --> M[Reject Login]
    F -- Valid --> N[Reset Failed Attempts]
    N --> O[Login Success]
```

## API Endpoints

### Auth Routes (Current)
- POST /api/signup : Register user
- POST /api/login : Login with lock-protection checks

### Planned Routes
- Blog CRUD routes
- Comment create/fetch routes
- Admin moderation routes

## Database Design

### User
- firstName
- lastName
- age
- email (unique)
- password (hashed)
- role (user/admin)
- isVerified
- failedLoginAttempts
- accountBlocked
- lockuntil
- createdAt, updatedAt

### Blog
- title
- content
- author (User reference)
- likes
- shares
- comments
- status (draft/published)
- createdAt, updatedAt

### Comment
- text
- user (User reference)
- blog (Blog reference)
- createdAt, updatedAt

## Getting Started

### 1. Clone Repository
```bash
git clone https://github.com/<your-username>/ShieldWrite.git
cd ShieldWrite/backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file inside `backend/`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

### 4. Run in Development
```bash
npm run dev
```

### 5. Run in Production Mode
```bash
npm start
```

## Testing Checklist (Postman)
- Signup with valid payload
- Login with correct credentials
- Login with wrong password (multiple times)
- Confirm account lock after threshold
- Confirm unlock after lock duration

## Roadmap
- Add JWT issuance and auth middleware
- Add refresh token strategy
- Add MFA challenge flow (OTP/TOTP)
- Add email verification and resend flow
- Add Redis-backed OTP and throttling support
- Add Nginx rate limits and edge protections
- Complete React frontend integration
- Add Docker-based deployment

## Author
Suman Yadav,charan,mohan

## Note
ShieldWrite is a security-first learning project that mirrors real-world authentication design and backend hardening patterns.

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=80&section=footer&text=Build%20Secure.%20Ship%20Confident.&fontSize=24&color=0:22C55E,100:0EA5E9&fontColor=ffffff" alt="Footer Banner" />
</div>
