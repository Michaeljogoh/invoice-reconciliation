#!/bin/bash

# Run script for Invoice Reconciliation API
# This script starts both backend services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Invoice Reconciliation API Services...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start PostgreSQL if not running
if ! docker-compose -f shared/docker/docker-compose.yml ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}📦 Starting PostgreSQL...${NC}"
    cd shared/docker
    docker-compose up -d postgres
    cd ../..
fi

# Start NestJS Backend
echo -e "${GREEN}📦 Starting NestJS Backend...${NC}"
cd nestjs-backend
npm run start:dev &
NESTJS_PID=$!
cd ..

# Start Python Backend
echo -e "${GREEN}🐍 Starting Python Backend...${NC}"
cd python-backend
source venv/bin/activate
python -m app.main &
PYTHON_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Services started successfully!${NC}"
echo ""
echo -e "${BLUE}🔗 API Endpoints:${NC}"
echo -e "- NestJS REST API: http://localhost:3000"
echo -e "- NestJS GraphQL: http://localhost:3000/graphql"
echo -e "- Python GraphQL: http://localhost:8001/graphql"
echo ""
echo -e "${BLUE}📊 Swagger Documentation:${NC}"
echo -e "- REST API Docs: http://localhost:3000/api"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for interrupt
wait