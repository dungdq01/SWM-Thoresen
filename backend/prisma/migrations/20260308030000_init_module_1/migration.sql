CREATE TYPE "RolePermissionEffect" AS ENUM ('ALLOW', 'DENY');
CREATE TYPE "SequenceScopeType" AS ENUM ('GLOBAL', 'PER_WAREHOUSE', 'CUSTOM');
CREATE TYPE "SequenceResetPolicy" AS ENUM ('NONE', 'DAILY', 'MONTHLY', 'YEARLY');
CREATE TYPE "BusinessRuleStatus" AS ENUM ('CONFIRMED', 'TO_CONFIRM', 'PHASE_2');
CREATE TYPE "EffectivePhase" AS ENUM ('GO_LIVE', 'PHASE_2');
CREATE TYPE "DecisionLogStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SUPERSEDED');
CREATE TYPE "ChangePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ChangeControlStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IMPLEMENTED');
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "app_user" (
  "id" UUID NOT NULL,
  "user_code" VARCHAR(50) NOT NULL,
  "username" VARCHAR(80) NOT NULL,
  "full_name" VARCHAR(150) NOT NULL,
  "email" VARCHAR(150),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role" (
  "id" UUID NOT NULL,
  "role_code" VARCHAR(50) NOT NULL,
  "role_name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "is_system_role" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permission" (
  "id" UUID NOT NULL,
  "permission_code" VARCHAR(120) NOT NULL,
  "module_code" VARCHAR(50) NOT NULL,
  "resource_code" VARCHAR(50) NOT NULL,
  "action_code" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permission" (
  "id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "effect" "RolePermissionEffect" NOT NULL DEFAULT 'ALLOW',
  "scope_type" VARCHAR(30),
  "scope_value" VARCHAR(100),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "warehouse_code" VARCHAR(50),
  "owner_id" VARCHAR(50),
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assigned_by" UUID,
  "revoked_at" TIMESTAMP(3),
  "revoked_by" UUID,
  CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reason_code" (
  "id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "description" VARCHAR(255) NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "domain_code" VARCHAR(50) NOT NULL,
  "requires_approval" BOOLEAN NOT NULL DEFAULT false,
  "affects_billing" BOOLEAN NOT NULL DEFAULT false,
  "requires_note" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reason_code_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "number_sequence" (
  "id" UUID NOT NULL,
  "sequence_code" VARCHAR(30) NOT NULL,
  "description" VARCHAR(255),
  "scope_type" "SequenceScopeType" NOT NULL,
  "reset_policy" "SequenceResetPolicy" NOT NULL,
  "prefix_template" VARCHAR(100) NOT NULL,
  "format_template" VARCHAR(150) NOT NULL,
  "running_no_length" INTEGER NOT NULL DEFAULT 6,
  "allow_gap" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "number_sequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "number_sequence_counter" (
  "id" UUID NOT NULL,
  "sequence_id" UUID NOT NULL,
  "scope_key" VARCHAR(100) NOT NULL,
  "counter_date" DATE NOT NULL,
  "last_number" BIGINT NOT NULL DEFAULT 0,
  "version_no" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "number_sequence_counter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_rule_catalog" (
  "id" UUID NOT NULL,
  "rule_code" VARCHAR(50) NOT NULL,
  "domain" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "current_status" "BusinessRuleStatus" NOT NULL,
  "source_of_truth" VARCHAR(255) NOT NULL,
  "brd_reference" VARCHAR(255),
  "supersedes" VARCHAR(255),
  "effective_phase" "EffectivePhase" NOT NULL,
  "owner_role" VARCHAR(50),
  "last_reviewed_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_rule_catalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "decision_log" (
  "id" UUID NOT NULL,
  "decision_no" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "decision_type" VARCHAR(50) NOT NULL,
  "context_domain" VARCHAR(50) NOT NULL,
  "summary" TEXT NOT NULL,
  "decided_value" TEXT NOT NULL,
  "rationale" TEXT,
  "status" "DecisionLogStatus" NOT NULL,
  "source_refs" JSONB,
  "impacted_modules" JSONB,
  "effective_from" TIMESTAMP(3),
  "decided_by" UUID,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "decision_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "change_control_record" (
  "id" UUID NOT NULL,
  "change_no" VARCHAR(50) NOT NULL,
  "change_type" VARCHAR(30) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "requested_by" UUID,
  "priority" "ChangePriority" NOT NULL,
  "impact_summary" TEXT,
  "impacted_modules" JSONB,
  "status" "ChangeControlStatus" NOT NULL,
  "target_release" VARCHAR(30),
  "approved_by" UUID,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "change_control_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
  "id" UUID NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" VARCHAR(100) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "field_name" VARCHAR(100),
  "old_value" TEXT,
  "new_value" TEXT,
  "user_id" UUID,
  "user_role" VARCHAR(50),
  "ip_address" VARCHAR(64),
  "device_type" VARCHAR(20),
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason_code" VARCHAR(50),
  "notes" TEXT,
  "correlation_id" VARCHAR(100),
  "request_id" VARCHAR(100),
  "source_module" VARCHAR(50),
  "warehouse_code" VARCHAR(50),
  "owner_id" VARCHAR(50),
  "metadata" JSONB,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exception_log" (
  "id" UUID NOT NULL,
  "exception_no" VARCHAR(50) NOT NULL,
  "exception_type" VARCHAR(50) NOT NULL,
  "severity" "ExceptionSeverity" NOT NULL,
  "source_module" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(50),
  "entity_id" VARCHAR(100),
  "action" VARCHAR(50),
  "reason_code" VARCHAR(50),
  "message" TEXT NOT NULL,
  "details" JSONB,
  "correlation_id" VARCHAR(100),
  "external_id" VARCHAR(100),
  "user_id" UUID,
  "user_role" VARCHAR(50),
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolved_at" TIMESTAMP(3),
  "resolved_by" UUID,
  CONSTRAINT "exception_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "idempotency_record" (
  "id" UUID NOT NULL,
  "idempotency_key" VARCHAR(120) NOT NULL,
  "command_name" VARCHAR(100) NOT NULL,
  "source_module" VARCHAR(50) NOT NULL,
  "request_hash" VARCHAR(128),
  "request_payload" JSONB,
  "response_code" INTEGER,
  "response_body" JSONB,
  "resource_type" VARCHAR(50),
  "resource_id" VARCHAR(100),
  "status" "IdempotencyStatus" NOT NULL,
  "locked_until" TIMESTAMP(3),
  "correlation_id" VARCHAR(100),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expired_at" TIMESTAMP(3),
  CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_user_user_code_key" ON "app_user"("user_code");
CREATE UNIQUE INDEX "app_user_username_key" ON "app_user"("username");
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");
CREATE UNIQUE INDEX "role_role_code_key" ON "role"("role_code");
CREATE UNIQUE INDEX "permission_permission_code_key" ON "permission"("permission_code");
CREATE UNIQUE INDEX "permission_module_code_resource_code_action_code_key" ON "permission"("module_code", "resource_code", "action_code");
CREATE UNIQUE INDEX "role_permission_role_id_permission_id_key" ON "role_permission"("role_id", "permission_id");
CREATE UNIQUE INDEX "reason_code_code_key" ON "reason_code"("code");
CREATE UNIQUE INDEX "number_sequence_sequence_code_key" ON "number_sequence"("sequence_code");
CREATE UNIQUE INDEX "number_sequence_counter_sequence_id_scope_key_counter_date_key" ON "number_sequence_counter"("sequence_id", "scope_key", "counter_date");
CREATE UNIQUE INDEX "business_rule_catalog_rule_code_key" ON "business_rule_catalog"("rule_code");
CREATE UNIQUE INDEX "decision_log_decision_no_key" ON "decision_log"("decision_no");
CREATE UNIQUE INDEX "change_control_record_change_no_key" ON "change_control_record"("change_no");
CREATE UNIQUE INDEX "exception_log_exception_no_key" ON "exception_log"("exception_no");
CREATE UNIQUE INDEX "idempotency_record_idempotency_key_key" ON "idempotency_record"("idempotency_key");
CREATE INDEX "user_role_user_id_is_active_idx" ON "user_role"("user_id", "is_active");
CREATE INDEX "user_role_role_id_is_active_idx" ON "user_role"("role_id", "is_active");
CREATE UNIQUE INDEX "user_role_active_scope_unique" ON "user_role"("user_id", "role_id", COALESCE("warehouse_code", ''), COALESCE("owner_id", '')) WHERE "is_active" = true;
CREATE INDEX "reason_code_domain_code_category_is_active_idx" ON "reason_code"("domain_code", "category", "is_active");
CREATE INDEX "business_rule_catalog_domain_current_status_idx" ON "business_rule_catalog"("domain", "current_status");
CREATE INDEX "audit_log_entity_type_entity_id_occurred_at_idx" ON "audit_log"("entity_type", "entity_id", "occurred_at");
CREATE INDEX "audit_log_user_id_occurred_at_idx" ON "audit_log"("user_id", "occurred_at");
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_log"("correlation_id");
CREATE INDEX "audit_log_source_module_occurred_at_idx" ON "audit_log"("source_module", "occurred_at");
CREATE INDEX "exception_log_source_module_occurred_at_idx" ON "exception_log"("source_module", "occurred_at");
CREATE INDEX "exception_log_is_resolved_occurred_at_idx" ON "exception_log"("is_resolved", "occurred_at");
CREATE INDEX "idempotency_record_command_name_source_module_idx" ON "idempotency_record"("command_name", "source_module");
CREATE INDEX "idempotency_record_expired_at_idx" ON "idempotency_record"("expired_at");

ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "number_sequence_counter" ADD CONSTRAINT "number_sequence_counter_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "number_sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
