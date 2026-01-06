DO $$ BEGIN
 CREATE TYPE "currency" AS ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "invoice_status" AS ENUM('open', 'matched', 'paid', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "match_status" AS ENUM('proposed', 'confirmed', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" varchar(255),
	"posted_at" timestamp with time zone NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"description" text NOT NULL,
	"reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_transactions_tenant_external_unique" UNIQUE("tenant_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"request_path" varchar(255) NOT NULL,
	"request_method" varchar(10) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response_status" integer,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_keys_tenant_key_unique" UNIQUE("tenant_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vendor_id" uuid,
	"invoice_number" varchar(100),
	"amount" numeric(15, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"invoice_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"description" text,
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"bank_transaction_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"status" "match_status" DEFAULT 'proposed' NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_candidates_tenant_invoice_transaction_unique" UNIQUE("tenant_id","invoice_id","bank_transaction_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"roles" varchar(255) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_tenant_email_unique" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_tenant_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_transactions_tenant_id_idx" ON "bank_transactions" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_transactions_external_id_idx" ON "bank_transactions" ("external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_transactions_posted_at_idx" ON "bank_transactions" ("posted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_transactions_amount_idx" ON "bank_transactions" ("amount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idempotency_keys_tenant_key_idx" ON "idempotency_keys" ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_tenant_id_idx" ON "invoices" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_vendor_id_idx" ON "invoices" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_amount_idx" ON "invoices" ("amount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_invoice_date_idx" ON "invoices" ("invoice_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_candidates_tenant_id_idx" ON "match_candidates" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_candidates_invoice_id_idx" ON "match_candidates" ("invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_candidates_transaction_id_idx" ON "match_candidates" ("bank_transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_candidates_status_idx" ON "match_candidates" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "match_candidates_score_idx" ON "match_candidates" ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendors_tenant_id_idx" ON "vendors" ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_bank_transaction_id_bank_transactions_id_fk" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
