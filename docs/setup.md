# Complete Setup Guide

## Prerequisites

### Required Software
- **Node.js**: Version 18 or higher
- **Python**: Version 3.13 or higher
- **PostgreSQL**: Version 14 or higher
- **npm**: Comes with Node.js
- **Git**: For version control

### Optional Software
- **Docker & Docker Compose**: For containerized setup
- **Redis**: For caching (optional)
- **VS Code**: Recommended IDE

## Installation Methods

### Method 1: Local Development Setup (Recommended for Development)

#### Step 1: Clone and Navigate
```bash
cd /mnt/okcomputer/output/invoice-reconciliation
```

#### Step 2: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://invoice_user:secure_password_here@localhost:5432/invoices

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AI Service (Optional)
AI_PROVIDER=openai
AI_API_KEY=sk-your-openai-api-key
```

#### Step 3: PostgreSQL Setup

**Option A: Using Docker (Recommended)**
```bash
cd shared/docker
docker-compose up -d postgres
```

**Option B: Local PostgreSQL**
```bash
# Create database and user
psql -U postgres
```

```sql
CREATE DATABASE invoices;
CREATE USER invoice_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE invoices TO invoice_user;
\q
```

#### Step 4: NestJS Backend Setup

```bash
cd nestjs-backend

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed the database with test data
npm run db:seed

# Return to root
cd ..
```

#### Step 5: Python Backend Setup

```bash
cd python-backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Alembic migrations
alembic upgrade head

# Return to root
cd ..
```

#### Step 6: Start Services

**Option A: Using the run script**
```bash
# Make scripts executable
chmod +x shared/scripts/*.sh

# Run all services
./shared/scripts/run.sh
```

**Option B: Manual startup**

Terminal 1 - NestJS:
```bash
cd nestjs-backend
npm run start:dev
```

Terminal 2 - Python:
```bash
cd python-backend
source venv/bin/activate
python -m app.main
```

### Method 2: Docker Compose Setup (Recommended for Quick Start)

#### Step 1: Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit the .env file
nano .env
```

#### Step 2: Run Setup Script
```bash
# Make script executable
chmod +x shared/scripts/setup.sh

# Run setup
./shared/scripts/setup.sh
```

#### Step 3: Start All Services
```bash
cd shared/docker
docker-compose up -d
```

#### Step 4: Verify Services
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Method 3: Production Deployment

#### Prerequisites
- Cloud provider account (AWS, GCP, Azure)
- Container registry
- Domain name
- SSL certificates

#### Deployment Steps

1. **Build Docker Images**
```bash
# NestJS Backend
cd nestjs-backend
docker build -t your-registry/invoice-nestjs:latest .

# Python Backend
cd ../python-backend
docker build -t your-registry/invoice-python:latest .
```

2. **Push to Registry**
```bash
docker push your-registry/invoice-nestjs:latest
docker push your-registry/invoice-python:latest
```

3. **Deploy to Cloud**
- Use Kubernetes, ECS, or Cloud Run
- Configure environment variables
- Set up load balancer
- Configure SSL/TLS

## Configuration Guide

### Database Configuration

**PostgreSQL Connection String Format:**
```
postgresql://username:password@host:port/database
```

**Example:**
```
postgresql://invoice_user:secure_password_here@localhost:5432/invoices
```

### JWT Configuration

**Generate a secure JWT secret:**
```bash
# Linux/macOS
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### AI Service Configuration

**OpenAI Setup:**
1. Create account at [OpenAI](https://platform.openai.com/)
2. Generate API key
3. Set environment variable: `AI_API_KEY=sk-your-key`

**Mock AI (for development):**
```env
AI_PROVIDER=mock
```

## Testing

### Running All Tests
```bash
# Make test script executable
chmod +x shared/scripts/test.sh

# Run all tests
./shared/scripts/test.sh
```

### Running Specific Test Suites

**NestJS Tests:**
```bash
cd nestjs-backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# RLS security tests
npm run test:rls
```

**Python Tests:**
```bash
cd python-backend
source venv/bin/activate

# Run all tests
pytest

# With coverage
pytest --cov=app
```

## API Usage

### Authentication

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "...",
    "email": "admin@acme.com",
    "tenantId": "..."
  }
}
```

### Creating an Invoice

```bash
curl -X POST http://localhost:3000/tenants/{tenantId}/invoices \
  -H "Authorization: Bearer {jwtToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1500.00",
    "currency": "USD",
    "description": "Office supplies",
    "invoiceDate": "2024-01-15",
    "dueDate": "2024-02-15"
  }'
```

### Bulk Import Transactions

```bash
curl -X POST http://localhost:3000/tenants/{tenantId}/bank-transactions/import \
  -H "Authorization: Bearer {jwtToken}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "transactions": [
      {
        "externalId": "BT-001",
        "postedAt": "2024-01-16T10:30:00Z",
        "amount": "1500.00",
        "currency": "USD",
        "description": "Payment to Office Supplies Co",
        "reference": "REF-001"
      }
    ]
  }'
```

### Run Reconciliation

```bash
curl -X POST http://localhost:3000/tenants/{tenantId}/reconcile \
  -H "Authorization: Bearer {jwtToken}"
```

### GraphQL Queries

**GraphQL Playground:** http://localhost:3000/graphql

**Query invoices:**
```graphql
query {
  invoices(tenantId: "tenant-id", filters: {status: OPEN}) {
    id
    amount
    currency
    status
    description
  }
}
```

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database exists
docker-compose exec postgres pg_isready -U invoice_user -d invoices
```

**2. Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

**3. JWT Secret Missing**
```bash
# Generate JWT secret
export JWT_SECRET=$(openssl rand -base64 32)
```

**4. Python Virtual Environment Issues**
```bash
# Recreate virtual environment
cd python-backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Debug Mode

**Enable SQL logging:**
```bash
# NestJS
export LOG_LEVEL=debug

# Python
export SQLALCHEMY_ECHO=true
```

**Enable GraphQL introspection:**
```bash
# Set NODE_ENV=development for GraphQL Playground
export NODE_ENV=development
```

## Development Workflow

### Code Style

**NestJS:**
```bash
cd nestjs-backend
npm run lint        # Check code style
npm run lint:fix    # Auto-fix issues
npm run format      # Format code
```

**Python:**
```bash
cd python-backend
black app/          # Format code
flake8 app/         # Check code style
mypy app/           # Type checking
```

### Database Migrations

**NestJS (Drizzle):**
```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

**Python (Alembic):**
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

## Security Best Practices

### Production Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Backup strategy
- [ ] Disaster recovery plan

### Environment Variables

**Never commit secrets to version control:**
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "*.pem" >> .gitignore
```

## Support

### Getting Help

1. **Check the documentation** in `/docs` directory
2. **Review logs** for error messages
3. **Run tests** to verify setup
4. **Check GitHub issues** for similar problems

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is created for demonstration purposes as part of a coding challenge.