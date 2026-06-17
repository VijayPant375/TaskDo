<div align="center">

# ✅ TaskDo — Enterprise-Grade Task Management Platform

**A full-stack, production-ready task management application with authentication, cloud sync, premium features, and self-healing AWS infrastructure.**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?style=flat-square&logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![AWS](https://img.shields.io/badge/AWS-Cloud_Infrastructure-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com)

</div>

---

## 📖 Overview

**TaskDo** is a production-grade, full-stack task management platform built for scalability, security, and user experience. Unlike simple todo apps, TaskDo provides enterprise-level features including secure authentication, cloud synchronization, subscription management, two-factor authentication, and comprehensive deployment options.

The application is containerized with Docker, supports Kubernetes orchestration, and is backed by a **self-healing AWS cloud infrastructure** — with Redis hosted on AWS EC2 managed by an Auto Scaling Group that automatically replaces failed instances without manual intervention.

---

## ✨ Core Features

### 🔐 Authentication & Security
- **Multi-Provider Authentication**: Email/password and Google OAuth 2.0 support
- **JWT-Based Sessions**: Secure access and refresh token implementation
- **Two-Factor Authentication (2FA)**: TOTP-based MFA with QR code setup
- **Encrypted Storage**: Task data encrypted at rest using AES-256
- **Rate Limiting**: Built-in protection against brute force attacks
- **Secure Cookies**: HTTPOnly cookies with CSRF protection

### ✅ Task Management
- **Full CRUD Operations**: Create, read, update, and delete tasks
- **Priority Levels**: High, Medium, and Low priority classification
- **Deadline Tracking**: Set and manage task due dates
- **Notifications**: Enable alarms and reminders for upcoming tasks
- **Task Completion**: Mark tasks as complete with visual indicators
- **Bulk Import**: Import tasks from external sources

### 💎 Premium Features (Stripe Integration)
- **Subscription Management**: Free tier (50 tasks) and unlimited premium tier
- **Stripe Payment Processing**: Secure payment handling via Stripe API
- **Usage Tracking**: Real-time task count monitoring
- **Subscription Caching**: Redis-backed subscription state for performance

### ⚡ Performance & Scalability
- **Redis Caching**: Session and subscription data cached on a dedicated AWS EC2 instance
- **MongoDB Database**: Scalable NoSQL storage with indexing
- **Horizontal Pod Autoscaling**: Kubernetes HPA configuration included
- **Health Checks**: Comprehensive health monitoring endpoints
- **Connection Pooling**: Optimized database connections

---

## 🏗️ Architecture

TaskDo follows a modern microservices-inspired architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                      │
│  React 18 + TypeScript + TailwindCSS + Radix UI     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                 API Gateway (Express)                │
│  CORS │ Rate Limiting │ JWT Validation │ Routing    │
└─────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Auth      │  │   Tasks     │  │  Payments   │
│  Service    │  │  Service    │  │  (Stripe)   │
└─────────────┘  └─────────────┘  └─────────────┘
          │              │              │
          ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│              Data & Cache Layer                      │
│  MongoDB (Persistent) │ Redis on AWS EC2 (Cache)    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│             AWS Cloud Infrastructure                 │
│  Auto Scaling Group │ AMI │ Launch Template         │
└─────────────────────────────────────────────────────┘
```

### Data Flow
```
User Action (UI)
    ↓
React Hook (useAuth, useTasks)
    ↓
API Service Layer (auth.ts, tasks.ts)
    ↓
Express Route Handler (auth.ts, mfa.ts)
    ↓
Controller Logic (authController.ts)
    ↓
Database Operations (store.ts)
    ↓
MongoDB (Persistent Storage) / Redis on AWS EC2 (Cache)
```

---

## ☁️ Cloud Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TaskDo Cloud Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────┐         ┌──────────────────────────────┐     │
│   │  React Frontend  │────────▶│  Node.js / Express Backend   │     │
│   │  (Render / CDN)  │         │        (Render)               │     │
│   └──────────────────┘         └──────────────┬───────────────┘     │
│                                               │                      │
│                          ┌────────────────────┼─────────────────┐   │
│                          ▼                    ▼                  ▼   │
│               ┌──────────────────┐  ┌─────────────────┐             │
│               │  MongoDB Atlas   │  │  Redis Cache    │             │
│               │  (Persistent DB) │  │  (AWS EC2)      │             │
│               └──────────────────┘  └────────┬────────┘             │
│                                              │                       │
│                          ┌───────────────────▼───────────────────┐  │
│                          │         AWS Auto Scaling Group         │  │
│                          │  ┌─────────────────────────────────┐  │  │
│                          │  │  Desired: 1 │ Min: 1 │ Max: 1   │  │  │
│                          │  └─────────────────────────────────┘  │  │
│                          │           ▲               ▲            │  │
│                          │    ┌──────┴──────┐ ┌──────┴──────┐   │  │
│                          │    │  AMI Snapshot│ │Launch Template│  │  │
│                          │    │ (Redis Config)│ │(Instance Type │  │  │
│                          │    │              │ │ + SG + Keys)  │  │  │
│                          │    └─────────────┘ └─────────────┘   │  │
│                          └───────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ High Availability & Cloud Infrastructure

TaskDo's caching layer is hosted on **AWS EC2** and managed by a **self-healing Auto Scaling Group**, making the infrastructure resilient to failures without any manual intervention.

### 🔴 Redis on AWS EC2

- Redis is deployed on a dedicated EC2 instance rather than a shared container, giving it isolated compute resources and stable network identity.
- The backend connects to the Redis instance via its cloud-hosted endpoint, using it as a high-performance caching layer between Express and MongoDB.
- Redis caches JWT session data, subscription status, and frequently-accessed records to reduce database load and improve response times.

### 🔄 Auto Scaling Group (ASG)

| Parameter | Value |
|-----------|-------|
| **Desired Capacity** | 1 |
| **Minimum Capacity** | 1 |
| **Maximum Capacity** | 1 |

The ASG continuously monitors the health of the Redis EC2 instance. If the instance becomes unhealthy or is terminated, AWS automatically provisions a replacement using the stored AMI and Launch Template — no manual recovery required.

### 🖼️ Amazon Machine Image (AMI)

The Redis server configuration — including installed packages, configuration files, and startup settings — is captured as a custom AMI. When the ASG needs to launch a replacement instance, it uses this AMI to guarantee the new server is production-ready from the first boot.

### 📋 Launch Template

A dedicated AWS Launch Template standardizes every Redis EC2 instance with the following:

- **Instance Type**: Configured for Redis workload requirements
- **AMI**: Points to the custom Redis AMI
- **Security Groups**: Network rules restricting Redis port access to the backend only
- **Key Pair**: SSH access for authorized administrators
- **Networking**: VPC subnet and availability zone settings

### ✅ Fault Tolerance Demonstration

The self-healing capability was validated by manually terminating the Redis EC2 instance and observing the Auto Scaling Group automatically launch a fresh replacement. The backend reconnected without any code changes or operator intervention, confirming production-grade resilience.

### 💡 Cost Optimization

Using a desired/min/max capacity of **1/1/1** ensures exactly one Redis instance is always running — no over-provisioning, no under-provisioning. This is ideal for a production workload where Redis is a single-point caching layer and cost control matters.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18.3.1** | UI framework with hooks and context |
| **TypeScript 5.8.2** | Type-safe development |
| **Vite 6.3.5** | Fast build tool and dev server |
| **TailwindCSS 4.1** | Utility-first styling |
| **Radix UI** | Accessible component primitives |
| **Lucide React** | Icon library |
| **React Hook Form** | Form validation and management |
| **date-fns** | Date manipulation utilities |
| **React DnD** | Drag-and-drop functionality |
| **Recharts** | Data visualization |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | RESTful API server |
| **TypeScript** | Type-safe backend code |
| **MongoDB + Mongoose** | NoSQL database and ODM |
| **Redis (ioredis)** | Session and subscription caching |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcrypt** | Password hashing |
| **Speakeasy** | TOTP-based 2FA |
| **Stripe API** | Payment processing |
| **cors** | Cross-origin resource sharing |
| **express-rate-limit** | API rate limiting |
| **Jest + Supertest** | Integration testing |

### DevOps & Deployment
| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Kubernetes** | Production orchestration |
| **Nginx** | Reverse proxy and static file serving |
| **Render** | Cloud deployment platform |
| **GitHub Actions** | CI/CD pipeline with automated tests + Render auto-deploy |
| **AWS EC2** | Dedicated Redis cache hosting |
| **AWS Auto Scaling Groups** | Self-healing instance management |
| **Amazon Machine Images (AMI)** | Reproducible server snapshots |
| **AWS Launch Templates** | Standardized instance provisioning |
| **AWS Security Groups** | Network access control |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **MongoDB** (local or Atlas)
- **Redis** (local, Docker, or AWS EC2)
- **Docker & Docker Compose** (for containerized deployment)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/VijayPant375/Taskdo.git
cd Taskdo
```

2. **Install dependencies**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm --prefix server install
```

3. **Configure environment variables**

Create `server/.env`:
```env
# Database
MONGO_URI=mongodb://localhost:27017/taskdo
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ENCRYPTION_KEY=your-32-byte-encryption-key

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Stripe (Optional)
STRIPE_SECRET_KEY=stripe_secret_key_here

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

4. **Start MongoDB and Redis** (if running locally)
```bash
# Using Docker
docker run -d -p 27017:27017 --name taskdo-mongo mongo:7
docker run -d -p 6379:6379 --name taskdo-redis redis:7-alpine
```

> **Production Note:** In production, `REDIS_URL` points to the AWS EC2-hosted Redis instance managed by the Auto Scaling Group.

5. **Run the application**
```bash
# Terminal 1: Start backend
npm run server:dev

# Terminal 2: Start frontend
npm run dev
```

6. **Open in browser**
```
http://localhost:5173
```

---

## 🐳 Docker Deployment

### Using Docker Compose

1. **Build and start all services**
```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- Redis on port 6379
- Backend API on port 3001
- Frontend on port 80

2. **View logs**
```bash
docker-compose logs -f
```

3. **Stop services**
```bash
docker-compose down
```

### Manual Docker Build

```bash
# Build frontend
docker build -t taskdo-frontend .

# Build backend
docker build -t taskdo-backend ./server
```

---

## ☸️ Kubernetes Deployment

Complete Kubernetes manifests are provided in the `k8s/` directory.

### Quick Deploy

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy secrets and config
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# Deploy databases
kubectl apply -f k8s/mongo-statefulset.yaml
kubectl apply -f k8s/mongo-service.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-proxy-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Enable autoscaling (optional)
kubectl apply -f k8s/backend-hpa.yaml
```

### Verify Deployment

```bash
kubectl get pods -n taskdo
kubectl get services -n taskdo
kubectl logs -f deployment/taskdo-backend -n taskdo
```

---

## 🌐 Render Deployment

TaskDo is configured for one-click deployment on Render.

1. **Push to GitHub**
```bash
git push origin main
```

2. **Connect to Render**
- Create a new Web Service on Render
- Connect your GitHub repository
- Render will automatically detect `render.yaml`

3. **Configure environment variables**
Add these in the Render dashboard:
- `MONGO_URI`
- `REDIS_URL` *(point to your AWS EC2 Redis endpoint)*
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `STRIPE_SECRET_KEY` (optional)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

4. **Deploy**
Render will automatically build and deploy using the configuration in `render.yaml`.

---

## 📁 Project Structure

```
Taskdo/
│
├── src/                          # Frontend source code
│   ├── api/                      # API client functions
│   │   └── auth.ts              # Authentication API calls
│   ├── app/                      # Main application
│   │   ├── App.tsx              # Root component
│   │   ├── components/           # React components
│   │   │   ├── AddEditTaskScreen.tsx
│   │   │   ├── AuthLandingScreen.tsx
│   │   │   ├── MFASetup.tsx
│   │   │   ├── MFAVerification.tsx
│   │   │   ├── NotificationsScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── SettingsMFA.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskListSkeleton.tsx
│   │   │   ├── UpgradeModal.tsx
│   │   │   └── ui/              # Radix UI components
│   │   └── hooks/               # Custom React hooks
│   ├── context/                 # React context providers
│   ├── services/                # Business logic layer
│   │   ├── api.ts              # Base API configuration
│   │   ├── auth.ts             # Auth service
│   │   ├── mfa.ts              # MFA service
│   │   ├── stripe.ts           # Stripe integration
│   │   ├── tasks.ts            # Task management
│   │   └── subscriptionStorage.ts
│   ├── styles/                  # Global styles
│   ├── types/                   # TypeScript definitions
│   │   ├── auth.ts
│   │   ├── subscription.ts
│   │   └── task.ts
│   └── main.tsx                 # Application entry point
│
├── server/                       # Backend source code
│   ├── controllers/              # Route controllers
│   │   └── authController.ts
│   ├── data/                     # Static data and seeds
│   ├── lib/                      # Core utilities
│   │   ├── cookies.ts           # Cookie management
│   │   ├── db.ts                # MongoDB connection
│   │   ├── env.ts               # Environment validation
│   │   ├── redis.ts             # Redis caching (AWS EC2)
│   │   ├── store.ts             # Data access layer
│   │   └── tokens.ts            # JWT and crypto utilities
│   ├── middleware/               # Express middleware
│   │   └── auth.ts              # Authentication middleware
│   ├── models/                   # Mongoose schemas
│   │   └── User.ts
│   ├── routes/                   # API routes
│   │   ├── auth.ts              # Auth endpoints
│   │   └── mfa.ts               # MFA endpoints
│   ├── index.ts                  # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── k8s/                          # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── mongo-statefulset.yaml
│   ├── mongo-service.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── backend-proxy-service.yaml
│   ├── backend-hpa.yaml
│   ├── frontend-deployment.yaml
│   └── frontend-service.yaml
│
├── dist/                         # Production build output
├── guidelines/                   # Design guidelines
│   └── Guidelines.md
│
├── docker-compose.yml            # Multi-container setup
├── Dockerfile                    # Frontend container
├── nginx.conf                    # Nginx configuration
├── render.yaml                   # Render deployment config
├── vite.config.ts               # Vite configuration
├── postcss.config.mjs           # PostCSS configuration
├── package.json                  # Frontend dependencies
├── ATTRIBUTIONS.md              # Third-party credits
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register        # Create new account
POST   /api/auth/login           # Email/password login
POST   /api/auth/logout          # Logout and clear session
POST   /api/auth/refresh         # Refresh access token
GET    /api/auth/me              # Get current user
DELETE /api/auth/account         # Delete account
POST   /api/auth/import-tasks    # Import tasks from local storage

# Google OAuth
GET    /api/auth/google          # Initiate OAuth flow
GET    /api/auth/google/callback # OAuth callback handler
```

### Multi-Factor Authentication
```
POST   /api/mfa/setup            # Generate MFA secret and QR code
POST   /api/mfa/verify           # Verify TOTP token
POST   /api/mfa/disable          # Disable MFA
```

### Tasks
```
GET    /api/tasks                # List all user tasks
POST   /api/tasks                # Create new task
PUT    /api/tasks/:id            # Update existing task
DELETE /api/tasks/:id            # Delete task
```

### Subscriptions
```
GET    /api/subscription         # Get subscription status
POST   /api/subscription/checkout # Create Stripe checkout session
POST   /api/subscription/portal  # Access customer portal
```

### Health & Status
```
GET    /api/health               # Health check endpoint
```

---

## 🔐 Security Features

1. **Password Security**
   - bcrypt hashing with salt rounds
   - Minimum password requirements enforced
   - Secure password reset flow

2. **Token Management**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (14 days)
   - Secure token rotation on refresh
   - HTTPOnly cookies prevent XSS attacks

3. **Two-Factor Authentication**
   - TOTP-based (Google Authenticator compatible)
   - QR code generation for easy setup
   - Backup codes for recovery
   - Token verification with time-based validation

4. **Data Encryption**
   - Task data encrypted at rest using AES-256
   - Secure key management via environment variables
   - User-specific encryption keys

5. **API Protection**
   - Rate limiting on authentication endpoints
   - CORS policy enforcement
   - Request validation and sanitization
   - MongoDB injection prevention

6. **Cloud Network Security**
   - AWS Security Groups restrict Redis port access to backend services only
   - No public internet exposure to the Redis EC2 instance
   - SSH key-pair access for administrative operations

---

## 💰 Subscription Tiers

| Feature | Free Tier | Premium |
|---------|-----------|---------|
| Task Limit | 50 tasks | Unlimited |
| Cloud Sync | ✅ | ✅ |
| Authentication | ✅ | ✅ |
| Two-Factor Auth | ✅ | ✅ |
| Priority Support | ❌ | ✅ |
| Price | $0/month | $4.99/month |

---

## 🗺️ Roadmap

### Phase 1: Core Enhancements ✅
- [x] Full-stack authentication
- [x] Cloud synchronization
- [x] Database integration
- [x] Docker containerization
- [x] Two-factor authentication
- [x] Stripe payment integration
- [x] AWS EC2 Redis deployment
- [x] Auto Scaling Group & self-healing infrastructure
- [x] AMI + Launch Template provisioning

### Phase 2: Advanced Features 🚧
- [ ] Task categories and tags
- [ ] Collaborative workspaces
- [ ] Task sharing and permissions
- [ ] Advanced filtering and search
- [ ] Recurring tasks
- [ ] Task dependencies

### Phase 3: Platform Expansion 📋
- [ ] Mobile applications (React Native)
- [ ] Desktop applications (Electron)
- [ ] Browser extensions
- [ ] Calendar integrations
- [ ] Email notifications
- [ ] Slack/Teams integration

### Phase 4: Analytics & AI 🔮
- [ ] Task analytics dashboard
- [ ] Productivity insights
- [ ] AI-powered task suggestions
- [ ] Automated priority detection
- [ ] Smart deadline recommendations

---

## 🧪 Testing

The backend includes an integration test suite covering critical auth and task CRUD routes.

- **Framework:** Jest + Supertest
- **Coverage:** 15 tests across auth flows (signup, login, session) and task routes (list, create, update, delete, validation)
- **Approach:** MongoDB layer is fully mocked for fast, isolated runs — no live database required
- **CI:** Tests run automatically on every push via GitHub Actions

To run tests locally:
```bash
cd server
npm test
```

```bash
# Run frontend tests
npm test

# Run backend tests
npm --prefix server test

# Run end-to-end tests
npm run test:e2e

# Check code coverage
npm run test:coverage
```

---

## 📊 Monitoring & Logging

- **Health Checks**: Built-in endpoints for container orchestration
- **Request Logging**: Express middleware for API request tracking
- **Error Handling**: Centralized error handling with stack traces
- **Performance Metrics**: Redis cache hit rates and response times
- **AWS CloudWatch**: EC2 instance health and Auto Scaling Group events

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure Docker builds succeed
- Verify Kubernetes manifests
- Follow AWS security best practices for any infrastructure changes

---

<div align="center">

**Built with ❤️ by [VijayPant375](https://github.com/VijayPant375)**

⭐ Star this repo if you find it helpful!

</div>