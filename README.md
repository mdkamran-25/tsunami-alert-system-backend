# Tsunami Alert System - Backend API

GraphQL API backend for the Tsunami Early Warning System. Built with Apollo Server 4, Node.js, TypeScript, and Supabase (PostgreSQL with PostGIS).

**Focus: GPS and Satellite Imagery based Tsunami Alert Mechanism**

## 🎯 Core Features

- **GPS Monitoring**: Real-time seismic station data (displacement, magnitude)
- **Satellite Imagery**: Ocean anomaly detection from satellite data
- **Alert Management**: Create and manage tsunami alerts based on GPS/Satellite triggers
- **Real-time Updates**: WebSocket subscriptions for live data
- **GraphQL API**: Efficient querying and mutations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free at https://supabase.com)
- PostgreSQL database

### Installation

1. **Clone and install dependencies**

   ```bash
   cd tsunami-alert-backend
   npm install
   ```

2. **Setup environment**

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase connection string
   nano .env
   ```

3. **Initialize database**

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Access the API**
   - GraphQL API: http://localhost:4000/graphql
   - Health Check: http://localhost:4000/health

## 📋 Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot-reload
npm run build           # Build TypeScript
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Create migration
npm run db:push         # Push schema to DB
npm run db:seed         # Seed initial data
npm run db:studio       # Open Prisma Studio

# Docker
npm run docker:up       # Start Redis container (optional)
npm run docker:down     # Stop Redis container
npm run docker:logs     # View Redis logs

# Quality
npm run lint            # ESLint check
npm run lint:fix        # Fix ESLint issues
npm run format          # Prettier format
npm run type-check      # TypeScript check
npm run test            # Run Jest tests
```

## 📁 Project Structure

```
src/
├── config/             # Apollo Server & Express config
├── lib/                # Database, Prisma clients
├── resolvers/          # GraphQL resolvers (Query, Mutation)
├── schemas/            # GraphQL type definitions
├── services/           # Business logic (GPS, Satellite, Detection)
├── types/              # TypeScript types & interfaces
├── utils/              # Helpers (JWT, crypto, auth guards)
└── index.ts            # Server entry point

prisma/
├── schema.prisma       # Database schema
└── seed.ts             # Seed data

scripts/
└── init-db.sql         # Database initialization

```

## 🔐 Authentication

- **JWT tokens** for API requests (Bearer token in Authorization header)
- **bcrypt** password hashing for signup/login
- **Role-based access control** (ADMIN, OPERATOR, VIEWER)

### Getting a Token

1. Sign up or log in via GraphQL mutations:
   ```graphql
   mutation {
     login(email: "user@example.com", password: "password") {
       token
       refreshToken
       expiresIn
       user {
         id
         email
         role
       }
     }
   }
   ```
2. Use token in subsequent requests:
   ```
   Authorization: Bearer <jwt-token>
   ```

## 📊 GraphQL API Overview

### Queries

- `currentAlertStatus` - Current alert status across all regions
- `alertHistory()` - Paginated alert history with filtering
- `alertsByRegion(region)` - Alerts for specific region
- `gpsReadings()` - GPS station displacement data with filters
- `gpsStations()` - List all GPS stations
- `satelliteData()` - Satellite imagery with anomaly scores
- `latestSatelliteData(region)` - Most recent satellite data
- `systemHealth` - Overall system health status
- `componentHealth(name)` - Individual component status
- `performanceMetrics(hours)` - Time-series performance data
- `notificationHistory()` - Notification delivery logs
- `me` - Current user profile

### Mutations

- `acknowledgeAlert(alertId)` - Mark alert as acknowledged
- `resolveAlert(alertId, notes)` - Resolve/close an alert
- `triggerAnalysis(region)` - Run detection algorithm
- `sendTestAlert(message, recipients)` - Send test notification
- `runHealthCheck()` - Perform system health diagnostic
- `restartComponent(name)` - Restart specific component
- `updateProfile(displayName, photoURL)` - Update user profile
- `updatePreferences(preferences)` - Save user preferences
- `clearCache()` - Clear application cache

### Subscriptions

- `alertStatusUpdated` - Real-time alert changes
- `newGPSReading` - New GPS station measurement
- `newSatelliteData` - New satellite imagery
- `systemHealthUpdated` - Health status changes
- `detectionResultUpdated` - Analysis results
- `notificationSent(userId)` - Notification delivery events

## 🗄️ Database Schema

### Core Entities

- **User** - User accounts with JWT auth
- **GPSStation** - GPS monitoring station metadata
- **GPSReading** - Time-series GPS displacement data (hypertable)
- **SatelliteData** - Satellite imagery with anomaly scores (hypertable)
- **AlertStatusRecord** - Alert history and status tracking
- **DetectionResult** - Anomaly detection results
- **SystemHealth** - System health metrics
- **Notification** - Alert notification delivery tracking

### Indexes for Performance

- GPS station location (geo-spatial)
- Satellite region queries
- Alert status by region
- Time-range queries (TimescaleDB optimized)

## 🔄 Real-Time Features

### WebSocket Subscriptions

Subscriptions are available at the same `/graphql` endpoint:

```graphql
subscription OnAlertUpdate {
  alertStatusUpdated {
    alertId
    status
    confidence
    message
    region
  }
}
```

### PubSub Integration

Uses GraphQL-WS with Redis for distributed pub/sub across multiple server instances.

## 🚦 Health Checks

### Endpoints

- `GET /health` - Basic health check
- `GET /ready` - Ready for traffic check
- `GET /graphql` - GraphQL playground (dev only)

### Component Health

Check individual service health:

```graphql
query {
  componentHealth(componentName: "Database") {
    status
    responseTime
    errorRate
    lastCheck
  }
}
```

## 🔌 External Integrations

### GPS Data Sources

- USGS Earthquake Hazards Program API
- PBO (Plate Boundary Observatory) network

### Satellite Data

- Google Earth Engine API
- Sentinel Hub (ESA)
- NOAA data services

### Notifications

- SendGrid (Email)
- Twilio (SMS)

## 📈 Performance Features

### Time-Series Optimization

- TimescaleDB hypertables for GPS readings & satellite data
- Automatic data compression (>1 hour old)
- Efficient aggregation queries

### Caching

- Redis for session storage
- Query result caching
- Real-time invalidation

### Monitoring

- Request/response logging
- Error tracking
- Performance metrics collection
- APM integration ready (Sentry, DataDog)

## 🛡️ Security

- CORS protection
- Helmet.js security headers
- JWT token validation on protected routes
- Role-based access control (RBAC)
- Input validation with Zod
- Rate limiting (implement based on needs)

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📝 Environment Variables

```env
# Server
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tsunami_alert

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🚀 Deployment

### Docker Build

```bash
docker build -t tsunami-alert-api .
docker run -p 4000:4000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  tsunami-alert-api
```

### Cloud Deployment

- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **AWS**: ECS + RDS
- **Google Cloud**: Cloud Run + Cloud SQL

## 📚 API Documentation

### Example Query

```graphql
query GetCurrentStatus {
  currentAlertStatus {
    status
    level
    confidence
    message
    region
    affectedAreas
  }
  systemHealth {
    overallStatus
    uptime
    components {
      name
      status
      responseTime
    }
  }
}
```

### Example Mutation

```graphql
mutation TriggerAnalysis {
  triggerAnalysis(region: "Pacific Northwest") {
    id
    gpsAnomalyDetected
    satelliteAnomalyDetected
    combinedConfidence
    timestamp
  }
}
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check connection
npm run db:studio

# Reset migrations
npx prisma migrate reset
```

### Redis Connection Issues

```bash
# Check Redis
docker exec tsunami-redis redis-cli ping
```

### GraphQL Schema Errors

```bash
# Regenerate
npm run db:generate
```

## 📞 Support

- Issues: GitHub Issues
- Documentation: GraphQL Playground (http://localhost:4000/graphql)
- Email: team@tsunami-alert.system

## 📄 License

MIT
# Railway redeploy trigger - Fri Apr 17 03:11:47 IST 2026
