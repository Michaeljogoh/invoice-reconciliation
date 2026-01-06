-- Setup Row Level Security (RLS) for multi-tenancy

-- Create RLS helper functions
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.current_org_id() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_org_id', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.is_super_admin', true) = 'true';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on tenant-scoped tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices table
CREATE POLICY tenant_isolation_policy ON invoices
    FOR ALL
    USING (
        tenant_id = app.current_org_id() OR 
        app.is_super_admin() = true
    );

-- Create RLS policies for bank_transactions table
CREATE POLICY bank_transactions_tenant_policy ON bank_transactions
    FOR ALL
    USING (
        tenant_id = app.current_org_id() OR 
        app.is_super_admin() = true
    );

-- Create RLS policies for vendors table
CREATE POLICY vendors_tenant_policy ON vendors
    FOR ALL
    USING (
        tenant_id = app.current_org_id() OR 
        app.is_super_admin() = true
    );

-- Create RLS policies for match_candidates table
CREATE POLICY match_candidates_tenant_policy ON match_candidates
    FOR ALL
    USING (
        tenant_id = app.current_org_id() OR 
        app.is_super_admin() = true
    );

-- Create RLS policies for users table
CREATE POLICY users_tenant_policy ON users
    FOR ALL
    USING (
        tenant_id = app.current_org_id() OR 
        app.is_super_admin() = true
    );

-- Create RLS policies for idempotency_keys table
CREATE POLICY idempotency_keys_tenant_policy ON idempotency_keys
    FOR ALL
    USING (
        tenant_id = app.current_org_id() OR 
        app.is_super_admin() = true
    );

-- Force RLS for all users (including superuser)
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE vendors FORCE ROW LEVEL SECURITY;
ALTER TABLE match_candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;