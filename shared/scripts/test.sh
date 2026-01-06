#!/bin/bash

# Test script for Invoice Reconciliation API
# This script runs all tests for both backends

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running Invoice Reconciliation API Tests...${NC}"

# Function to run tests with header
run_tests() {
    local service=$1
    local test_cmd=$2
    
    echo -e "${YELLOW}🧪 Running $service tests...${NC}"
    
    if eval "$test_cmd"; then
        echo -e "${GREEN}✅ $service tests passed${NC}"
    else
        echo -e "${RED}❌ $service tests failed${NC}"
        return 1
    fi
}

# Run NestJS tests
echo -e "${BLUE}🧪 Running NestJS Backend Tests...${NC}"
cd nestjs-backend

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --silent

echo -e "${YELLOW}🧪 Running unit tests...${NC}"
npm test

echo -e "${YELLOW}🧪 Running E2E tests...${NC}"
npm run test:e2e

echo -e "${YELLOW}🔒 Running RLS security tests...${NC}"
npm run test:rls

cd ..

# Run Python tests
echo -e "${BLUE}🧪 Running Python Backend Tests...${NC}"
cd python-backend

echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
source venv/bin/activate

echo -e "${YELLOW}🧪 Running pytest...${NC}"
pytest -v --cov=app tests/

cd ..

echo ""
echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Test Coverage:${NC}"
echo -e "- NestJS: Check coverage/ directory"
echo -e "- Python: Check coverage report above"