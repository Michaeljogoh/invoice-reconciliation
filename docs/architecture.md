# Architecture Design Document

## Overview

The Multi-Tenant Invoice Reconciliation API is a sophisticated backend system built with **NestJS (Node.js/TypeScript)** and **Python** that provides secure, scalable invoice reconciliation services for multiple organizations (tenants).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP/GraphQL
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Load Balancer)                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
           ▼                         ▼
┌─────────────────────┐   ┌─────────────────────────┐
│   NestJS Backend    │   │   Python Backend        │
│  (System of Record) │   │ (Reconciliation Engine) │
├─────────────────────┤   ├─────────────────────────┤
│ • REST & GraphQL    │   │ • GraphQL API           │
│ • Authentication    │   │ • Deterministic Scoring │
│ • Authorization     │   │ • AI Integration        │
│ • Database RLS      │   │ • SQLAlchemy + Alembic  │
│ • Drizzle ORM       │   │                         │
└──────────┬──────────┘   └────────────┬────────────┘
           │                           │
           │      PostgreSQL + RLS     │
           └──────────────┬────────────┘
                          ▼
              ┌───────────────────────┐
              │  PostgreSQL Database  │
              │  • Multi-tenant       │
              │  • Row Level Security │
              │  • Indexed Tables     │
              └───────────────────────┘
```

## Component Responsibilities

### NestJS Backend (Primary)
- **API Layer**: REST and GraphQL endpoints
- **Authentication**: JWT-based user authentication
- **Authorization**: Role-based access control (RBAC)
- **Multi-tenancy**: Tenant isolation at application level
- **Database**: PostgreSQL with Drizzle ORM
- **Transaction Management**: Atomic operations with proper boundaries
- **Idempotency**: Request deduplication handling
- **Integration**: Calls Python backend for reconciliation

### Python Backend (Reconciliation Engine)
- **Scoring Engine**: Deterministic heuristic algorithms
- **GraphQL API**: Strawberry GraphQL endpoint
- **Database Access**: SQLAlchemy 2.0 with Alembic migrations
- **AI Integration**: OpenAI/Anthropic integration with fallback
- **Stateless**: No authentication/authorization (relies on NestJS)

### Database Layer
- **PostgreSQL 15**: Primary data store
- **RLS Policies**: Database-level tenant isolation
- **Indexes**: Optimized for tenant-scoped queries
- **Constraints**: Foreign key relationships and uniqueness

## Design Decisions

### 1. Dual Backend Architecture

**Why Two Backends?**
- **Separation of Concerns**: NestJS handles HTTP/GraphQL, auth, and business logic; Python handles data processing
- **Language Strengths**: Leverages TypeScript for APIs and Python for AI/data processing
- **Scalability**: Each service can be scaled independently
- **Team Expertise**: Allows different teams to work in their preferred language

**Trade-offs:**
- ✅ Clean architectural boundaries
- ✅ Language-appropriate tooling
- ✅ Independent scaling
- ❌ Increased deployment complexity
- ❌ Inter-service communication overhead

### 2. Multi-Tenancy Strategy

**Application-Level Isolation:**
- Guards validate tenant access
- Services filter by tenant_id
- User context propagated through requests

**Database-Level Isolation (RLS):**
- PostgreSQL Row Level Security policies
- Defense-in-depth security
- Prevents accidental cross-tenant access
- Super admin bypass capability

**Trade-offs:**
- ✅ Defense-in-depth security
- ✅ Accidental access prevention
- ✅ Audit compliance
- ❌ Slight performance overhead
- ❌ More complex database setup

### 3. Idempotency Implementation

**Strategy:** Client-provided UUID keys
- Same key + same payload → same response
- Same key + different payload → 409 Conflict
- Response cached for 24 hours

**Benefits:**
- Safe retry logic
- Exactly-once semantics
- Client-controlled deduplication

### 4. Reconciliation Algorithm

**Heuristic Scoring (Non-AI):**
1. **Exact Amount Match**: 1000 points
2. **Date Proximity**: Up to 300 points
3. **Text Similarity**: Up to 200 points
4. **Vendor Name Match**: 100 points

**Why Not Pure AI?**
- Deterministic results for testing
- No external service dependencies
- Predictable performance
- Lower costs

**AI Enhancement:**
- Natural language explanations
- Confidence scoring
- Graceful fallback to deterministic

## Database Schema

### Core Tables
```
tenants
├── id (PK)
├── name
├── slug
└── created_at

invoices
├── id (PK)
├── tenant_id (FK → tenants.id)
├── vendor_id (FK → vendors.id, optional)
├── invoice_number
├── amount
├── currency
├── invoice_date
├── due_date
├── description
├── status (open|matched|paid|cancelled)
└── created_at

bank_transactions
├── id (PK)
├── tenant_id (FK → tenants.id)
├── external_id
├── posted_at
├── amount
├── currency
├── description
├── reference
└── created_at

match_candidates
├── id (PK)
├── tenant_id (FK → tenants.id)
├── invoice_id (FK → invoices.id)
├── bank_transaction_id (FK → bank_transactions.id)
├── score
├── status (proposed|confirmed|rejected)
├── explanation
└── created_at

users
├── id (PK)
├── tenant_id (FK → tenants.id)
├── email
├── password_hash
├── first_name
├── last_name
├── roles
├── is_active
└── created_at
```

### Indexes
- `invoices_tenant_id_idx`
- `invoices_status_idx`
- `bank_transactions_tenant_id_idx`
- `bank_transactions_external_id_idx`
- `match_candidates_tenant_id_idx`

## Security Architecture

### Authentication Flow
```
Client → Login (email/password) → JWT Token → Authenticated Requests
```

### Authorization Layers
1. **Authentication Guard**: Validates JWT token
2. **Tenant Guard**: Ensures user can access requested tenant
3. **Role Guard**: Checks role-based permissions
4. **RLS Policies**: Database-level enforcement

### Security Features
- **JWT Tokens**: Stateless authentication
- **Password Hashing**: bcrypt with salt
- **Input Validation**: DTO-based validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS**: Configured for production
- **Rate Limiting**: Ready for implementation

## Performance Considerations

### Database Optimization
- **Connection Pooling**: Efficient PostgreSQL connections
- **Indexing**: Tenant-scoped query optimization
- **Batch Operations**: Bulk import with streaming
- **Read Replicas**: Ready for horizontal scaling

### Caching Strategy
- **Idempotency Keys**: 24-hour cache
- **JWT Tokens**: Stateless (no server storage)
- **Redis**: Configured for future use

### API Optimization
- **Pagination**: Cursor-based for large datasets
- **Field Selection**: GraphQL query optimization
- **Compression**: Gzip enabled

## Scalability Design

### Horizontal Scaling
- **Stateless Services**: No server-side session storage
- **Database**: Read replicas for read-heavy workloads
- **Load Balancing**: Ready for multiple instances

### Vertical Scaling
- **Node.js**: Worker thread utilization
- **Python**: Async/await for I/O operations
- **PostgreSQL**: Query optimization and indexing

## Monitoring & Observability

### Logging
- **Structured Logging**: JSON format
- **Correlation IDs**: Request tracing
- **Error Tracking**: Comprehensive error logs

### Metrics (Ready for Implementation)
- **API Performance**: Response times, throughput
- **Database Metrics**: Query performance, connection pool
- **Business Metrics**: Reconciliation success rates

### Health Checks
- **NestJS**: `/health` endpoint
- **Python**: `/health` endpoint
- **Database**: Connection validation

## Deployment Strategy

### Docker Containers
- **Multi-stage Builds**: Optimized images
- **Non-root Users**: Security best practices
- **Health Checks**: Container orchestration ready

### Environment Configuration
- **Environment Variables**: 12-factor app compliance
- **Config Validation**: Startup validation
- **Secret Management**: External secret storage ready

### CI/CD Pipeline (Ready for Implementation)
- **Automated Testing**: Unit, integration, E2E
- **Code Quality**: Linting, type checking
- **Security Scanning**: Dependency vulnerabilities
- **Deployment**: Blue-green deployment ready

## Future Enhancements

### Phase 2 Features
- **Advanced AI**: ML model integration
- **Real-time Notifications**: WebSocket integration
- **Advanced Analytics**: Business intelligence
- **Mobile API**: RESTful mobile endpoints

### Technical Improvements
- **GraphQL Federation**: Microservices architecture
- **Event Streaming**: Kafka/RabbitMQ integration
- **Advanced Caching**: Redis cluster
- **CDN Integration**: Static asset delivery

## Conclusion

This architecture provides a robust, scalable, and secure foundation for a multi-tenant invoice reconciliation system. The dual-backend approach leverages the strengths of both Node.js and Python while maintaining clean separation of concerns. The multi-layered security model ensures data isolation at both application and database levels.

The system is designed for:
- **High Availability**: Stateless services with health checks
- **Scalability**: Horizontal and vertical scaling ready
- **Security**: Defense-in-depth with RLS
- **Maintainability**: Clean code structure and comprehensive testing
- **Performance**: Optimized queries and caching strategies