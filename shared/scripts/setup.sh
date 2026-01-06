#!/bin/bash

# Setup script for Invoice Reconciliation API
# This script sets up the entire system for local development

set -e

echo "🚀 Setting up Invoice Reconciliation API..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please edit it with your configuration.${NC}"
fi

# Start PostgreSQL
echo -e "${YELLOW}📦 Starting PostgreSQL...${NC}"
cd shared/docker
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
until docker-compose exec postgres pg_isready -U invoice_user -d invoices; do
    sleep 1
done
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Setup NestJS Backend
echo -e "${YELLOW}📦 Setting up NestJS Backend...${NC}"
cd ../../../nestjs-backend

# Install dependencies
echo -e "${YELLOW}📦 Installing NestJS dependencies...${NC}"
npm install

# Run database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npm run db:migrate

# Seed database
echo -e "${YELLOW}🌱 Seeding database...${NC}"
npm run db:seed

# Setup Python Backend
echo -e "${YELLOW}🐍 Setting up Python Backend...${NC}"
cd ../python-backend

# Create virtual environment
echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Run Alembic migrations
echo -e "${YELLOW}🗄️  Running Alembic migrations...${NC}"
alembic upgrade head

# Return to root directory
cd ..

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${GREEN}📋 Next steps:${NC}"
echo -e "1. Edit .env file with your configuration"
echo -e "2. Start the services: ./scripts/run.sh"
echo -e "3. Test the API: ./scripts/test.sh"
echo ""
echo -e "${GREEN}🔗 API Endpoints:${NC}"
echo -e "- NestJS REST API: http://localhost:3000"
echo -e "- NestJS GraphQL: http://localhost:3000/graphql"
echo -e "- Python GraphQL: http://localhost:8001/graphql"
echo -e "- Adminer (DB Admin): http://localhost:8080"
echo ""
echo -e "${GREEN}📊 Default Test Accounts:${NC}"
echo -e "- Tenant 1 (Acme Corp): admin@acme.com / password123"
echo -e "- Tenant 2 (Global): admin@global.com / password123"