# Multi-Tenant Invoice Reconciliation API

A comprehensive backend system for multi-tenant invoice reconciliation built with NestJS (Node.js) and Python.

## 🏗️ Architecture Overview

This system consists of two main components:

1. **NestJS Backend** (Primary system of record)
   - REST and GraphQL APIs
   - Authentication & Authorization
   - Multi-tenancy with RLS
   - PostgreSQL with Drizzle ORM
   - Transaction management
   - Idempotency handling

2. **Python Backend** (Reconciliation engine)
   - Strawberry GraphQL API
   - Deterministic scoring algorithms
   - SQLAlchemy 2.0 + Alembic
   - AI explanation service integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.13+
- PostgreSQL 14+
- Docker & Docker Compose 

### Local Setup

1. **Clone and setup**:
   ```bash
   cd invoice-reconciliation
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start PostgreSQL** (using Docker):
   ```bash
   cd shared/docker
   docker-compose up -d postgres
   cd ../..
   ```

3. **Setup NestJS Backend**:
   ```bash
   cd nestjs-backend
   npm install
   npm run db:migrate
   npm run db:seed
   cd ..
   ```

4. **Setup Python Backend**:
   ```bash
   cd python-backend
   pip install -r requirements.txt
   alembic upgrade head
   cd ..
   ```

5. **Run both services**:
   ```bash
   # Terminal 1: NestJS
   cd nestjs-backend
   npm run start:dev

   # Terminal 2: Python
   cd python-backend
   python -m app.main
   ```

## 📊 System Features

### Core Functionality
- ✅ Multi-tenant isolation with PostgreSQL RLS
- ✅ RESTful API (NestJS Controllers)
- ✅ GraphQL API (NestJS GraphQL module)
- ✅ Invoice management (CRUD)
- ✅ Bank transaction bulk import with idempotency
- ✅ Automated reconciliation with deterministic scoring
- ✅ AI-powered match explanations with graceful fallback
- ✅ Comprehensive test coverage

### Security & Best Practices
- ✅ JWT-based authentication
- ✅ Role-based authorization guards
- ✅ Row Level Security (RLS) policies
- ✅ Transaction boundaries
- ✅ Idempotency keys
- ✅ Proper error handling

## 🗃️ Database Schema

### Core Tables
- **tenants**: Organization isolation
- **invoices**: Tenant-scoped invoices
- **bank_transactions**: Imported bank data
- **match_candidates**: Reconciliation results
- **idempotency_keys**: Import deduplication

### RLS Policies
All tenant-scoped tables enforce `tenant_id` isolation at the database level.

## 🔌 API Endpoints

### REST (NestJS)
- `POST /tenants` - Create tenant
- `POST /tenants/{id}/invoices` - Create invoice
- `GET /tenants/{id}/invoices` - List invoices (with filters)
- `DELETE /tenants/{id}/invoices/{invoiceId}` - Delete invoice
- `POST /tenants/{id}/bank-transactions/import` - Bulk import
- `POST /tenants/{id}/reconcile` - Run reconciliation
- `POST /tenants/{id}/matches/{matchId}/confirm` - Confirm match
- `GET /tenants/{id}/reconcile/explain` - AI explanation

### GraphQL (NestJS & Python)
- `tenants` - List tenants
- `invoices(tenantId, filters)` - Filtered invoice query
- `createInvoice(tenantId, input)` - Create invoice
- `reconcile(tenantId)` - Run reconciliation
- `scoreCandidates` (Python) - Scoring engine

## 🧪 Testing

### NestJS Tests
```bash
cd nestjs-backend
npm test                # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:rls       # RLS security tests
```

### Python Tests
```bash
cd python-backend
pytest                  # All tests
pytest -v tests/test_reconciliation.py  # Specific tests
```

### Test Coverage
- ✅ Invoice CRUD operations
- ✅ Bank transaction import (idempotency)
- ✅ Reconciliation scoring (deterministic)
- ✅ Match confirmation flow
- ✅ AI explanation service (mocked)
- ✅ RLS cross-tenant blocking
- ✅ Authentication & authorization

## 🧠 Reconciliation Algorithm

### Scoring Heuristics (Non-AI)
1. **Exact Amount Match** (100 points)
2. **Date Proximity** (±3 days, 30 points)
3. **Text Similarity** (description matching, 20 points)
4. **Vendor Name Match** (optional, 10 points)

### AI Explanation Service
- Integrated LLM for natural language match explanations
- Graceful fallback to deterministic rules
- Configurable provider (OpenAI, Anthropic, or mock)
- Tenant-authorized data only

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/invoices

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1d

# AI Service
AI_PROVIDER=openai
AI_API_KEY=sk-your-key
AI_MODEL=gpt-4
AI_TIMEOUT=5000

# Python Service
PYTHON_GRAPHQL_URL=http://localhost:8001/graphql
```

## 📈 Performance Considerations

- **Database Indexing**: Optimized for tenant-scoped queries
- **Connection Pooling**: Efficient PostgreSQL connection management
- **Batch Operations**: Bulk import with streaming
- **Caching**: Redis-ready (configured but optional)

## 🛡️ Security Features

- **RLS Enforcement**: Database-level tenant isolation
- **JWT Validation**: Token-based authentication
- **Role Guards**: Super admin and tenant role checking
- **Input Validation**: DTO-based request validation
- **SQL Injection Prevention**: Parameterized queries

## 📚 Design Decisions

### Why Dual Backend?
- **NestJS**: Excellent for CRUD, auth, and GraphQL integration
- **Python**: Superior for data processing and AI integration
- **Separation**: Clean architectural boundaries and scalability

### RLS vs Application-level Security
- **RLS**: Defense-in-depth, prevents accidental cross-tenant access
- **Application Guards**: Business logic authorization
- **Both**: Comprehensive security model

### Idempotency Implementation
- **Idempotency Keys**: Client-provided UUID per operation
- **Payload Hashing**: Detect key reuse with different data
- **Response Caching**: Return identical responses for same key

## 🚀 Deployment

### Docker Compose (Recommended)
```bash
cd shared/docker
docker-compose up -d    # All services
docker-compose logs -f  # Monitor logs
```

### Manual Deployment
- Configure PostgreSQL with RLS
- Deploy NestJS backend
- Deploy Python backend
- Set up reverse proxy (nginx)

## 📞 Support

For questions about the implementation:
- Check `/docs/architecture.md` for detailed design
- Review test files for usage examples
- See `/docs/setup.md` for troubleshooting

## 📝 License

This is a coding challenge implementation for demonstration purposes.