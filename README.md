<div align="center">

# ✅ TaskDo — Enterprise-Grade Task Management Platform

**A full-stack, production-ready task management application with authentication, cloud sync, and premium features.**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5?style=flat-square&logo=kubernetes&logoColor=white)](https://kubernetes.io)

</div>

---

## 📖 Overview

**TaskDo** is a production-grade, full-stack task management platform built for scalability, security, and user experience. Unlike simple todo apps, TaskDo provides enterprise-level features including secure authentication, cloud synchronization, subscription management, two-factor authentication, and comprehensive deployment options.

The application is containerized with Docker, supports Kubernetes orchestration, and can be deployed on cloud platforms like Render with zero configuration.

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
- **Redis Caching**: Session and subscription data cached for speed
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
│  MongoDB (Persistent) │ Redis (Session/Cache)       │
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
MongoDB/Redis Storage
```

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

### DevOps & Deployment
| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Kubernetes** | Production orchestration |
| **Nginx** | Reverse proxy and static file serving |
| **Render** | Cloud deployment platform |
| **GitHub Actions** | CI/CD (via Render auto-deploy) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **MongoDB** (local or Atlas)
- **Redis** (optional, for caching)
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
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_key

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
│   │   ├── redis.ts             # Redis caching
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

---

## 💰 Subscription Tiers

| Feature | Free Tier | Premium |
|---------|-----------|---------|
| Task Limit | 50 tasks | Unlimited |
| Cloud Sync | ✅ | ✅ |
| Authentication | ✅ | ✅ |
| Two-Factor Auth | ✅ | ✅ |
| Priority Support | ❌ | ✅ |
| Price | $0/month | $9.99/month |

---

## 🗺️ Roadmap

### Phase 1: Core Enhancements ✅
- [x] Full-stack authentication
- [x] Cloud synchronization
- [x] Database integration
- [x] Docker containerization
- [x] Two-factor authentication
- [x] Stripe payment integration

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

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party libraries and resources used in this project.

---

<div align="center">

**Built with ❤️ by [VijayPant375](https://github.com/VijayPant375)**

⭐ Star this repo if you find it helpful!

</div>
