# API Documentation

## Overview

The Invoice Reconciliation API provides both REST and GraphQL endpoints for managing invoices, bank transactions, and reconciliation processes.

## Authentication

All API endpoints (except login) require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Login Endpoint

**POST** `/auth/login`

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "admin@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["admin"],
    "tenantId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

## REST API Endpoints

### Tenants

#### Create Tenant
**POST** `/tenants`

**Request:**
```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Permissions:** Super admin only

#### List Tenants
**GET** `/tenants`

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
]
```

**Permissions:** Super admin only

### Invoices

#### Create Invoice
**POST** `/tenants/{tenantId}/invoices`

**Request:**
```json
{
  "vendorId": "123e4567-e89b-12d3-a456-426614174001",
  "invoiceNumber": "INV-001",
  "amount": "1500.00",
  "currency": "USD",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "description": "Office supplies - January 2024"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "vendorId": "123e4567-e89b-12d3-a456-426614174001",
  "invoiceNumber": "INV-001",
  "amount": "1500.00",
  "currency": "USD",
  "invoiceDate": "2024-01-15T00:00:00.000Z",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "description": "Office supplies - January 2024",
  "status": "open",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z",
  "vendor": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "Office Supplies Co"
  }
}
```

#### List Invoices
**GET** `/tenants/{tenantId}/invoices`

**Query Parameters:**
- `status` (optional): Filter by status (open, matched, paid, cancelled)
- `vendorId` (optional): Filter by vendor ID
- `minAmount` (optional): Minimum amount filter
- `maxAmount` (optional): Maximum amount filter
- `startDate` (optional): Start date filter (ISO 8601)
- `endDate` (optional): End date filter (ISO 8601)
- `currency` (optional): Filter by currency (USD, EUR, GBP, CAD, AUD)

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "tenantId": "123e4567-e89b-12d3-a456-426614174000",
    "vendorId": "123e4567-e89b-12d3-a456-426614174001",
    "invoiceNumber": "INV-001",
    "amount": "1500.00",
    "currency": "USD",
    "invoiceDate": "2024-01-15T00:00:00.000Z",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "description": "Office supplies - January 2024",
    "status": "open",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "vendor": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "Office Supplies Co"
    }
  }
]
```

#### Delete Invoice
**DELETE** `/tenants/{tenantId}/invoices/{invoiceId}`

**Response:** `204 No Content`

### Bank Transactions

#### Bulk Import Transactions
**POST** `/tenants/{tenantId}/bank-transactions/import`

**Headers:**
- `Idempotency-Key` (optional): UUID for idempotent requests

**Request:**
```json
{
  "transactions": [
    {
      "externalId": "BT-2024-0001",
      "postedAt": "2024-01-16T10:30:00Z",
      "amount": "1500.00",
      "currency": "USD",
      "description": "Payment to Office Supplies Co",
      "reference": "REF-001"
    },
    {
      "externalId": "BT-2024-0002",
      "postedAt": "2024-01-22T14:15:00Z",
      "amount": "2750.50",
      "currency": "USD",
      "description": "ACH Transfer - Office Supplies",
      "reference": "REF-002"
    }
  ]
}
```

**Response:**
```json
{
  "imported": 2,
  "duplicates": 0,
  "errors": [],
  "transactions": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "tenantId": "123e4567-e89b-12d3-a456-426614174000",
      "externalId": "BT-2024-0001",
      "postedAt": "2024-01-16T10:30:00.000Z",
      "amount": "1500.00",
      "currency": "USD",
      "description": "Payment to Office Supplies Co",
      "reference": "REF-001",
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

### Reconciliation

#### Run Reconciliation
**POST** `/tenants/{tenantId}/reconcile`

**Response:**
```json
{
  "candidates": [
    {
      "invoiceId": "123e4567-e89b-12d3-a456-426614174000",
      "transactionId": "456e7890-e89b-12d3-a456-426614174001",
      "score": 1500,
      "explanation": "Perfect match: Invoice INV-001 and transaction BT-2024-0001 have identical amounts of 1500.00 USD.",
      "scoreBreakdown": {
        "exactAmount": 1000,
        "dateProximity": 300,
        "textSimilarity": 200,
        "vendorMatch": 0,
        "total": 1500
      }
    }
  ],
  "processedInvoices": 5,
  "processedTransactions": 12,
  "durationMs": 245
}
```

#### Get AI Explanation
**GET** `/tenants/{tenantId}/reconcile/explain?invoice_id={invoiceId}&transaction_id={transactionId}`

**Response:**
```json
{
  "explanation": "This invoice and transaction match perfectly with the same amount of $1,500.00 and similar descriptions.",
  "confidence": "high",
  "scoreBreakdown": {
    "exactAmount": 1000,
    "dateProximity": 300,
    "textSimilarity": 200,
    "total": 1500
  },
  "aiGenerated": true
}
```

### Match Confirmation

#### Confirm Match
**POST** `/tenants/{tenantId}/matches/{matchId}/confirm`

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "confirmed",
  "updatedAt": "2024-01-20T10:35:00.000Z"
}
```

## GraphQL API

**Endpoint:** http://localhost:3000/graphql (NestJS)
**Endpoint:** http://localhost:8001/graphql (Python)

### Queries

#### Get Tenants
```graphql
query {
  tenants {
    id
    name
    slug
    createdAt
  }
}
```

#### Get Invoices
```graphql
query {
  invoices(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    filters: { status: OPEN }
  ) {
    id
    amount
    currency
    status
    description
    vendor {
      id
      name
    }
  }
}
```

#### Get Bank Transactions
```graphql
query {
  bankTransactions(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    filters: {}
  ) {
    id
    amount
    currency
    postedAt
    description
    reference
  }
}
```

#### Get Match Candidates
```graphql
query {
  matchCandidates(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    filters: { status: PROPOSED }
  ) {
    id
    invoiceId
    transactionId
    score
    status
    explanation
  }
}
```

#### Explain Reconciliation
```graphql
query {
  explainReconciliation(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    invoiceId: "123e4567-e89b-12d3-a456-426614174000"
    transactionId: "456e7890-e89b-12d3-a456-426614174001"
  ) {
    explanation
    confidence
    scoreBreakdown {
      exactAmount
      dateProximity
      textSimilarity
      vendorMatch
      total
    }
    aiGenerated
  }
}
```

### Mutations

#### Create Tenant
```graphql
mutation {
  createTenant(input: {
    name: "Test Corporation"
    slug: "test-corp"
  }) {
    id
    name
    slug
    createdAt
  }
}
```

#### Create Invoice
```graphql
mutation {
  createInvoice(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    input: {
      amount: "1500.00"
      currency: USD
      description: "Office supplies"
      invoiceDate: "2024-01-15"
      dueDate: "2024-02-15"
    }
  ) {
    id
    amount
    currency
    status
    createdAt
  }
}
```

#### Delete Invoice
```graphql
mutation {
  deleteInvoice(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    invoiceId: "123e4567-e89b-12d3-a456-426614174000"
  ) {
    success
  }
}
```

#### Import Bank Transactions
```graphql
mutation {
  importBankTransactions(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    input: {
      transactions: [
        {
          externalId: "BT-001"
          postedAt: "2024-01-16T10:30:00Z"
          amount: "1500.00"
          currency: USD
          description: "Payment to Office Supplies Co"
          reference: "REF-001"
        }
      ]
    }
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
  ) {
    imported
    duplicates
    errors
    transactions {
      id
      externalId
      amount
      description
    }
  }
}
```

#### Run Reconciliation
```graphql
mutation {
  reconcile(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    input: {}
  ) {
    candidates {
      invoiceId
      transactionId
      score
      explanation
      scoreBreakdown {
        exactAmount
        dateProximity
        textSimilarity
        vendorMatch
        total
      }
    }
    processedInvoices
    processedTransactions
    durationMs
  }
}
```

#### Confirm Match
```graphql
mutation {
  confirmMatch(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    matchId: "123e4567-e89b-12d3-a456-426614174000"
  ) {
    id
    status
    updatedAt
  }
}
```

## Python Backend GraphQL

The Python backend provides a specialized GraphQL endpoint for deterministic scoring:

#### Score Candidates
```graphql
mutation {
  scoreCandidates(
    tenantId: "123e4567-e89b-12d3-a456-426614174000"
    invoices: [
      {
        id: "inv-001"
        amount: 1500.00
        invoiceDate: "2024-01-15"
        description: "Office supplies"
        vendorName: "Office Supplies Co"
      }
    ]
    transactions: [
      {
        id: "tx-001"
        amount: 1500.00
        postedAt: "2024-01-16T10:30:00Z"
        description: "Payment to Office Supplies Co"
      }
    ]
    topN: 5
  ) {
    candidates {
      invoiceId
      transactionId
      score
      explanation
      scoreBreakdown {
        exactAmount
        dateProximity
        textSimilarity
        vendorMatch
        total
      }
    }
    processedInvoices
    processedTransactions
    durationMs
  }
}
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Idempotency key conflict
- `500 Internal Server Error`: Server error

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "property": "amount",
      "constraints": {
        "isDecimal": "amount must be a decimal number"
      }
    }
  ]
}
```

## Rate Limiting

Rate limiting is configured but not enforced in development. In production, implement:

- **Per-user limits**: 100 requests per minute
- **Per-tenant limits**: 1000 requests per minute
- **Endpoint-specific limits**: Higher limits for read operations

## Pagination

List endpoints support cursor-based pagination:

**Request:**
```http
GET /tenants/{tenantId}/invoices?cursor=eyJpZCI6IjEyMyJ9&limit=50
```

**Response:**
```json
{
  "data": [...],
  "cursor": "eyJpZCI6IjQ1NiJ9",
  "hasMore": true
}
```

## Webhooks (Future Enhancement)

Webhooks can be configured for real-time notifications:

**Events:**
- `invoice.created`
- `invoice.updated`
- `match.confirmed`
- `reconciliation.completed`

**Configuration:**
```json
{
  "url": "https://your-webhook-endpoint.com/webhooks",
  "events": ["match.confirmed", "reconciliation.completed"],
  "secret": "webhook-secret"
}
```