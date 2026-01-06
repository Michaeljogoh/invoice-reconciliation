-- Enable required PostgreSQL extensions

-- UUID extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: Enable pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;