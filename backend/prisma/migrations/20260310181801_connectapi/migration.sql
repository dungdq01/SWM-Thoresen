-- CreateEnum
CREATE TYPE "RolePermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "SequenceScopeType" AS ENUM ('GLOBAL', 'PER_WAREHOUSE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SequenceResetPolicy" AS ENUM ('NONE', 'DAILY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "BusinessRuleStatus" AS ENUM ('CONFIRMED', 'TO_CONFIRM', 'PHASE_2');

-- CreateEnum
CREATE TYPE "EffectivePhase" AS ENUM ('GO_LIVE', 'PHASE_2');

-- CreateEnum
CREATE TYPE "DecisionLogStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ChangePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChangeControlStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('DIRECT', 'CONSIGNED', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierGroup" AS ENUM ('DOMESTIC', 'OVERSEAS', 'VESSEL_AGENT', 'TRADER');

-- CreateEnum
CREATE TYPE "CustomerGroup" AS ENUM ('CORPORATE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('BUYER', 'CONSIGNEE', 'SHIPPER');

-- CreateEnum
CREATE TYPE "CargoForm" AS ENUM ('BULK', 'BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG', 'JUMBO', 'PACKAGING', 'CONTAINER', 'DRUM', 'PALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('COVERED', 'OPEN_YARD', 'MIXED');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('RECEIVING', 'STORAGE', 'STAGING', 'SHIPPING', 'QC', 'DAMAGED', 'RETURNS');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('RECEIVING', 'STORAGE', 'STAGING', 'SHIPPING', 'QC', 'DAMAGED', 'RETURNS', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('OK', 'HOLD', 'BLOCKED');

-- CreateEnum
CREATE TYPE "UomClass" AS ENUM ('WEIGHT', 'VOLUME', 'QUANTITY', 'LENGTH', 'AREA');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('TRUCK', 'TRAILER', 'CONTAINER', 'BARGE', 'VESSEL', 'VESSEL_SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceGroup" AS ENUM ('STORAGE', 'HANDLING', 'VAS', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'VALIDATED', 'PARTIALLY_COMMITTED', 'COMMITTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportActionType" AS ENUM ('INSERT', 'UPDATE', 'SKIP', 'REJECT');

-- CreateEnum
CREATE TYPE "ImportProcessingStatus" AS ENUM ('PENDING', 'VALID', 'INVALID', 'COMMITTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ImportErrorLevel" AS ENUM ('WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InventoryTransType" AS ENUM ('RECEIPT_IN', 'SHIPMENT_OUT', 'MOVE', 'STATUS_CHANGE', 'ADJUSTMENT', 'COUNT_GAIN', 'COUNT_LOSS', 'VAS_CONSUME', 'VAS_PRODUCE', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "InventoryStage" AS ENUM ('PHYSICAL', 'EXPECTED', 'ORDERED');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'PARTIALLY_RELEASED', 'RELEASED', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReconciliationRunType" AS ENUM ('SCHEDULED', 'ON_DEMAND', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReconciliationScopeType" AS ENUM ('FULL', 'WAREHOUSE', 'OWNER', 'ITEM');

-- CreateEnum
CREATE TYPE "ReconciliationSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'INFO');

-- CreateEnum
CREATE TYPE "ReconciliationResultStatus" AS ENUM ('MISMATCH', 'OK', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SnapshotRunMode" AS ENUM ('SCHEDULED', 'MANUAL', 'RERUN');

-- CreateEnum
CREATE TYPE "SnapshotRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceApp" AS ENUM ('WEB', 'MOBILE', 'API', 'INTEGRATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderLineStatus" AS ENUM ('OPEN', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('STANDARD', 'VESSEL');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('DRAFT', 'AWAITING_WEIGHING', 'WEIGHED_IN', 'PROCESSING', 'WEIGHED_OUT', 'RECEIVED', 'PUTAWAY', 'CLOSED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptLineStatus" AS ENUM ('OPEN', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WeighPhase" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "IntegrationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ALLOCATED', 'PICKING', 'PICKED', 'WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED', 'PENDING_APPROVAL', 'SHIPPED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentLineStatus" AS ENUM ('PENDING', 'ALLOCATED', 'PICKING', 'PICKED', 'LOADING', 'WEIGHED_PASS', 'WEIGHED_FAIL', 'LINE_SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentSourceType" AS ENUM ('SO', 'DELIVERY_REQUEST', 'STANDALONE');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ALLOCATED', 'PICKED', 'RELEASED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WeighType" AS ENUM ('TARE', 'GROSS');

-- CreateEnum
CREATE TYPE "WeighSourceMode" AS ENUM ('SCALE_AGENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ShipmentExceptionType" AS ENUM ('ALLOCATION_FAIL', 'TOLERANCE_FAIL', 'SO_BLOCK', 'DUPLICATE_WEIGHT', 'POSTING_FAIL', 'SHORT_PICK', 'WORK_CREATE_FAIL', 'INTEGRATION_FAIL', 'HOLD_RELEASE_WARN');

-- CreateEnum
CREATE TYPE "ShipmentExceptionStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVE', 'REJECT', 'REWEIGH_REQUEST');

-- CreateEnum
CREATE TYPE "ApprovalScope" AS ENUM ('LINE', 'SHIPMENT');

-- CreateEnum
CREATE TYPE "WorkLinkType" AS ENUM ('PICK', 'LOAD');

-- CreateEnum
CREATE TYPE "WorkLinkStatus" AS ENUM ('REQUESTED', 'CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PostingAction" AS ENUM ('POST', 'REVERSE');

-- CreateEnum
CREATE TYPE "PostingStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "IcMoveOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "IcMoveLineStatus" AS ENUM ('OPEN', 'EXECUTING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "IcExecutionMode" AS ENUM ('DIRECT', 'WORK_BASED');

-- CreateEnum
CREATE TYPE "IcTransferOrderStatus" AS ENUM ('CREATED', 'RELEASED', 'SHIPPED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "IcTransferLineStatus" AS ENUM ('OPEN', 'SHIPPED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IcStatusChangeStatus" AS ENUM ('CREATED', 'POSTED', 'REVERSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IcCycleCountPlanFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ADHOC');

-- CreateEnum
CREATE TYPE "IcCycleCountScopeType" AS ENUM ('LOCATION', 'ITEM', 'LOCATION_ITEM', 'OWNER');

-- CreateEnum
CREATE TYPE "IcCycleCountStatus" AS ENUM ('CREATED', 'RELEASED', 'COUNTING', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IcCycleCountLineStatus" AS ENUM ('OPEN', 'COUNTED', 'VARIANCE', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IcAdjustmentType" AS ENUM ('INCREASE', 'DECREASE', 'MIXED');

-- CreateEnum
CREATE TYPE "IcAdjustmentSourceType" AS ENUM ('MANUAL', 'COUNT', 'RECONCILIATION', 'TRANSFER_VARIANCE');

-- CreateEnum
CREATE TYPE "IcAdjustmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "IcAdjustmentLineStatus" AS ENUM ('OPEN', 'APPROVED', 'POSTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IcReconciliationScopeType" AS ENUM ('WAREHOUSE', 'ITEM', 'OWNER', 'GLOBAL');

-- CreateEnum
CREATE TYPE "IcReconciliationStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IcReconciliationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IcResolutionType" AS ENUM ('NO_ACTION', 'ADJUSTMENT', 'REVERSE', 'INVESTIGATION');

-- CreateEnum
CREATE TYPE "IcDocumentEntityType" AS ENUM ('MOVE', 'TRANSFER', 'STATUS_CHANGE', 'COUNT', 'ADJUSTMENT', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "IcExceptionType" AS ENUM ('RESERVED_STOCK', 'POST_FAIL', 'LIMIT_BREACH', 'VARIANCE', 'DUPLICATE', 'WORK_CALLBACK_MISS', 'VALIDATION_FAIL');

-- CreateEnum
CREATE TYPE "IcExceptionStatus" AS ENUM ('OPEN', 'ACK', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "IcPostingStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "WeWorkType" AS ENUM ('PUTAWAY', 'PICK', 'MOVE', 'TRANSFER_PICK', 'TRANSFER_PUT');

-- CreateEnum
CREATE TYPE "WeWorkStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WeWorkLineStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WeStepType" AS ENUM ('PUT', 'PICK', 'MOVE', 'TRANSFER_PICK', 'TRANSFER_PUT');

-- CreateEnum
CREATE TYPE "WePostingStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "WeAssignmentMode" AS ENUM ('SELF_CLAIM', 'DIRECTED');

-- CreateEnum
CREATE TYPE "WeAssignmentAction" AS ENUM ('CLAIM', 'RELEASE', 'REASSIGN');

-- CreateEnum
CREATE TYPE "WeStatusObjectType" AS ENUM ('HEADER', 'LINE');

-- CreateEnum
CREATE TYPE "WeTriggerAction" AS ENUM ('CREATE', 'CLAIM', 'RELEASE', 'START', 'COMPLETE', 'SKIP', 'CANCEL', 'OVERRIDE');

-- CreateEnum
CREATE TYPE "WeExceptionType" AS ENUM ('SHORT_PICK', 'LOCATION_MISMATCH', 'ITEM_NOT_FOUND', 'SYNC_CONFLICT', 'POSTING_FAILED');

-- CreateEnum
CREATE TYPE "WeExceptionSeverity" AS ENUM ('INFO', 'WARN', 'BLOCKER');

-- CreateEnum
CREATE TYPE "WeExceptionStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WeSyncEventType" AS ENUM ('START_LINE', 'COMPLETE_LINE', 'SKIP_LINE');

-- CreateEnum
CREATE TYPE "WeSyncResult" AS ENUM ('PENDING', 'SUCCESS', 'DUPLICATE', 'CONFLICT', 'REJECTED');

-- CreateEnum
CREATE TYPE "WeSyncBatchStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PARTIAL', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "WeOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "WeSourceModule" AS ENUM ('M4', 'M5', 'M6', 'MANUAL');

-- CreateEnum
CREATE TYPE "WeSourceType" AS ENUM ('RECEIPT', 'SHIPMENT', 'MOVE_ORDER', 'TRANSFER_ORDER');

-- CreateEnum
CREATE TYPE "M8WeighingType" AS ENUM ('WEIGH_IN', 'WEIGH_OUT', 'TARE', 'GROSS_LINE', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "M8DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED');

-- CreateEnum
CREATE TYPE "M8WeighEventProcessingStatus" AS ENUM ('RECEIVED', 'VALIDATED', 'LINKED', 'DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "M8CallbackStatus" AS ENUM ('PENDING', 'SENT', 'ACKED', 'FAILED');

-- CreateEnum
CREATE TYPE "M8OcrStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'EXTRACTED', 'REVIEW_REQUIRED', 'CONFIRMED', 'LINKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "M8OcrLinkMethod" AS ENUM ('AUTO_MATCHED', 'OPERATOR_SELECTED', 'OPERATOR_CREATED');

-- CreateEnum
CREATE TYPE "M8SyncBatchStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PARTIAL_SUCCESS', 'SUCCESS', 'FAILED', 'CONFLICTED');

-- CreateEnum
CREATE TYPE "M8SyncEventStatus" AS ENUM ('RECEIVED', 'DUPLICATE', 'DISPATCHED', 'APPLIED', 'CONFLICTED', 'FAILED');

-- CreateEnum
CREATE TYPE "M8ErpPushStatus" AS ENUM ('PENDING', 'SENT', 'ACK_SUCCESS', 'ACK_FAILED', 'RETRY_SCHEDULED', 'DEAD_LETTER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "M8AlertSeverity" AS ENUM ('INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "M8AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "M8ChannelStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "VasWoStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VasPackagingOwnership" AS ENUM ('TVL_OWNED', 'CLIENT_OWNED');

-- CreateEnum
CREATE TYPE "VasShiftCode" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateEnum
CREATE TYPE "VasOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "VasStateAction" AS ENUM ('CREATE', 'CONFIRM', 'START', 'ADD_SESSION', 'COMPLETE', 'CANCEL');

-- CreateEnum
CREATE TYPE "VasExceptionSeverity" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "BilContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BilEventType" AS ENUM ('INBOUND_HANDLING', 'OUTBOUND_HANDLING', 'BAGGING_FEE', 'STORAGE');

-- CreateEnum
CREATE TYPE "BilEventRateStatus" AS ENUM ('UNRESOLVED', 'RESOLVED', 'MISSING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BilEventBillingStatus" AS ENUM ('CAPTURED', 'BILLED', 'UNBILLED', 'IGNORED');

-- CreateEnum
CREATE TYPE "BilSnapshotRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "BilDebitNoteStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "BilErpPushStatus" AS ENUM ('NOT_SENT', 'PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BilExceptionType" AS ENUM ('MISSING_RATE', 'DUP_EVENT', 'ORPHAN_EVENT', 'LATE_EVENT', 'SNAPSHOT_FAIL', 'ERP_FAIL', 'DATA_MISMATCH');

-- CreateEnum
CREATE TYPE "BilExceptionSeverity" AS ENUM ('INFO', 'WARN', 'ERROR', 'BLOCKER');

-- CreateEnum
CREATE TYPE "BilExceptionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "BilOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "BilDayType" AS ENUM ('WORKING_DAY', 'DAY_OFF', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "BilFeeType" AS ENUM ('STORAGE', 'HANDLING_INBOUND', 'HANDLING_OUTBOUND', 'BAGGING', 'STUFFING');

-- CreateEnum
CREATE TYPE "RptExportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RptExportFormat" AS ENUM ('CSV', 'PDF');

-- CreateEnum
CREATE TYPE "RptReconciliationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RptReconciliationTriggerType" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RptReconciliationResultStatus" AS ENUM ('PASS', 'WARNING', 'FAIL');

-- CreateEnum
CREATE TYPE "RptReconciliationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RptReconciliationResolutionAction" AS ENUM ('RESOLVED', 'REOPENED', 'COMMENT');

-- CreateEnum
CREATE TYPE "RptGoLiveGateType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "RptGoLiveMilestone" AS ENUM ('BEFORE_SIT', 'BEFORE_UAT', 'BEFORE_GO_LIVE');

-- CreateEnum
CREATE TYPE "RptGoLiveGateStatus" AS ENUM ('PASS', 'FAIL', 'WAIVED', 'PENDING');

-- CreateEnum
CREATE TYPE "RptReportRunMode" AS ENUM ('SCREEN', 'EXPORT', 'API');

-- CreateEnum
CREATE TYPE "RptReportRunStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AuthChannel" AS ENUM ('WEB', 'MOBILE', 'API');

-- CreateEnum
CREATE TYPE "AuthSecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAIL', 'LOGOUT', 'LOGOUT_ALL', 'TOKEN_REFRESH', 'TOKEN_REFRESH_FAIL', 'REFRESH_REPLAY_DETECTED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_ADMIN', 'SESSION_REVOKED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'ACCESS_DENIED', 'WAREHOUSE_CONTEXT_SWITCHED', 'USER_DEACTIVATED');

-- CreateEnum
CREATE TYPE "AuthSecurityEventSeverity" AS ENUM ('INFO', 'WARN', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "user_code" VARCHAR(50) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(50),
    "user_type" VARCHAR(30) NOT NULL DEFAULT 'INTERNAL',
    "default_warehouse_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auth_version" BIGINT NOT NULL DEFAULT 1,
    "last_login_at" TIMESTAMP(3),
    "last_password_changed_at" TIMESTAMP(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reason_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "number_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_sequence_counter" (
    "id" UUID NOT NULL,
    "sequence_id" UUID NOT NULL,
    "scope_key" VARCHAR(100) NOT NULL,
    "counter_date" DATE NOT NULL,
    "last_number" BIGINT NOT NULL DEFAULT 0,
    "version_no" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "number_sequence_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_rule_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_control_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3),

    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_uom" (
    "id" UUID NOT NULL,
    "uom_code" VARCHAR(20) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "uom_class" "UomClass" NOT NULL,
    "is_base_uom" BOOLEAN NOT NULL DEFAULT false,
    "decimal_precision" SMALLINT NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_inventory_status" (
    "id" UUID NOT NULL,
    "status_code" VARCHAR(30) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "display_order" SMALLINT NOT NULL DEFAULT 0,
    "is_allocatable" BOOLEAN NOT NULL DEFAULT false,
    "is_system_locked" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_inventory_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_warehouse" (
    "id" UUID NOT NULL,
    "warehouse_code" VARCHAR(50) NOT NULL,
    "warehouse_name" VARCHAR(255) NOT NULL,
    "site_id" VARCHAR(50) NOT NULL DEFAULT 'TVL-SITE',
    "warehouse_type" "WarehouseType" NOT NULL,
    "total_area_m2" DECIMAL(18,2) NOT NULL,
    "usable_area_m2" DECIMAL(18,2),
    "max_height_m" DECIMAL(18,2) NOT NULL,
    "max_capacity_mt" DECIMAL(18,3) NOT NULL,
    "address" TEXT,
    "has_weighbridge" BOOLEAN NOT NULL DEFAULT false,
    "weighbridge_count" INTEGER,
    "is_bonded" BOOLEAN NOT NULL DEFAULT false,
    "capacity_warning_pct" DECIMAL(5,2) NOT NULL,
    "default_receiving_location_id" UUID,
    "default_staging_location_id" UUID,
    "default_shipping_location_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_zone" (
    "id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "zone_code" VARCHAR(50) NOT NULL,
    "zone_name" VARCHAR(255) NOT NULL,
    "zone_type" "ZoneType" NOT NULL,
    "is_billing_zone" BOOLEAN NOT NULL DEFAULT false,
    "billing_rate_zone" VARCHAR(100),
    "max_capacity_mt" DECIMAL(18,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_location" (
    "id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "location_code" VARCHAR(50) NOT NULL,
    "location_type" "LocationType" NOT NULL,
    "location_profile" VARCHAR(50) NOT NULL,
    "status" "LocationStatus" NOT NULL DEFAULT 'OK',
    "area_m2" DECIMAL(18,2),
    "max_height_m" DECIMAL(18,2),
    "stack_limit_kg" DECIMAL(18,3),
    "is_mixed_owner" BOOLEAN NOT NULL DEFAULT false,
    "is_mixed_product" BOOLEAN NOT NULL DEFAULT false,
    "is_billing_location" BOOLEAN NOT NULL DEFAULT false,
    "stacking_rule" VARCHAR(30),
    "x_coord" DECIMAL(18,6),
    "y_coord" DECIMAL(18,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_owner" (
    "id" UUID NOT NULL,
    "owner_code" VARCHAR(50) NOT NULL,
    "owner_name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(100) NOT NULL,
    "owner_group" VARCHAR(100) NOT NULL,
    "owner_type" "OwnerType" NOT NULL,
    "tax_code" VARCHAR(50) NOT NULL,
    "address" TEXT NOT NULL,
    "billing_email" VARCHAR(255),
    "billing_contact" VARCHAR(255),
    "payment_terms" VARCHAR(30),
    "default_tolerance_pct" DECIMAL(8,4),
    "default_warehouse_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_vendor" (
    "id" UUID NOT NULL,
    "vendor_code" VARCHAR(50) NOT NULL,
    "vendor_name" VARCHAR(255) NOT NULL,
    "supplier_group" "SupplierGroup" NOT NULL,
    "country_region" VARCHAR(50),
    "vessel_name" VARCHAR(255),
    "contact_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "tax_code" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_customer" (
    "id" UUID NOT NULL,
    "customer_code" VARCHAR(20) NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(50),
    "customer_group" "CustomerGroup" NOT NULL,
    "customer_type" "CustomerType" NOT NULL,
    "tax_code" VARCHAR(20),
    "contact_name" VARCHAR(100),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "address" VARCHAR(500),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_item" (
    "id" UUID NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "item_name_en" VARCHAR(255),
    "alt_item_code" VARCHAR(100),
    "product_group" VARCHAR(100),
    "cargo_form" "CargoForm" NOT NULL,
    "category" VARCHAR(100),
    "is_packaging" BOOLEAN NOT NULL DEFAULT false,
    "base_uom_id" UUID NOT NULL,
    "billing_uom_id" UUID NOT NULL,
    "catch_weight_uom_id" UUID,
    "std_gross_weight" DECIMAL(18,6),
    "std_net_weight" DECIMAL(18,6),
    "density_mt_per_m3" DECIMAL(18,6),
    "std_cube_m3" DECIMAL(18,6),
    "tolerance_pct_inbound" DECIMAL(8,4),
    "tolerance_pct_outbound" DECIMAL(8,4),
    "shrinkage_rate_pct" DECIMAL(8,4),
    "rotate_by" VARCHAR(30),
    "shelf_life_days" INTEGER,
    "default_zone_id" UUID,
    "putaway_strategy_key" VARCHAR(100),
    "default_bag_weight_kg" DECIMAL(18,6),
    "packaging_material_item_id" UUID,
    "nominal_qty_per_unit" DECIMAL(18,6),
    "hs_code" VARCHAR(50),
    "country_of_origin" VARCHAR(50),
    "is_catch_weight" BOOLEAN NOT NULL DEFAULT false,
    "is_storage_billable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_vehicle_type" (
    "id" UUID NOT NULL,
    "vehicle_type_code" VARCHAR(50) NOT NULL,
    "vehicle_type_name" VARCHAR(255) NOT NULL,
    "category" "VehicleCategory" NOT NULL,
    "default_tare_weight_kg" DECIMAL(18,3) NOT NULL,
    "max_payload_kg" DECIMAL(18,3) NOT NULL,
    "teu_equivalent" DECIMAL(18,3),
    "handling_fee_group" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_vehicle_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_uom_conversion" (
    "id" UUID NOT NULL,
    "from_uom_id" UUID NOT NULL,
    "to_uom_id" UUID NOT NULL,
    "conversion_factor" DECIMAL(24,12) NOT NULL,
    "item_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_uom_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_service_code" (
    "id" UUID NOT NULL,
    "service_code" VARCHAR(50) NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "service_group" "ServiceGroup" NOT NULL,
    "default_uom_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_service_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_day_type" (
    "id" UUID NOT NULL,
    "day_type_code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "calendar_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_day_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_rate_reference" (
    "id" UUID NOT NULL,
    "rate_reference_code" VARCHAR(50) NOT NULL,
    "owner_id" UUID NOT NULL,
    "service_code_id" UUID NOT NULL,
    "cargo_form" "CargoForm" NOT NULL,
    "billing_uom_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "day_type_id" UUID,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_rate_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_owner_item_policy" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "tolerance_pct_inbound_override" DECIMAL(8,4),
    "tolerance_pct_outbound_override" DECIMAL(8,4),
    "billing_uom_override_id" UUID,
    "is_storage_billable_override" BOOLEAN,
    "preferred_warehouse_id" UUID,
    "handling_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,

    CONSTRAINT "md_owner_item_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_import_batch" (
    "id" UUID NOT NULL,
    "batch_no" VARCHAR(50) NOT NULL,
    "entity_name" VARCHAR(50) NOT NULL,
    "template_version" VARCHAR(20) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_storage_key" VARCHAR(255),
    "import_mode" VARCHAR(20) NOT NULL,
    "all_or_nothing" BOOLEAN NOT NULL DEFAULT false,
    "status" "ImportBatchStatus" NOT NULL,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "skipped_rows" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "requested_by" UUID,
    "correlation_id" VARCHAR(100),
    "external_id" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "md_import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_import_batch_line" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "row_no" INTEGER NOT NULL,
    "row_payload" JSONB NOT NULL,
    "action_type" "ImportActionType",
    "processing_status" "ImportProcessingStatus" NOT NULL,
    "target_entity_id" UUID,
    "target_business_key" VARCHAR(100),
    "validation_summary" JSONB,
    "committed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "md_import_batch_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_import_error" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "batch_line_id" UUID,
    "row_no" INTEGER,
    "field_name" VARCHAR(100),
    "error_code" VARCHAR(50) NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_level" "ImportErrorLevel" NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "md_import_error_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invent_dim" (
    "id" UUID NOT NULL,
    "dim_id" VARCHAR(40) NOT NULL,
    "dim_hash" VARCHAR(64) NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "inventory_status_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "invent_dim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invent_trans" (
    "id" UUID NOT NULL,
    "trans_id" VARCHAR(40) NOT NULL,
    "ref_type" VARCHAR(40) NOT NULL,
    "ref_id" VARCHAR(50) NOT NULL,
    "ref_line_id" VARCHAR(50),
    "trans_type" "InventoryTransType" NOT NULL,
    "item_id" UUID NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "uom_id" UUID NOT NULL,
    "dim_from_id" UUID,
    "dim_to_id" UUID,
    "status_from_code" VARCHAR(30),
    "status_to_code" VARCHAR(30),
    "stage" "InventoryStage" NOT NULL DEFAULT 'PHYSICAL',
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "reason_code" VARCHAR(50),
    "source_app" "SourceApp" NOT NULL,
    "posted_by" UUID,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "owner_id" UUID NOT NULL,
    "weighbridge_ticket_id" VARCHAR(50),
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "reversal_of_trans_id" VARCHAR(40),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invent_trans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "on_hand" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "invent_dim_id" UUID NOT NULL,
    "physical_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "reserved_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "available_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "ordered_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "lot_number" VARCHAR(50),
    "uom_id" UUID NOT NULL,
    "last_movement_at" TIMESTAMP(3),
    "last_count_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "on_hand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_hold" (
    "id" UUID NOT NULL,
    "hold_no" VARCHAR(40) NOT NULL,
    "shipment_id" VARCHAR(50),
    "shipment_line_id" VARCHAR(50),
    "work_header_id" VARCHAR(50),
    "item_id" UUID NOT NULL,
    "invent_dim_id" UUID NOT NULL,
    "on_hand_id" UUID NOT NULL,
    "hold_qty" DECIMAL(18,3) NOT NULL,
    "released_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason_code" VARCHAR(50),
    "external_id" VARCHAR(120),
    "correlation_id" VARCHAR(120) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),
    "released_by" UUID,

    CONSTRAINT "inventory_hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reversal_link" (
    "id" UUID NOT NULL,
    "original_trans_id" UUID NOT NULL,
    "reversal_trans_id" UUID NOT NULL,
    "reverse_reason_code" VARCHAR(50) NOT NULL,
    "reverse_note" TEXT,
    "reversed_by" UUID,
    "reversed_at" TIMESTAMP(3) NOT NULL,
    "correction_ref_type" VARCHAR(40),
    "correction_ref_id" VARCHAR(50),
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "inventory_reversal_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reconciliation_run" (
    "id" UUID NOT NULL,
    "run_no" VARCHAR(40) NOT NULL,
    "run_type" "ReconciliationRunType" NOT NULL,
    "scope_type" "ReconciliationScopeType" NOT NULL,
    "warehouse_id" UUID,
    "owner_id" UUID,
    "item_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" "ReconciliationRunStatus" NOT NULL,
    "mismatch_count" INTEGER NOT NULL DEFAULT 0,
    "requested_by" UUID,
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "inventory_reconciliation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reconciliation_result" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "invent_dim_id" UUID NOT NULL,
    "ledger_qty" DECIMAL(18,3) NOT NULL,
    "onhand_physical_qty" DECIMAL(18,3) NOT NULL,
    "reserved_qty" DECIMAL(18,3) NOT NULL,
    "available_qty" DECIMAL(18,3) NOT NULL,
    "diff_qty" DECIMAL(18,3) NOT NULL,
    "severity" "ReconciliationSeverity" NOT NULL,
    "rule_code" VARCHAR(40) NOT NULL,
    "result_status" "ReconciliationResultStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reconciliation_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_snapshot_run" (
    "id" UUID NOT NULL,
    "run_no" VARCHAR(40) NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "warehouse_id" UUID,
    "cut_off_time" TIMESTAMP(3) NOT NULL,
    "run_mode" "SnapshotRunMode" NOT NULL,
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "status" "SnapshotRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "requested_by" UUID,
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "inventory_snapshot_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_storage_snapshot" (
    "id" UUID NOT NULL,
    "snapshot_run_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "invent_dim_id" UUID NOT NULL,
    "opening_qty" DECIMAL(18,3) NOT NULL,
    "inbound_today_qty" DECIMAL(18,3) NOT NULL,
    "outbound_today_qty" DECIMAL(18,3) NOT NULL,
    "closing_qty" DECIMAL(18,3) NOT NULL,
    "cut_off_time" TIMESTAMP(3) NOT NULL,
    "snapshot_source" VARCHAR(50) NOT NULL,
    "correlation_id" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_storage_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_event_mapping" (
    "id" UUID NOT NULL,
    "event_code" VARCHAR(50) NOT NULL,
    "source_module" VARCHAR(20) NOT NULL,
    "source_object" VARCHAR(40) NOT NULL,
    "trigger_state" VARCHAR(40) NOT NULL,
    "trans_type" "InventoryTransType" NOT NULL,
    "affect_physical" BOOLEAN NOT NULL,
    "affect_hold" BOOLEAN NOT NULL,
    "reversible" BOOLEAN NOT NULL,
    "active_flag" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "inventory_event_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "po_number" VARCHAR(40) NOT NULL,
    "external_po_number" VARCHAR(100),
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "expected_delivery_date" DATE,
    "notes" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "total_expected_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "total_received_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "cancel_reason_code" VARCHAR(50),
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL,
    "po_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "uom_id" UUID NOT NULL,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "received_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,4),
    "notes" TEXT,
    "status" "PurchaseOrderLineStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_header" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(40),
    "receipt_type" "ReceiptType" NOT NULL,
    "po_id" VARCHAR(50) NOT NULL,
    "asn_id" VARCHAR(50),
    "owner_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "receiving_location_id" UUID NOT NULL,
    "vehicle_number" VARCHAR(30) NOT NULL,
    "bl_number" VARCHAR(50),
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "gross_weight_kg" DECIMAL(18,3),
    "tare_weight_kg" DECIMAL(18,3),
    "net_weight_kg" DECIMAL(18,3),
    "status" "ReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "tolerance_pct_applied" DECIMAL(8,4),
    "variance_pct" DECIMAL(8,4),
    "is_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "manual_entry_reason_code" VARCHAR(50),
    "posted_trans_id" VARCHAR(40),
    "putaway_work_id" VARCHAR(50),
    "cancel_reason_code" VARCHAR(50),
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMP(3),
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "receipt_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_line" (
    "id" UUID NOT NULL,
    "receipt_header_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "uom_id" UUID NOT NULL,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "received_qty" DECIMAL(18,3),
    "bag_count" INTEGER,
    "nominal_weight_per_bag" DECIMAL(18,3),
    "cargo_form" "CargoForm" NOT NULL,
    "status" "ReceiptLineStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "receipt_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_weighing_log" (
    "id" UUID NOT NULL,
    "receipt_header_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "weigh_phase" "WeighPhase" NOT NULL,
    "ticket_id" VARCHAR(80),
    "event_id" VARCHAR(120),
    "gross_weight_kg" DECIMAL(18,3),
    "tare_weight_kg" DECIMAL(18,3),
    "net_weight_kg" DECIMAL(18,3),
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "manual_reason_code" VARCHAR(50),
    "source_app" "SourceApp" NOT NULL,
    "event_timestamp" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_payload" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_weighing_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_status_history" (
    "id" UUID NOT NULL,
    "receipt_header_id" UUID NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "transition_code" VARCHAR(30) NOT NULL,
    "triggered_by" UUID,
    "trigger_role" VARCHAR(50),
    "reason_code" VARCHAR(50),
    "note" TEXT,
    "correlation_id" VARCHAR(120) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "receipt_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_exception_log" (
    "id" UUID NOT NULL,
    "receipt_header_id" UUID,
    "exception_type" VARCHAR(50) NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "stage" VARCHAR(30) NOT NULL,
    "reason_code" VARCHAR(50),
    "message" TEXT NOT NULL,
    "details" JSONB,
    "integration_target" VARCHAR(30),
    "external_id" VARCHAR(120),
    "correlation_id" VARCHAR(120) NOT NULL,
    "occurred_by" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,

    CONSTRAINT "receipt_exception_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_integration_state" (
    "id" UUID NOT NULL,
    "receipt_header_id" UUID NOT NULL,
    "target_module" VARCHAR(20) NOT NULL,
    "action_code" VARCHAR(40) NOT NULL,
    "delivery_status" "IntegrationDeliveryStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_request_payload" JSONB,
    "last_response_payload" JSONB,
    "last_error_code" VARCHAR(50),
    "last_error_message" TEXT,
    "next_retry_at" TIMESTAMP(3),
    "last_attempt_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "correlation_id" VARCHAR(120) NOT NULL,
    "external_id" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_integration_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_header" (
    "id" UUID NOT NULL,
    "shipment_number" VARCHAR(40),
    "so_id" VARCHAR(50),
    "source_type" "ShipmentSourceType" NOT NULL,
    "owner_id" UUID NOT NULL,
    "customer_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "vehicle_number" VARCHAR(30) NOT NULL,
    "vehicle_type_id" UUID,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "tare_weight_kg" DECIMAL(18,3),
    "total_gross_kg" DECIMAL(18,3),
    "total_net_kg" DECIMAL(18,3),
    "all_lines_passed" BOOLEAN NOT NULL DEFAULT false,
    "pending_approval_count" INTEGER NOT NULL DEFAULT 0,
    "is_dpm_shipment" BOOLEAN NOT NULL DEFAULT false,
    "cancel_reason_code" VARCHAR(50),
    "close_reason_code" VARCHAR(50),
    "shipped_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "shipment_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_line" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "so_line_id" VARCHAR(50),
    "item_id" UUID NOT NULL,
    "cargo_form" "CargoForm" NOT NULL,
    "uom_id" UUID NOT NULL,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "expected_qty_kg" DECIMAL(18,3) NOT NULL,
    "allocated_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "picked_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "loaded_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "shipped_qty" DECIMAL(18,3),
    "bag_count" INTEGER,
    "nominal_weight_per_bag" DECIMAL(18,3),
    "tolerance_pct_applied" DECIMAL(8,4),
    "variance_pct" DECIMAL(8,4),
    "gross_weight_kg" DECIMAL(18,3),
    "net_weight_kg" DECIMAL(18,3),
    "weigh_sequence_no" INTEGER,
    "line_status" "ShipmentLineStatus" NOT NULL DEFAULT 'PENDING',
    "posted_trans_id" VARCHAR(40),
    "is_dpm_line" BOOLEAN NOT NULL DEFAULT false,
    "dpm_nominal_qty_kg" DECIMAL(18,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "shipment_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_allocation_record" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "invent_dim_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "allocated_qty" DECIMAL(18,3) NOT NULL,
    "picked_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "released_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "posted_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "lot_date" DATE NOT NULL,
    "fifo_rank" INTEGER,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ALLOCATED',
    "hold_ref" VARCHAR(50),
    "external_id" VARCHAR(120),
    "correlation_id" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "shipment_allocation_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_weighing_attempt" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID,
    "weigh_type" "WeighType" NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "source_mode" "WeighSourceMode" NOT NULL,
    "raw_weight_kg" DECIMAL(18,3) NOT NULL,
    "calculated_net_kg" DECIMAL(18,3),
    "scale_ticket_no" VARCHAR(80),
    "external_event_id" VARCHAR(120),
    "captured_at" TIMESTAMP(3) NOT NULL,
    "captured_by" UUID,
    "duplicate_of_attempt_id" UUID,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "reason_code" VARCHAR(50),
    "remark" TEXT,
    "correlation_id" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_weighing_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_status_history" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID,
    "entity_level" VARCHAR(10) NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "trigger_action" VARCHAR(50) NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason_code" VARCHAR(50),
    "note" TEXT,
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "shipment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_exception_log" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID,
    "exception_type" "ShipmentExceptionType" NOT NULL,
    "exception_code" VARCHAR(50) NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "status" "ShipmentExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "reason_code" VARCHAR(50),
    "detail_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "shipment_exception_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_approval_decision" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID,
    "decision_type" "ApprovalDecisionType" NOT NULL,
    "approval_scope" "ApprovalScope" NOT NULL,
    "reason_code" VARCHAR(50) NOT NULL,
    "note" TEXT,
    "decided_by" UUID NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before_snapshot" JSONB,
    "after_snapshot" JSONB,
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "shipment_approval_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_pick_work_link" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID,
    "work_type" "WorkLinkType" NOT NULL,
    "work_header_id" VARCHAR(50) NOT NULL,
    "work_line_id" VARCHAR(50),
    "status" "WorkLinkStatus" NOT NULL DEFAULT 'REQUESTED',
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "payload_json" JSONB,

    CONSTRAINT "shipment_pick_work_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_posting_link" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "shipment_line_id" UUID NOT NULL,
    "posting_action" "PostingAction" NOT NULL,
    "m3_external_id" VARCHAR(120) NOT NULL,
    "m3_trans_id" VARCHAR(40),
    "status" "PostingStatus" NOT NULL DEFAULT 'PENDING',
    "request_payload" JSONB,
    "response_payload" JSONB,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "correlation_id" VARCHAR(120) NOT NULL,

    CONSTRAINT "shipment_posting_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_so_link" (
    "id" UUID NOT NULL,
    "shipment_header_id" UUID NOT NULL,
    "so_id" VARCHAR(50) NOT NULL,
    "so_line_id" VARCHAR(50),
    "expected_qty_kg" DECIMAL(18,3) NOT NULL,
    "allocated_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "shipped_qty_kg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_so_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_move_order" (
    "id" UUID NOT NULL,
    "move_number" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "execution_mode" "IcExecutionMode" NOT NULL,
    "status" "IcMoveOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "reason_code" VARCHAR(50),
    "remarks" TEXT,
    "requested_by" UUID NOT NULL,
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMP(3),
    "completed_by" UUID,
    "completed_at" TIMESTAMP(3),
    "work_header_id" VARCHAR(50),
    "posting_status" "IcPostingStatus" NOT NULL DEFAULT 'PENDING',
    "posted_ref" VARCHAR(100),
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" VARCHAR(50) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_move_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_move_order_line" (
    "id" UUID NOT NULL,
    "move_order_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "from_location_id" UUID NOT NULL,
    "to_location_id" UUID NOT NULL,
    "inventory_status" VARCHAR(30) NOT NULL,
    "requested_qty" DECIMAL(18,3) NOT NULL,
    "executed_qty" DECIMAL(18,3),
    "uom" VARCHAR(20) NOT NULL,
    "line_status" "IcMoveLineStatus" NOT NULL DEFAULT 'OPEN',
    "shortage_reason_code" VARCHAR(50),
    "posted_trans_group_id" VARCHAR(100),
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ic_move_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_transfer_order" (
    "id" UUID NOT NULL,
    "transfer_number" VARCHAR(50) NOT NULL,
    "from_warehouse_id" UUID NOT NULL,
    "to_warehouse_id" UUID NOT NULL,
    "execution_mode" "IcExecutionMode" NOT NULL,
    "status" "IcTransferOrderStatus" NOT NULL DEFAULT 'CREATED',
    "requested_ship_date" DATE,
    "actual_ship_at" TIMESTAMP(3),
    "actual_receive_at" TIMESTAMP(3),
    "in_transit_sla_hours" INTEGER,
    "vehicle_number" VARCHAR(50),
    "shipped_by" UUID,
    "received_by" UUID,
    "cancel_reason_code" VARCHAR(50),
    "close_reason_code" VARCHAR(50),
    "posting_ship_status" "IcPostingStatus" NOT NULL DEFAULT 'PENDING',
    "posting_receive_status" "IcPostingStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" VARCHAR(50) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_transfer_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_transfer_order_line" (
    "id" UUID NOT NULL,
    "transfer_order_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "requested_qty" DECIMAL(18,3) NOT NULL,
    "shipped_qty" DECIMAL(18,3),
    "received_qty" DECIMAL(18,3),
    "variance_qty" DECIMAL(18,3),
    "from_location_id" UUID NOT NULL,
    "to_location_id" UUID,
    "inventory_status" VARCHAR(30) NOT NULL,
    "line_status" "IcTransferLineStatus" NOT NULL DEFAULT 'OPEN',
    "variance_reason_code" VARCHAR(50),
    "issue_flag" BOOLEAN NOT NULL DEFAULT false,
    "posted_ship_trans_id" VARCHAR(100),
    "posted_receive_trans_id" VARCHAR(100),
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ic_transfer_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_inventory_status_change" (
    "id" UUID NOT NULL,
    "status_change_number" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "from_status" VARCHAR(30) NOT NULL,
    "to_status" VARCHAR(30) NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "reason_code" VARCHAR(50) NOT NULL,
    "reason_text" TEXT,
    "attachment_ref" VARCHAR(255),
    "status" "IcStatusChangeStatus" NOT NULL DEFAULT 'CREATED',
    "posted_trans_group_id" VARCHAR(100),
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "posted_at" TIMESTAMP(3),
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" VARCHAR(50) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_inventory_status_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_cycle_count_plan" (
    "id" UUID NOT NULL,
    "plan_code" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "scope_type" "IcCycleCountScopeType" NOT NULL,
    "frequency" "IcCycleCountPlanFrequency" NOT NULL,
    "selection_rule" JSONB,
    "blind_count" BOOLEAN NOT NULL DEFAULT true,
    "recount_threshold_pct" DECIMAL(8,4),
    "auto_post_threshold_pct" DECIMAL(8,4),
    "max_recount" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_cycle_count_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_cycle_count_header" (
    "id" UUID NOT NULL,
    "count_number" VARCHAR(50) NOT NULL,
    "cycle_count_plan_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "count_scope_snapshot" JSONB NOT NULL,
    "status" "IcCycleCountStatus" NOT NULL DEFAULT 'CREATED',
    "blind_count" BOOLEAN NOT NULL,
    "released_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" VARCHAR(50) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_cycle_count_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_cycle_count_line" (
    "id" UUID NOT NULL,
    "cycle_count_header_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "inventory_status" VARCHAR(30) NOT NULL,
    "system_qty" DECIMAL(18,3),
    "counted_qty" DECIMAL(18,3),
    "variance_qty" DECIMAL(18,3),
    "variance_pct" DECIMAL(8,4),
    "recount_no" INTEGER NOT NULL DEFAULT 0,
    "line_status" "IcCycleCountLineStatus" NOT NULL DEFAULT 'OPEN',
    "adjustment_header_id" UUID,
    "evidence_ref" VARCHAR(255),
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ic_cycle_count_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_adjustment_header" (
    "id" UUID NOT NULL,
    "adjustment_number" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "adjustment_type" "IcAdjustmentType" NOT NULL,
    "source_type" "IcAdjustmentSourceType" NOT NULL,
    "status" "IcAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "total_line_count" INTEGER NOT NULL DEFAULT 0,
    "total_abs_qty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "reason_code" VARCHAR(50) NOT NULL,
    "remarks" TEXT,
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" VARCHAR(50) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_adjustment_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_adjustment_line" (
    "id" UUID NOT NULL,
    "adjustment_header_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "inventory_status" VARCHAR(30) NOT NULL,
    "qty_delta" DECIMAL(18,3) NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "reason_code" VARCHAR(50) NOT NULL,
    "posted_trans_id" VARCHAR(100),
    "line_status" "IcAdjustmentLineStatus" NOT NULL DEFAULT 'OPEN',
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ic_adjustment_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_reconciliation_review" (
    "id" UUID NOT NULL,
    "reconciliation_review_number" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID,
    "scope_type" "IcReconciliationScopeType" NOT NULL,
    "source_run_id" VARCHAR(100),
    "status" "IcReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "mismatch_count" INTEGER NOT NULL DEFAULT 0,
    "severity" "IcReconciliationSeverity" NOT NULL,
    "assigned_to" UUID,
    "summary" TEXT,
    "resolution_type" "IcResolutionType",
    "resolution_ref" VARCHAR(100),
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" VARCHAR(50) NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "ic_reconciliation_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_document_status_history" (
    "id" UUID NOT NULL,
    "entity_type" "IcDocumentEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_status" VARCHAR(30),
    "new_status" VARCHAR(30) NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason_code" VARCHAR(50),
    "notes" TEXT,
    "correlation_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "ic_document_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ic_exception_log" (
    "id" UUID NOT NULL,
    "entity_type" "IcDocumentEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "exception_type" "IcExceptionType" NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "payload_json" JSONB,
    "status" "IcExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "correlation_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "ic_exception_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_header" (
    "id" UUID NOT NULL,
    "work_id" VARCHAR(40) NOT NULL,
    "work_type" "WeWorkType" NOT NULL,
    "status" "WeWorkStatus" NOT NULL DEFAULT 'OPEN',
    "priority_no" INTEGER NOT NULL DEFAULT 50,
    "warehouse_id" UUID NOT NULL,
    "zone_id" UUID,
    "source_module" "WeSourceModule" NOT NULL,
    "source_type" "WeSourceType" NOT NULL,
    "source_ref_id" VARCHAR(50) NOT NULL,
    "source_ref_line_id" VARCHAR(50),
    "source_owner_id" UUID,
    "assigned_to" UUID,
    "assigned_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason_code" VARCHAR(50),
    "assignment_mode" "WeAssignmentMode" NOT NULL DEFAULT 'SELF_CLAIM',
    "source_doc_version" BIGINT,
    "external_id" VARCHAR(120) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "version_no" BIGINT NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "we_work_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_line" (
    "id" UUID NOT NULL,
    "work_header_id" UUID NOT NULL,
    "line_num" INTEGER NOT NULL,
    "step_type" "WeStepType" NOT NULL,
    "status" "WeWorkLineStatus" NOT NULL DEFAULT 'OPEN',
    "item_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "from_warehouse_id" UUID,
    "from_location_id" UUID,
    "to_warehouse_id" UUID,
    "to_location_id" UUID,
    "expected_qty" DECIMAL(18,3) NOT NULL,
    "actual_qty" DECIMAL(18,3),
    "variance_qty" DECIMAL(18,3),
    "uom" VARCHAR(20) NOT NULL,
    "inventory_status_from" VARCHAR(30),
    "inventory_status_to" VARCHAR(30),
    "scanned_location_code" VARCHAR(50),
    "scanned_location_id" UUID,
    "reason_code" VARCHAR(50),
    "evidence_text" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" UUID,
    "posting_status" "WePostingStatus" NOT NULL DEFAULT 'PENDING',
    "posting_ref_type" VARCHAR(30),
    "posting_ref_id" VARCHAR(50),
    "posting_error_code" VARCHAR(50),
    "posting_error_message" TEXT,
    "external_id" VARCHAR(120),
    "version_no" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "we_work_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_assignment_history" (
    "id" UUID NOT NULL,
    "work_header_id" UUID NOT NULL,
    "action_type" "WeAssignmentAction" NOT NULL,
    "from_user_id" UUID,
    "to_user_id" UUID,
    "reason_code" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "we_work_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_status_history" (
    "id" UUID NOT NULL,
    "object_type" "WeStatusObjectType" NOT NULL,
    "object_id" UUID NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20) NOT NULL,
    "trigger_action" "WeTriggerAction" NOT NULL,
    "reason_code" VARCHAR(50),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "work_header_id" UUID,
    "work_line_id" UUID,

    CONSTRAINT "we_work_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_posting_link" (
    "id" UUID NOT NULL,
    "work_line_id" UUID NOT NULL,
    "posting_module" VARCHAR(20) NOT NULL DEFAULT 'M3',
    "posting_request_type" VARCHAR(30) NOT NULL,
    "posting_ref_id" VARCHAR(50),
    "posting_status" "WePostingStatus" NOT NULL DEFAULT 'PENDING',
    "posted_at" TIMESTAMP(3),
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "we_work_posting_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_event_log" (
    "id" UUID NOT NULL,
    "work_header_id" UUID,
    "work_line_id" UUID,
    "event_type" VARCHAR(40) NOT NULL,
    "event_payload" JSONB NOT NULL,
    "correlation_id" UUID NOT NULL,
    "source_app" "SourceApp" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "we_work_event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_exception" (
    "id" UUID NOT NULL,
    "work_header_id" UUID,
    "work_line_id" UUID,
    "exception_type" "WeExceptionType" NOT NULL,
    "severity" "WeExceptionSeverity" NOT NULL,
    "status" "WeExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "reason_code" VARCHAR(50),
    "detail_text" TEXT,
    "resolution_text" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "we_work_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_mobile_sync_batch" (
    "id" UUID NOT NULL,
    "batch_no" VARCHAR(40) NOT NULL,
    "device_id" VARCHAR(80) NOT NULL,
    "user_id" UUID NOT NULL,
    "sync_status" "WeSyncBatchStatus" NOT NULL DEFAULT 'RECEIVED',
    "event_count" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "conflict_count" INTEGER NOT NULL DEFAULT 0,
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "we_mobile_sync_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_mobile_sync_event" (
    "id" UUID NOT NULL,
    "sync_batch_id" UUID NOT NULL,
    "external_id" VARCHAR(120) NOT NULL,
    "device_sequence_no" BIGINT NOT NULL,
    "event_type" "WeSyncEventType" NOT NULL,
    "work_id" VARCHAR(40) NOT NULL,
    "work_line_id" UUID,
    "event_payload" JSONB NOT NULL,
    "processing_result" "WeSyncResult" NOT NULL DEFAULT 'PENDING',
    "result_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "we_mobile_sync_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "we_work_outbox_event" (
    "id" UUID NOT NULL,
    "aggregate_type" VARCHAR(30) NOT NULL DEFAULT 'WORK',
    "aggregate_id" UUID NOT NULL,
    "event_type" VARCHAR(40) NOT NULL,
    "target_module" VARCHAR(20) NOT NULL,
    "payload" JSONB NOT NULL,
    "delivery_status" "WeOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "work_header_id" UUID,

    CONSTRAINT "we_work_outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_weighbridge_device" (
    "id" UUID NOT NULL,
    "device_code" VARCHAR(50) NOT NULL,
    "device_name" VARCHAR(150) NOT NULL,
    "warehouse_id" UUID,
    "port_name" VARCHAR(50),
    "baud_rate" INTEGER,
    "data_bits" INTEGER,
    "stop_bits" INTEGER,
    "parity" VARCHAR(20),
    "frame_format" VARCHAR(100),
    "heartbeat_interval_sec" INTEGER NOT NULL DEFAULT 300,
    "stable_window_ms" INTEGER NOT NULL DEFAULT 1000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3),
    "last_status" "M8DeviceStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_weighbridge_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_weighbridge_log" (
    "id" UUID NOT NULL,
    "weighbridge_event_id" VARCHAR(100) NOT NULL,
    "receipt_id" UUID,
    "shipment_id" UUID,
    "vehicle_number" VARCHAR(50) NOT NULL,
    "weighing_type" "M8WeighingType" NOT NULL,
    "weighing_sequence" INTEGER NOT NULL,
    "gross_weight_kg" DECIMAL(18,3),
    "tare_weight_kg" DECIMAL(18,3),
    "net_weight_kg" DECIMAL(18,3),
    "raw_weight_value" VARCHAR(100),
    "raw_payload" JSONB,
    "is_stable_weight" BOOLEAN NOT NULL DEFAULT false,
    "is_duplicate_signal" BOOLEAN NOT NULL DEFAULT false,
    "duplicate_of_event_id" VARCHAR(100),
    "is_manual_entry" BOOLEAN NOT NULL DEFAULT false,
    "manual_reason_code" VARCHAR(50),
    "approved_by" UUID,
    "scale_device_id" VARCHAR(50) NOT NULL,
    "photo_alpr_path" VARCHAR(500),
    "photo_cargo_path" VARCHAR(500),
    "latency_ms" INTEGER,
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "source_channel" VARCHAR(30) NOT NULL,
    "weighing_timestamp" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m8_weighbridge_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_weighbridge_event_state" (
    "id" UUID NOT NULL,
    "weighbridge_log_id" UUID NOT NULL,
    "processing_status" "M8WeighEventProcessingStatus" NOT NULL,
    "linked_module" VARCHAR(20),
    "linked_object_id" UUID,
    "callback_status" "M8CallbackStatus",
    "callback_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_weighbridge_event_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_ocr_result" (
    "id" UUID NOT NULL,
    "ocr_request_id" VARCHAR(100) NOT NULL,
    "image_path" VARCHAR(500) NOT NULL,
    "provider_name" VARCHAR(50) NOT NULL,
    "provider_request_id" VARCHAR(100),
    "bl_number" VARCHAR(50),
    "bl_confidence" DECIMAL(5,2),
    "vehicle_number" VARCHAR(50),
    "vehicle_confidence" DECIMAL(5,2),
    "product_name" VARCHAR(200),
    "product_confidence" DECIMAL(5,2),
    "vessel_name" VARCHAR(200),
    "vessel_confidence" DECIMAL(5,2),
    "qty_extracted" DECIMAL(18,3),
    "qty_uom" VARCHAR(20),
    "qty_confidence" DECIMAL(5,2),
    "overall_confidence" DECIMAL(5,2),
    "raw_response" JSONB,
    "linked_receipt_id" UUID,
    "link_method" "M8OcrLinkMethod",
    "operator_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "M8OcrStatus" NOT NULL DEFAULT 'UPLOADED',
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "source_channel" VARCHAR(20) NOT NULL DEFAULT 'OCR',
    "warehouse_id" UUID,
    "created_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_ocr_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_ocr_confirmed_snapshot" (
    "id" UUID NOT NULL,
    "ocr_result_id" UUID NOT NULL,
    "confirmed_bl_number" VARCHAR(50),
    "confirmed_vehicle_number" VARCHAR(50),
    "confirmed_product_name" VARCHAR(200),
    "confirmed_vessel_name" VARCHAR(200),
    "confirmed_qty" DECIMAL(18,3),
    "confirmed_qty_uom" VARCHAR(20),
    "corrections_json" JSONB,
    "confirmed_by" UUID NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "m8_ocr_confirmed_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_mobile_sync_batch" (
    "id" UUID NOT NULL,
    "batch_id" VARCHAR(100) NOT NULL,
    "device_id" VARCHAR(50) NOT NULL,
    "keeper_user_id" UUID NOT NULL,
    "app_version" VARCHAR(30),
    "event_count" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "M8SyncBatchStatus" NOT NULL DEFAULT 'QUEUED',
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "conflict_count" INTEGER NOT NULL DEFAULT 0,
    "accepted_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "first_sequence_no" BIGINT,
    "last_sequence_no" BIGINT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "source_channel" VARCHAR(20) NOT NULL DEFAULT 'MOBILE_SYNC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_mobile_sync_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_mobile_sync_event" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "event_external_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "work_id" UUID,
    "work_line_id" UUID,
    "source_module" VARCHAR(20) NOT NULL,
    "device_id" VARCHAR(50) NOT NULL,
    "device_event_time" TIMESTAMP(3) NOT NULL,
    "sequence_no" BIGINT NOT NULL,
    "payload" JSONB NOT NULL,
    "process_status" "M8SyncEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "process_error" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m8_mobile_sync_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_erp_push_log" (
    "id" UUID NOT NULL,
    "push_job_id" VARCHAR(100) NOT NULL,
    "push_type" VARCHAR(30) NOT NULL,
    "reference_id" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" VARCHAR(128),
    "status" "M8ErpPushStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 10,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "response_code" INTEGER,
    "response_body" JSONB,
    "error_message" TEXT,
    "endpoint_name" VARCHAR(100),
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "source_channel" VARCHAR(20) NOT NULL DEFAULT 'ERP_PUSH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_erp_push_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_integration_alert" (
    "id" UUID NOT NULL,
    "alert_code" VARCHAR(50) NOT NULL,
    "alert_source" VARCHAR(30) NOT NULL,
    "severity" "M8AlertSeverity" NOT NULL,
    "source_ref_type" VARCHAR(30),
    "source_ref_id" VARCHAR(100),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "M8AlertStatus" NOT NULL DEFAULT 'OPEN',
    "owner_role" VARCHAR(30),
    "warehouse_id" UUID,
    "correlation_id" UUID,
    "first_raised_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_integration_alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_channel_health_snapshot" (
    "id" UUID NOT NULL,
    "channel_name" VARCHAR(30) NOT NULL,
    "status" "M8ChannelStatus" NOT NULL DEFAULT 'HEALTHY',
    "open_alert_count" INTEGER NOT NULL DEFAULT 0,
    "backlog_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate_1h" DECIMAL(5,2),
    "avg_latency_ms_1h" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m8_channel_health_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m8_device_heartbeat" (
    "id" UUID NOT NULL,
    "device_code" VARCHAR(50) NOT NULL,
    "agent_version" VARCHAR(30),
    "port_name" VARCHAR(50),
    "last_weight_read_at" TIMESTAMP(3),
    "buffer_pending_count" INTEGER NOT NULL DEFAULT 0,
    "health_status" VARCHAR(30),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "m8_device_heartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vas_work_order" (
    "id" UUID NOT NULL,
    "wo_number" VARCHAR(30) NOT NULL,
    "status" "VasWoStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "bulk_source_item_id" UUID NOT NULL,
    "bagged_output_item_id" UUID NOT NULL,
    "planned_qty_kg" DECIMAL(18,3) NOT NULL,
    "actual_consumed_qty_kg" DECIMAL(18,3),
    "actual_output_qty_kg" DECIMAL(18,3),
    "process_loss_qty_kg" DECIMAL(18,3),
    "actual_bag_count" INTEGER,
    "packaging_ownership" "VasPackagingOwnership" NOT NULL,
    "packaging_item_id" UUID NOT NULL,
    "packaging_owner_id" UUID NOT NULL,
    "packaging_qty_planned" INTEGER NOT NULL,
    "packaging_qty_actual" INTEGER,
    "start_date" DATE NOT NULL,
    "estimated_completion_date" DATE,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" UUID,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "cancel_reason_code" VARCHAR(50),
    "yield_variance_reason_code" VARCHAR(50),
    "notes" TEXT,
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "row_version" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "vas_work_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vas_session" (
    "id" UUID NOT NULL,
    "wo_id" UUID NOT NULL,
    "session_num" INTEGER NOT NULL,
    "session_date" DATE NOT NULL,
    "shift_code" "VasShiftCode" NOT NULL,
    "session_qty_kg" DECIMAL(18,3) NOT NULL,
    "session_bag_count" INTEGER NOT NULL,
    "work_hours" DECIMAL(8,2),
    "productivity_rate" DECIMAL(18,3),
    "is_overtime" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "notes" TEXT,
    "external_id" VARCHAR(100) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vas_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vas_state_history" (
    "id" UUID NOT NULL,
    "wo_id" UUID NOT NULL,
    "from_status" "VasWoStatus",
    "to_status" "VasWoStatus" NOT NULL,
    "action" "VasStateAction" NOT NULL,
    "reason_code" VARCHAR(50),
    "remarks" TEXT,
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(30) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vas_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vas_exception_log" (
    "id" UUID NOT NULL,
    "wo_id" UUID NOT NULL,
    "exception_code" VARCHAR(50) NOT NULL,
    "severity" "VasExceptionSeverity" NOT NULL,
    "payload_json" JSONB,
    "reason_code" VARCHAR(50),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vas_exception_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vas_outbox" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL DEFAULT 'VAS_WORK_ORDER',
    "aggregate_id" UUID NOT NULL,
    "aggregate_number" VARCHAR(30) NOT NULL,
    "event_key" VARCHAR(120) NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "VasOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "vas_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_contract" (
    "id" UUID NOT NULL,
    "contract_number" VARCHAR(30) NOT NULL,
    "owner_id" UUID NOT NULL,
    "contract_scope" VARCHAR(20) NOT NULL DEFAULT 'OWNER',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE NOT NULL,
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "BilContractStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "superseded_contract_id" UUID,
    "external_id" VARCHAR(100) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bil_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_contract_fee_line" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "fee_type" "BilFeeType" NOT NULL,
    "cargo_form" "CargoForm",
    "warehouse_id" UUID,
    "day_type_scope" VARCHAR(20),
    "billing_uom" VARCHAR(10) NOT NULL DEFAULT 'MT',
    "unit_rate" DECIMAL(18,2) NOT NULL,
    "minimum_charge" DECIMAL(18,2),
    "free_days" INTEGER,
    "material_rate_per_bag" DECIMAL(18,2),
    "tier_rule_code" VARCHAR(30),
    "priority_rank" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bil_contract_fee_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_day_type_calendar" (
    "id" UUID NOT NULL,
    "calendar_date" DATE NOT NULL,
    "day_type" "BilDayType" NOT NULL,
    "default_ot_multiplier" DECIMAL(6,3) NOT NULL,
    "no_ot_multiplier" DECIMAL(6,3) NOT NULL,
    "with_ot_multiplier" DECIMAL(6,3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bil_day_type_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_event" (
    "id" UUID NOT NULL,
    "event_type" "BilEventType" NOT NULL,
    "ref_type" VARCHAR(30) NOT NULL,
    "ref_id" VARCHAR(50) NOT NULL,
    "ref_line_id" VARCHAR(50),
    "owner_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "item_id" UUID,
    "cargo_form" "CargoForm",
    "billing_qty_mt" DECIMAL(18,3) NOT NULL,
    "event_date" DATE NOT NULL,
    "operation_timestamp" TIMESTAMP(3) NOT NULL,
    "day_type" "BilDayType" NOT NULL,
    "is_overtime" BOOLEAN NOT NULL DEFAULT false,
    "combined_multiplier" DECIMAL(6,3) NOT NULL,
    "rate_status" "BilEventRateStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "billing_status" "BilEventBillingStatus" NOT NULL DEFAULT 'CAPTURED',
    "source_module" VARCHAR(10) NOT NULL,
    "source_payload_json" JSONB,
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "device_or_source_app" VARCHAR(30),
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "debit_note_line_id" UUID,

    CONSTRAINT "bil_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_snapshot_run" (
    "id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "warehouse_scope" VARCHAR(50),
    "status" "BilSnapshotRunStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "triggered_by" VARCHAR(30) NOT NULL,
    "external_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bil_snapshot_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_storage_snapshot" (
    "id" UUID NOT NULL,
    "snapshot_run_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "cut_off_time" TIMESTAMP(3) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "receipt_line_id" UUID,
    "inventory_status" VARCHAR(20) NOT NULL,
    "is_billable_status" BOOLEAN NOT NULL,
    "first_putaway_date" DATE,
    "days_in_storage" INTEGER,
    "opening_qty_mt" DECIMAL(18,3) NOT NULL,
    "inbound_today_mt" DECIMAL(18,3) NOT NULL,
    "outbound_today_mt" DECIMAL(18,3) NOT NULL,
    "closing_qty_mt" DECIMAL(18,3) NOT NULL,
    "billable_qty_mt" DECIMAL(18,3) NOT NULL,
    "free_days_allowed" INTEGER,
    "is_free_day" BOOLEAN NOT NULL,
    "applied_rate_per_mt_day" DECIMAL(18,2),
    "daily_amount_vnd" DECIMAL(18,2),
    "trace_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "debit_note_line_id" UUID,

    CONSTRAINT "bil_storage_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_debit_note" (
    "id" UUID NOT NULL,
    "dn_number" VARCHAR(30) NOT NULL,
    "owner_id" UUID NOT NULL,
    "contract_id" UUID,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "generation_basis" VARCHAR(20) NOT NULL DEFAULT 'PERIOD',
    "status" "BilDebitNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "total_before_vat" DECIMAL(18,2) NOT NULL,
    "vat_rate" DECIMAL(6,3) NOT NULL DEFAULT 0.10,
    "vat_amount" DECIMAL(18,2) NOT NULL,
    "grand_total" DECIMAL(18,2) NOT NULL,
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "contract_version_json" JSONB,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "locked_by" UUID,
    "locked_at" TIMESTAMP(3),
    "erp_push_status" "BilErpPushStatus" NOT NULL DEFAULT 'NOT_SENT',
    "external_id" VARCHAR(100) NOT NULL,
    "correlation_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bil_debit_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_debit_note_line" (
    "id" UUID NOT NULL,
    "debit_note_id" UUID NOT NULL,
    "line_seq" INTEGER NOT NULL,
    "charge_code" VARCHAR(30) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "fee_type" "BilFeeType" NOT NULL,
    "source_type" VARCHAR(30) NOT NULL,
    "source_ref_id" VARCHAR(50),
    "owner_id" UUID NOT NULL,
    "item_id" UUID,
    "cargo_form" "CargoForm",
    "billing_qty_mt" DECIMAL(18,3) NOT NULL,
    "unit_rate" DECIMAL(18,2) NOT NULL,
    "combined_multiplier" DECIMAL(6,3),
    "amount_vnd" DECIMAL(18,2) NOT NULL,
    "vat_included_flag" BOOLEAN NOT NULL DEFAULT false,
    "calculation_trace_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bil_debit_note_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_debit_note_history" (
    "id" UUID NOT NULL,
    "debit_note_id" UUID NOT NULL,
    "action_code" VARCHAR(30) NOT NULL,
    "from_status" "BilDebitNoteStatus",
    "to_status" "BilDebitNoteStatus",
    "action_by" UUID NOT NULL,
    "action_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason_code" VARCHAR(50),
    "remarks" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,

    CONSTRAINT "bil_debit_note_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_exception" (
    "id" UUID NOT NULL,
    "exception_type" "BilExceptionType" NOT NULL,
    "severity" "BilExceptionSeverity" NOT NULL,
    "status" "BilExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "owner_id" UUID,
    "source_module" VARCHAR(10),
    "source_ref_type" VARCHAR(30),
    "source_ref_id" VARCHAR(50),
    "billing_event_id" UUID,
    "snapshot_run_id" UUID,
    "debit_note_id" UUID,
    "message" TEXT NOT NULL,
    "detail_json" JSONB,
    "assigned_to" UUID,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution_code" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bil_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_erp_push_outbox" (
    "id" UUID NOT NULL,
    "debit_note_id" UUID NOT NULL,
    "outbox_type" VARCHAR(30) NOT NULL DEFAULT 'ERP_PUSH',
    "payload_json" JSONB NOT NULL,
    "status" "BilOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "last_error_code" VARCHAR(50),
    "last_error_message" TEXT,
    "external_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bil_erp_push_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bil_erp_push_log" (
    "id" UUID NOT NULL,
    "debit_note_id" UUID NOT NULL,
    "outbox_id" UUID NOT NULL,
    "request_payload_json" JSONB NOT NULL,
    "response_payload_json" JSONB,
    "http_status" INTEGER,
    "result_status" VARCHAR(20) NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "pushed_at" TIMESTAMP(3) NOT NULL,
    "correlation_id" UUID,

    CONSTRAINT "bil_erp_push_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_report_catalog" (
    "id" UUID NOT NULL,
    "report_id" VARCHAR(50) NOT NULL,
    "report_name" VARCHAR(150) NOT NULL,
    "report_group" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "source_module" VARCHAR(20) NOT NULL,
    "allow_export" BOOLEAN NOT NULL DEFAULT true,
    "max_export_rows" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpt_report_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_reconciliation_check" (
    "id" UUID NOT NULL,
    "check_id" VARCHAR(30) NOT NULL,
    "check_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "source_module" VARCHAR(20) NOT NULL,
    "compare_with" VARCHAR(100) NOT NULL,
    "check_query" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpt_reconciliation_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_export_job" (
    "id" UUID NOT NULL,
    "export_job_id" VARCHAR(36) NOT NULL,
    "report_catalog_id" UUID,
    "report_id" VARCHAR(50) NOT NULL,
    "export_format" "RptExportFormat" NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_role" VARCHAR(30) NOT NULL,
    "owner_scope_id" UUID,
    "warehouse_scope_json" JSONB,
    "filter_payload" JSONB NOT NULL,
    "job_status" "RptExportJobStatus" NOT NULL,
    "row_count" INTEGER,
    "file_uri" TEXT,
    "file_size_bytes" BIGINT,
    "checksum_sha256" VARCHAR(64),
    "expires_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "idempotency_key" VARCHAR(100),
    "correlation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpt_export_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_export_job_event" (
    "id" UUID NOT NULL,
    "export_job_id" UUID NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "event_payload" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpt_export_job_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_reconciliation_run" (
    "id" UUID NOT NULL,
    "run_id" VARCHAR(36) NOT NULL,
    "trigger_type" "RptReconciliationTriggerType" NOT NULL,
    "requested_by" UUID,
    "check_ids" JSONB NOT NULL,
    "run_scope" JSONB NOT NULL,
    "run_status" "RptReconciliationRunStatus" NOT NULL,
    "accepted_checks_count" INTEGER NOT NULL DEFAULT 0,
    "completed_checks_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "idempotency_key" VARCHAR(100),
    "correlation_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpt_reconciliation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_reconciliation_result" (
    "id" UUID NOT NULL,
    "result_id" VARCHAR(36) NOT NULL,
    "run_id" UUID NOT NULL,
    "check_id" UUID NOT NULL,
    "check_code" VARCHAR(30) NOT NULL,
    "check_name" VARCHAR(100) NOT NULL,
    "result_status" "RptReconciliationResultStatus" NOT NULL,
    "severity" "RptReconciliationSeverity" NOT NULL,
    "dimension_key" JSONB,
    "source_module" VARCHAR(20) NOT NULL,
    "source_ref_type" VARCHAR(30),
    "source_ref_id" VARCHAR(50),
    "expected_value" DECIMAL(20,3),
    "actual_value" DECIMAL(20,3),
    "variance_value" DECIMAL(20,3),
    "mismatch_detail" JSONB,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "resolution_note" TEXT,
    "evidence_ref" TEXT,
    "supersedes_result_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpt_reconciliation_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_reconciliation_resolution" (
    "id" UUID NOT NULL,
    "reconciliation_result_id" UUID NOT NULL,
    "action_type" "RptReconciliationResolutionAction" NOT NULL,
    "resolution_note" TEXT NOT NULL,
    "evidence_ref" TEXT,
    "source_module" VARCHAR(20),
    "source_ref_id" VARCHAR(50),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpt_reconciliation_resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_go_live_gate" (
    "id" UUID NOT NULL,
    "gate_id" VARCHAR(20) NOT NULL,
    "gate_name" VARCHAR(150) NOT NULL,
    "gate_type" "RptGoLiveGateType" NOT NULL,
    "owner_role" VARCHAR(30) NOT NULL,
    "reviewer_role" VARCHAR(30) NOT NULL,
    "milestone" "RptGoLiveMilestone" NOT NULL,
    "waiver_allowed" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "check_config" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpt_go_live_gate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_go_live_gate_status" (
    "id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "snapshot_no" VARCHAR(30) NOT NULL,
    "status" "RptGoLiveGateStatus" NOT NULL,
    "last_check_type" "RptGoLiveGateType" NOT NULL,
    "last_run_ref" VARCHAR(36),
    "effective_at" TIMESTAMP(3) NOT NULL,
    "effective_by" UUID,
    "evidence_ref" TEXT,
    "note" TEXT,
    "waiver_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpt_go_live_gate_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_go_live_signoff_history" (
    "id" UUID NOT NULL,
    "gate_status_id" UUID NOT NULL,
    "gate_code" VARCHAR(20) NOT NULL,
    "action_status" "RptGoLiveGateStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "evidence_ref" TEXT,
    "waiver_reason" TEXT,
    "signed_by" UUID NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpt_go_live_signoff_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_report_run_log" (
    "id" UUID NOT NULL,
    "report_catalog_id" UUID,
    "report_id" VARCHAR(50) NOT NULL,
    "run_mode" "RptReportRunMode" NOT NULL,
    "requested_by" UUID NOT NULL,
    "filter_payload" JSONB NOT NULL,
    "duration_ms" INTEGER,
    "row_count" INTEGER,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "status" "RptReportRunStatus" NOT NULL,
    "error_code" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpt_report_run_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rpt_dashboard_cache" (
    "id" UUID NOT NULL,
    "widget_code" VARCHAR(50) NOT NULL,
    "cache_key" VARCHAR(150) NOT NULL,
    "cache_payload" JSONB NOT NULL,
    "source_fresh_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rpt_dashboard_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_local_credential" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_algo" VARCHAR(30) NOT NULL DEFAULT 'ARGON2ID',
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "password_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_local_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_password_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" UUID,
    "change_reason" VARCHAR(30) NOT NULL,

    CONSTRAINT "auth_password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" UUID NOT NULL,
    "session_code" VARCHAR(40) NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "AuthChannel" NOT NULL,
    "device_id" VARCHAR(120),
    "device_name" VARCHAR(255),
    "user_agent" TEXT,
    "ip_address" VARCHAR(64),
    "login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" UUID,
    "revoke_reason" VARCHAR(50),
    "auth_version_at_issue" BIGINT NOT NULL,
    "selected_warehouse_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_refresh_token" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "token_family" VARCHAR(80) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "rotated_from_id" UUID,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_login_attempt" (
    "id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "user_id" UUID,
    "attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "channel" "AuthChannel" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failure_reason" VARCHAR(50),
    "correlation_id" VARCHAR(80),

    CONSTRAINT "auth_login_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_security_event" (
    "id" UUID NOT NULL,
    "event_type" "AuthSecurityEventType" NOT NULL,
    "severity" "AuthSecurityEventSeverity" NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "channel" "AuthChannel",
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "correlation_id" VARCHAR(80),
    "resource_type" VARCHAR(50),
    "resource_id" VARCHAR(100),
    "action" VARCHAR(50),
    "error_code" VARCHAR(50),
    "event_payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_security_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_account_lock" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3) NOT NULL,
    "lock_reason" VARCHAR(50) NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(3),
    "unlocked_by" UUID,
    "unlock_reason" VARCHAR(50),
    "correlation_id" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_account_lock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dropdown_configs" (
    "id" UUID NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "value" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dropdown_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_user_code_key" ON "app_user"("user_code");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_username_key" ON "app_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "app_user_is_active_user_type_idx" ON "app_user"("is_active", "user_type");

-- CreateIndex
CREATE UNIQUE INDEX "role_role_code_key" ON "role"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_permission_code_key" ON "permission"("permission_code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_module_code_resource_code_action_code_key" ON "permission"("module_code", "resource_code", "action_code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_id_permission_id_key" ON "role_permission"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_role_user_id_is_active_idx" ON "user_role"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_role_role_id_is_active_idx" ON "user_role"("role_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "reason_code_code_key" ON "reason_code"("code");

-- CreateIndex
CREATE INDEX "reason_code_domain_code_category_is_active_idx" ON "reason_code"("domain_code", "category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "number_sequence_sequence_code_key" ON "number_sequence"("sequence_code");

-- CreateIndex
CREATE UNIQUE INDEX "number_sequence_counter_sequence_id_scope_key_counter_date_key" ON "number_sequence_counter"("sequence_id", "scope_key", "counter_date");

-- CreateIndex
CREATE UNIQUE INDEX "business_rule_catalog_rule_code_key" ON "business_rule_catalog"("rule_code");

-- CreateIndex
CREATE INDEX "business_rule_catalog_domain_current_status_idx" ON "business_rule_catalog"("domain", "current_status");

-- CreateIndex
CREATE UNIQUE INDEX "decision_log_decision_no_key" ON "decision_log"("decision_no");

-- CreateIndex
CREATE UNIQUE INDEX "change_control_record_change_no_key" ON "change_control_record"("change_no");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_occurred_at_idx" ON "audit_log"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_user_id_occurred_at_idx" ON "audit_log"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_log"("correlation_id");

-- CreateIndex
CREATE INDEX "audit_log_source_module_occurred_at_idx" ON "audit_log"("source_module", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "exception_log_exception_no_key" ON "exception_log"("exception_no");

-- CreateIndex
CREATE INDEX "exception_log_source_module_occurred_at_idx" ON "exception_log"("source_module", "occurred_at");

-- CreateIndex
CREATE INDEX "exception_log_is_resolved_occurred_at_idx" ON "exception_log"("is_resolved", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_record_idempotency_key_key" ON "idempotency_record"("idempotency_key");

-- CreateIndex
CREATE INDEX "idempotency_record_command_name_source_module_idx" ON "idempotency_record"("command_name", "source_module");

-- CreateIndex
CREATE INDEX "idempotency_record_expired_at_idx" ON "idempotency_record"("expired_at");

-- CreateIndex
CREATE UNIQUE INDEX "md_uom_uom_code_key" ON "md_uom"("uom_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_inventory_status_status_code_key" ON "md_inventory_status"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_warehouse_warehouse_code_key" ON "md_warehouse"("warehouse_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_zone_warehouse_id_zone_code_key" ON "md_zone"("warehouse_id", "zone_code");

-- CreateIndex
CREATE INDEX "md_location_zone_id_is_active_idx" ON "md_location"("zone_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_location_warehouse_id_location_code_key" ON "md_location"("warehouse_id", "location_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_owner_owner_code_key" ON "md_owner"("owner_code");

-- CreateIndex
CREATE INDEX "md_owner_owner_group_is_active_idx" ON "md_owner"("owner_group", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_vendor_vendor_code_key" ON "md_vendor"("vendor_code");

-- CreateIndex
CREATE INDEX "md_vendor_supplier_group_is_active_idx" ON "md_vendor"("supplier_group", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_customer_customer_code_key" ON "md_customer"("customer_code");

-- CreateIndex
CREATE INDEX "md_customer_customer_group_is_active_idx" ON "md_customer"("customer_group", "is_active");

-- CreateIndex
CREATE INDEX "md_customer_customer_type_is_active_idx" ON "md_customer"("customer_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_item_item_code_key" ON "md_item"("item_code");

-- CreateIndex
CREATE INDEX "md_item_cargo_form_is_active_idx" ON "md_item"("cargo_form", "is_active");

-- CreateIndex
CREATE INDEX "md_item_product_group_is_active_idx" ON "md_item"("product_group", "is_active");

-- CreateIndex
CREATE INDEX "md_item_is_packaging_is_active_idx" ON "md_item"("is_packaging", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_vehicle_type_vehicle_type_code_key" ON "md_vehicle_type"("vehicle_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_uom_conversion_from_uom_id_to_uom_id_item_id_key" ON "md_uom_conversion"("from_uom_id", "to_uom_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "md_service_code_service_code_key" ON "md_service_code"("service_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_day_type_day_type_code_key" ON "md_day_type"("day_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_rate_reference_rate_reference_code_key" ON "md_rate_reference"("rate_reference_code");

-- CreateIndex
CREATE INDEX "md_rate_reference_owner_id_service_code_id_is_active_idx" ON "md_rate_reference"("owner_id", "service_code_id", "is_active");

-- CreateIndex
CREATE INDEX "md_rate_reference_effective_from_effective_to_idx" ON "md_rate_reference"("effective_from", "effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "md_owner_item_policy_owner_id_item_id_key" ON "md_owner_item_policy"("owner_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "md_import_batch_batch_no_key" ON "md_import_batch"("batch_no");

-- CreateIndex
CREATE INDEX "md_import_batch_entity_name_status_idx" ON "md_import_batch"("entity_name", "status");

-- CreateIndex
CREATE INDEX "md_import_batch_requested_by_created_at_idx" ON "md_import_batch"("requested_by", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "md_import_batch_line_batch_id_row_no_key" ON "md_import_batch_line"("batch_id", "row_no");

-- CreateIndex
CREATE INDEX "md_import_error_batch_id_row_no_idx" ON "md_import_error"("batch_id", "row_no");

-- CreateIndex
CREATE UNIQUE INDEX "invent_dim_dim_id_key" ON "invent_dim"("dim_id");

-- CreateIndex
CREATE UNIQUE INDEX "invent_dim_dim_hash_key" ON "invent_dim"("dim_hash");

-- CreateIndex
CREATE INDEX "invent_dim_warehouse_id_location_id_owner_id_inventory_stat_idx" ON "invent_dim"("warehouse_id", "location_id", "owner_id", "inventory_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "invent_trans_trans_id_key" ON "invent_trans"("trans_id");

-- CreateIndex
CREATE INDEX "invent_trans_ref_type_ref_id_ref_line_id_idx" ON "invent_trans"("ref_type", "ref_id", "ref_line_id");

-- CreateIndex
CREATE INDEX "invent_trans_item_id_posted_at_idx" ON "invent_trans"("item_id", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "invent_trans_owner_id_posted_at_idx" ON "invent_trans"("owner_id", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "invent_trans_dim_to_id_posted_at_idx" ON "invent_trans"("dim_to_id", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "invent_trans_dim_from_id_posted_at_idx" ON "invent_trans"("dim_from_id", "posted_at" DESC);

-- CreateIndex
CREATE INDEX "invent_trans_correlation_id_idx" ON "invent_trans"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "invent_trans_external_id_trans_type_key" ON "invent_trans"("external_id", "trans_type");

-- CreateIndex
CREATE UNIQUE INDEX "on_hand_item_id_invent_dim_id_key" ON "on_hand"("item_id", "invent_dim_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_hold_hold_no_key" ON "inventory_hold"("hold_no");

-- CreateIndex
CREATE INDEX "inventory_hold_shipment_id_shipment_line_id_idx" ON "inventory_hold"("shipment_id", "shipment_line_id");

-- CreateIndex
CREATE INDEX "inventory_hold_item_id_invent_dim_id_status_idx" ON "inventory_hold"("item_id", "invent_dim_id", "status");

-- CreateIndex
CREATE INDEX "inventory_hold_external_id_idx" ON "inventory_hold"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reversal_link_original_trans_id_reversal_trans_id_key" ON "inventory_reversal_link"("original_trans_id", "reversal_trans_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reconciliation_run_run_no_key" ON "inventory_reconciliation_run"("run_no");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_run_status_started_at_idx" ON "inventory_reconciliation_run"("status", "started_at");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_result_run_id_idx" ON "inventory_reconciliation_result"("run_id");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_result_item_id_invent_dim_id_idx" ON "inventory_reconciliation_result"("item_id", "invent_dim_id");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_result_severity_result_status_idx" ON "inventory_reconciliation_result"("severity", "result_status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_snapshot_run_run_no_key" ON "inventory_snapshot_run"("run_no");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_snapshot_run_snapshot_date_warehouse_id_version_n_key" ON "inventory_snapshot_run"("snapshot_date", "warehouse_id", "version_no");

-- CreateIndex
CREATE INDEX "daily_storage_snapshot_snapshot_date_warehouse_id_owner_id_idx" ON "daily_storage_snapshot"("snapshot_date", "warehouse_id", "owner_id");

-- CreateIndex
CREATE INDEX "daily_storage_snapshot_owner_id_item_id_snapshot_date_idx" ON "daily_storage_snapshot"("owner_id", "item_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_event_mapping_event_code_key" ON "inventory_event_mapping"("event_code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_status_created_at_idx" ON "purchase_orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "purchase_orders_owner_id_vendor_id_status_idx" ON "purchase_orders"("owner_id", "vendor_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_po_id_line_number_key" ON "purchase_order_lines"("po_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_header_receipt_number_key" ON "receipt_header"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_header_external_id_key" ON "receipt_header"("external_id");

-- CreateIndex
CREATE INDEX "receipt_header_vehicle_number_status_created_at_idx" ON "receipt_header"("vehicle_number", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_header_bl_number_status_created_at_idx" ON "receipt_header"("bl_number", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_header_owner_id_warehouse_id_status_created_at_idx" ON "receipt_header"("owner_id", "warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_header_po_id_asn_id_idx" ON "receipt_header"("po_id", "asn_id");

-- CreateIndex
CREATE INDEX "receipt_header_status_created_at_idx" ON "receipt_header"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_header_correlation_id_idx" ON "receipt_header"("correlation_id");

-- CreateIndex
CREATE INDEX "receipt_line_item_id_cargo_form_idx" ON "receipt_line"("item_id", "cargo_form");

-- CreateIndex
CREATE INDEX "receipt_line_receipt_header_id_status_idx" ON "receipt_line"("receipt_header_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_line_receipt_header_id_line_number_key" ON "receipt_line"("receipt_header_id", "line_number");

-- CreateIndex
CREATE INDEX "receipt_weighing_log_receipt_header_id_attempt_number_weigh_idx" ON "receipt_weighing_log"("receipt_header_id", "attempt_number", "weigh_phase");

-- CreateIndex
CREATE INDEX "receipt_weighing_log_ticket_id_weigh_phase_idx" ON "receipt_weighing_log"("ticket_id", "weigh_phase");

-- CreateIndex
CREATE INDEX "receipt_weighing_log_event_timestamp_idx" ON "receipt_weighing_log"("event_timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "receipt_weighing_log_event_id_key" ON "receipt_weighing_log"("event_id");

-- CreateIndex
CREATE INDEX "receipt_status_history_receipt_header_id_occurred_at_idx" ON "receipt_status_history"("receipt_header_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_status_history_to_status_occurred_at_idx" ON "receipt_status_history"("to_status", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_exception_log_receipt_header_id_occurred_at_idx" ON "receipt_exception_log"("receipt_header_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_exception_log_exception_type_severity_occurred_at_idx" ON "receipt_exception_log"("exception_type", "severity", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "receipt_exception_log_integration_target_is_resolved_idx" ON "receipt_exception_log"("integration_target", "is_resolved");

-- CreateIndex
CREATE INDEX "receipt_integration_state_delivery_status_next_retry_at_idx" ON "receipt_integration_state"("delivery_status", "next_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_integration_state_receipt_header_id_target_module_a_key" ON "receipt_integration_state"("receipt_header_id", "target_module", "action_code");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_header_shipment_number_key" ON "shipment_header"("shipment_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_header_external_id_key" ON "shipment_header"("external_id");

-- CreateIndex
CREATE INDEX "shipment_header_vehicle_number_status_created_at_idx" ON "shipment_header"("vehicle_number", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_header_so_id_status_created_at_idx" ON "shipment_header"("so_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_header_owner_id_warehouse_id_status_created_at_idx" ON "shipment_header"("owner_id", "warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_header_status_created_at_idx" ON "shipment_header"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_header_correlation_id_idx" ON "shipment_header"("correlation_id");

-- CreateIndex
CREATE INDEX "shipment_line_item_id_cargo_form_idx" ON "shipment_line"("item_id", "cargo_form");

-- CreateIndex
CREATE INDEX "shipment_line_shipment_header_id_line_status_idx" ON "shipment_line"("shipment_header_id", "line_status");

-- CreateIndex
CREATE INDEX "shipment_line_so_line_id_idx" ON "shipment_line"("so_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_line_shipment_header_id_line_number_key" ON "shipment_line"("shipment_header_id", "line_number");

-- CreateIndex
CREATE INDEX "shipment_allocation_record_shipment_line_id_status_idx" ON "shipment_allocation_record"("shipment_line_id", "status");

-- CreateIndex
CREATE INDEX "shipment_allocation_record_shipment_header_id_status_idx" ON "shipment_allocation_record"("shipment_header_id", "status");

-- CreateIndex
CREATE INDEX "shipment_allocation_record_invent_dim_id_status_idx" ON "shipment_allocation_record"("invent_dim_id", "status");

-- CreateIndex
CREATE INDEX "shipment_allocation_record_item_id_owner_id_lot_date_status_idx" ON "shipment_allocation_record"("item_id", "owner_id", "lot_date", "status");

-- CreateIndex
CREATE INDEX "shipment_allocation_record_hold_ref_idx" ON "shipment_allocation_record"("hold_ref");

-- CreateIndex
CREATE INDEX "shipment_weighing_attempt_shipment_header_id_captured_at_idx" ON "shipment_weighing_attempt"("shipment_header_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_weighing_attempt_shipment_line_id_captured_at_idx" ON "shipment_weighing_attempt"("shipment_line_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_weighing_attempt_scale_ticket_no_idx" ON "shipment_weighing_attempt"("scale_ticket_no");

-- CreateIndex
CREATE INDEX "shipment_weighing_attempt_external_event_id_idx" ON "shipment_weighing_attempt"("external_event_id");

-- CreateIndex
CREATE INDEX "shipment_status_history_shipment_header_id_changed_at_idx" ON "shipment_status_history"("shipment_header_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_status_history_shipment_line_id_changed_at_idx" ON "shipment_status_history"("shipment_line_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_status_history_to_status_changed_at_idx" ON "shipment_status_history"("to_status", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_exception_log_shipment_header_id_status_created_at_idx" ON "shipment_exception_log"("shipment_header_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_exception_log_exception_type_status_created_at_idx" ON "shipment_exception_log"("exception_type", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_approval_decision_shipment_header_id_decided_at_idx" ON "shipment_approval_decision"("shipment_header_id", "decided_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_approval_decision_shipment_line_id_decided_at_idx" ON "shipment_approval_decision"("shipment_line_id", "decided_at" DESC);

-- CreateIndex
CREATE INDEX "shipment_pick_work_link_shipment_header_id_status_idx" ON "shipment_pick_work_link"("shipment_header_id", "status");

-- CreateIndex
CREATE INDEX "shipment_pick_work_link_shipment_line_id_work_type_status_idx" ON "shipment_pick_work_link"("shipment_line_id", "work_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_pick_work_link_external_id_key" ON "shipment_pick_work_link"("external_id");

-- CreateIndex
CREATE INDEX "shipment_posting_link_shipment_header_id_status_idx" ON "shipment_posting_link"("shipment_header_id", "status");

-- CreateIndex
CREATE INDEX "shipment_posting_link_shipment_line_id_posting_action_statu_idx" ON "shipment_posting_link"("shipment_line_id", "posting_action", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_posting_link_m3_external_id_key" ON "shipment_posting_link"("m3_external_id");

-- CreateIndex
CREATE INDEX "shipment_so_link_so_id_so_line_id_idx" ON "shipment_so_link"("so_id", "so_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_so_link_shipment_header_id_so_id_so_line_id_key" ON "shipment_so_link"("shipment_header_id", "so_id", "so_line_id");

-- CreateIndex
CREATE UNIQUE INDEX "ic_move_order_move_number_key" ON "ic_move_order"("move_number");

-- CreateIndex
CREATE UNIQUE INDEX "ic_move_order_external_id_key" ON "ic_move_order"("external_id");

-- CreateIndex
CREATE INDEX "ic_move_order_warehouse_id_status_created_at_idx" ON "ic_move_order"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_move_order_correlation_id_idx" ON "ic_move_order"("correlation_id");

-- CreateIndex
CREATE INDEX "ic_move_order_line_item_id_owner_id_from_location_id_idx" ON "ic_move_order_line"("item_id", "owner_id", "from_location_id");

-- CreateIndex
CREATE INDEX "ic_move_order_line_to_location_id_idx" ON "ic_move_order_line"("to_location_id");

-- CreateIndex
CREATE INDEX "ic_move_order_line_line_status_idx" ON "ic_move_order_line"("line_status");

-- CreateIndex
CREATE UNIQUE INDEX "ic_move_order_line_move_order_id_line_no_key" ON "ic_move_order_line"("move_order_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "ic_transfer_order_transfer_number_key" ON "ic_transfer_order"("transfer_number");

-- CreateIndex
CREATE UNIQUE INDEX "ic_transfer_order_external_id_key" ON "ic_transfer_order"("external_id");

-- CreateIndex
CREATE INDEX "ic_transfer_order_from_warehouse_id_status_created_at_idx" ON "ic_transfer_order"("from_warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_transfer_order_to_warehouse_id_status_requested_ship_dat_idx" ON "ic_transfer_order"("to_warehouse_id", "status", "requested_ship_date");

-- CreateIndex
CREATE INDEX "ic_transfer_order_actual_ship_at_idx" ON "ic_transfer_order"("actual_ship_at");

-- CreateIndex
CREATE INDEX "ic_transfer_order_actual_receive_at_idx" ON "ic_transfer_order"("actual_receive_at");

-- CreateIndex
CREATE INDEX "ic_transfer_order_line_item_id_owner_id_line_status_idx" ON "ic_transfer_order_line"("item_id", "owner_id", "line_status");

-- CreateIndex
CREATE INDEX "ic_transfer_order_line_issue_flag_idx" ON "ic_transfer_order_line"("issue_flag");

-- CreateIndex
CREATE UNIQUE INDEX "ic_transfer_order_line_transfer_order_id_line_no_key" ON "ic_transfer_order_line"("transfer_order_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "ic_inventory_status_change_status_change_number_key" ON "ic_inventory_status_change"("status_change_number");

-- CreateIndex
CREATE UNIQUE INDEX "ic_inventory_status_change_external_id_key" ON "ic_inventory_status_change"("external_id");

-- CreateIndex
CREATE INDEX "ic_inventory_status_change_warehouse_id_status_created_at_idx" ON "ic_inventory_status_change"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_inventory_status_change_item_id_owner_id_location_id_idx" ON "ic_inventory_status_change"("item_id", "owner_id", "location_id");

-- CreateIndex
CREATE INDEX "ic_inventory_status_change_correlation_id_idx" ON "ic_inventory_status_change"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ic_cycle_count_plan_plan_code_key" ON "ic_cycle_count_plan"("plan_code");

-- CreateIndex
CREATE INDEX "ic_cycle_count_plan_warehouse_id_is_active_idx" ON "ic_cycle_count_plan"("warehouse_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ic_cycle_count_header_count_number_key" ON "ic_cycle_count_header"("count_number");

-- CreateIndex
CREATE UNIQUE INDEX "ic_cycle_count_header_external_id_key" ON "ic_cycle_count_header"("external_id");

-- CreateIndex
CREATE INDEX "ic_cycle_count_header_warehouse_id_status_created_at_idx" ON "ic_cycle_count_header"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_cycle_count_header_cycle_count_plan_id_idx" ON "ic_cycle_count_header"("cycle_count_plan_id");

-- CreateIndex
CREATE INDEX "ic_cycle_count_line_warehouse_id_location_id_line_status_idx" ON "ic_cycle_count_line"("warehouse_id", "location_id", "line_status");

-- CreateIndex
CREATE INDEX "ic_cycle_count_line_item_id_owner_id_idx" ON "ic_cycle_count_line"("item_id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "ic_cycle_count_line_cycle_count_header_id_line_no_key" ON "ic_cycle_count_line"("cycle_count_header_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "ic_adjustment_header_adjustment_number_key" ON "ic_adjustment_header"("adjustment_number");

-- CreateIndex
CREATE UNIQUE INDEX "ic_adjustment_header_external_id_key" ON "ic_adjustment_header"("external_id");

-- CreateIndex
CREATE INDEX "ic_adjustment_header_warehouse_id_status_created_at_idx" ON "ic_adjustment_header"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_adjustment_header_source_type_status_idx" ON "ic_adjustment_header"("source_type", "status");

-- CreateIndex
CREATE INDEX "ic_adjustment_header_correlation_id_idx" ON "ic_adjustment_header"("correlation_id");

-- CreateIndex
CREATE INDEX "ic_adjustment_line_item_id_owner_id_location_id_created_at_idx" ON "ic_adjustment_line"("item_id", "owner_id", "location_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_adjustment_line_line_status_idx" ON "ic_adjustment_line"("line_status");

-- CreateIndex
CREATE UNIQUE INDEX "ic_adjustment_line_adjustment_header_id_line_no_key" ON "ic_adjustment_line"("adjustment_header_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "ic_reconciliation_review_reconciliation_review_number_key" ON "ic_reconciliation_review"("reconciliation_review_number");

-- CreateIndex
CREATE UNIQUE INDEX "ic_reconciliation_review_external_id_key" ON "ic_reconciliation_review"("external_id");

-- CreateIndex
CREATE INDEX "ic_reconciliation_review_warehouse_id_status_created_at_idx" ON "ic_reconciliation_review"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_reconciliation_review_severity_status_idx" ON "ic_reconciliation_review"("severity", "status");

-- CreateIndex
CREATE INDEX "ic_reconciliation_review_assigned_to_status_idx" ON "ic_reconciliation_review"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "ic_document_status_history_entity_type_entity_id_changed_at_idx" ON "ic_document_status_history"("entity_type", "entity_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "ic_document_status_history_changed_at_idx" ON "ic_document_status_history"("changed_at" DESC);

-- CreateIndex
CREATE INDEX "ic_exception_log_entity_type_entity_id_created_at_idx" ON "ic_exception_log"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ic_exception_log_exception_type_status_created_at_idx" ON "ic_exception_log"("exception_type", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "we_work_header_work_id_key" ON "we_work_header"("work_id");

-- CreateIndex
CREATE UNIQUE INDEX "we_work_header_external_id_key" ON "we_work_header"("external_id");

-- CreateIndex
CREATE INDEX "we_work_header_status_warehouse_id_work_type_priority_no_cr_idx" ON "we_work_header"("status", "warehouse_id", "work_type", "priority_no", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_work_header_assigned_to_status_warehouse_id_idx" ON "we_work_header"("assigned_to", "status", "warehouse_id");

-- CreateIndex
CREATE INDEX "we_work_header_source_module_source_ref_id_work_type_idx" ON "we_work_header"("source_module", "source_ref_id", "work_type");

-- CreateIndex
CREATE UNIQUE INDEX "we_work_header_source_module_source_type_source_ref_id_sour_key" ON "we_work_header"("source_module", "source_type", "source_ref_id", "source_ref_line_id", "work_type");

-- CreateIndex
CREATE UNIQUE INDEX "we_work_line_external_id_key" ON "we_work_line"("external_id");

-- CreateIndex
CREATE INDEX "we_work_line_work_header_id_status_line_num_idx" ON "we_work_line"("work_header_id", "status", "line_num");

-- CreateIndex
CREATE INDEX "we_work_line_scanned_location_id_idx" ON "we_work_line"("scanned_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "we_work_line_work_header_id_line_num_key" ON "we_work_line"("work_header_id", "line_num");

-- CreateIndex
CREATE INDEX "we_work_assignment_history_work_header_id_created_at_idx" ON "we_work_assignment_history"("work_header_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_work_status_history_object_type_object_id_created_at_idx" ON "we_work_status_history"("object_type", "object_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "we_work_posting_link_work_line_id_key" ON "we_work_posting_link"("work_line_id");

-- CreateIndex
CREATE INDEX "we_work_event_log_work_header_id_created_at_idx" ON "we_work_event_log"("work_header_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_work_event_log_work_line_id_created_at_idx" ON "we_work_event_log"("work_line_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_work_event_log_event_type_created_at_idx" ON "we_work_event_log"("event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_work_exception_status_exception_type_created_at_idx" ON "we_work_exception"("status", "exception_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_work_exception_work_header_id_status_idx" ON "we_work_exception"("work_header_id", "status");

-- CreateIndex
CREATE INDEX "we_work_exception_work_line_id_status_idx" ON "we_work_exception"("work_line_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "we_mobile_sync_batch_batch_no_key" ON "we_mobile_sync_batch"("batch_no");

-- CreateIndex
CREATE INDEX "we_mobile_sync_batch_user_id_created_at_idx" ON "we_mobile_sync_batch"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "we_mobile_sync_batch_sync_status_created_at_idx" ON "we_mobile_sync_batch"("sync_status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "we_mobile_sync_event_external_id_key" ON "we_mobile_sync_event"("external_id");

-- CreateIndex
CREATE INDEX "we_mobile_sync_event_sync_batch_id_device_sequence_no_idx" ON "we_mobile_sync_event"("sync_batch_id", "device_sequence_no");

-- CreateIndex
CREATE INDEX "we_mobile_sync_event_work_id_event_type_idx" ON "we_mobile_sync_event"("work_id", "event_type");

-- CreateIndex
CREATE INDEX "we_work_outbox_event_delivery_status_next_retry_at_idx" ON "we_work_outbox_event"("delivery_status", "next_retry_at");

-- CreateIndex
CREATE INDEX "we_work_outbox_event_aggregate_id_event_type_idx" ON "we_work_outbox_event"("aggregate_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "m8_weighbridge_device_device_code_key" ON "m8_weighbridge_device"("device_code");

-- CreateIndex
CREATE INDEX "m8_weighbridge_device_warehouse_id_is_active_idx" ON "m8_weighbridge_device"("warehouse_id", "is_active");

-- CreateIndex
CREATE INDEX "m8_weighbridge_device_last_seen_at_idx" ON "m8_weighbridge_device"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "m8_weighbridge_log_weighbridge_event_id_key" ON "m8_weighbridge_log"("weighbridge_event_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_receipt_id_idx" ON "m8_weighbridge_log"("receipt_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_shipment_id_idx" ON "m8_weighbridge_log"("shipment_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_scale_device_id_created_at_idx" ON "m8_weighbridge_log"("scale_device_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_vehicle_number_created_at_idx" ON "m8_weighbridge_log"("vehicle_number", "created_at" DESC);

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_correlation_id_idx" ON "m8_weighbridge_log"("correlation_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_log_weighing_timestamp_idx" ON "m8_weighbridge_log"("weighing_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "m8_weighbridge_event_state_weighbridge_log_id_key" ON "m8_weighbridge_event_state"("weighbridge_log_id");

-- CreateIndex
CREATE INDEX "m8_weighbridge_event_state_processing_status_updated_at_idx" ON "m8_weighbridge_event_state"("processing_status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "m8_weighbridge_event_state_callback_status_idx" ON "m8_weighbridge_event_state"("callback_status");

-- CreateIndex
CREATE UNIQUE INDEX "m8_ocr_result_ocr_request_id_key" ON "m8_ocr_result"("ocr_request_id");

-- CreateIndex
CREATE INDEX "m8_ocr_result_status_created_at_idx" ON "m8_ocr_result"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "m8_ocr_result_bl_number_idx" ON "m8_ocr_result"("bl_number");

-- CreateIndex
CREATE INDEX "m8_ocr_result_linked_receipt_id_idx" ON "m8_ocr_result"("linked_receipt_id");

-- CreateIndex
CREATE INDEX "m8_ocr_result_correlation_id_idx" ON "m8_ocr_result"("correlation_id");

-- CreateIndex
CREATE INDEX "m8_ocr_result_warehouse_id_status_idx" ON "m8_ocr_result"("warehouse_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "m8_ocr_confirmed_snapshot_ocr_result_id_key" ON "m8_ocr_confirmed_snapshot"("ocr_result_id");

-- CreateIndex
CREATE UNIQUE INDEX "m8_mobile_sync_batch_batch_id_key" ON "m8_mobile_sync_batch"("batch_id");

-- CreateIndex
CREATE INDEX "m8_mobile_sync_batch_device_id_received_at_idx" ON "m8_mobile_sync_batch"("device_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "m8_mobile_sync_batch_keeper_user_id_received_at_idx" ON "m8_mobile_sync_batch"("keeper_user_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "m8_mobile_sync_batch_status_received_at_idx" ON "m8_mobile_sync_batch"("status", "received_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "m8_mobile_sync_event_event_external_id_key" ON "m8_mobile_sync_event"("event_external_id");

-- CreateIndex
CREATE INDEX "m8_mobile_sync_event_device_id_sequence_no_idx" ON "m8_mobile_sync_event"("device_id", "sequence_no");

-- CreateIndex
CREATE INDEX "m8_mobile_sync_event_work_id_idx" ON "m8_mobile_sync_event"("work_id");

-- CreateIndex
CREATE INDEX "m8_mobile_sync_event_work_line_id_idx" ON "m8_mobile_sync_event"("work_line_id");

-- CreateIndex
CREATE INDEX "m8_mobile_sync_event_process_status_created_at_idx" ON "m8_mobile_sync_event"("process_status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "m8_erp_push_log_push_job_id_key" ON "m8_erp_push_log"("push_job_id");

-- CreateIndex
CREATE INDEX "m8_erp_push_log_status_next_retry_at_idx" ON "m8_erp_push_log"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "m8_erp_push_log_reference_id_idx" ON "m8_erp_push_log"("reference_id");

-- CreateIndex
CREATE INDEX "m8_erp_push_log_correlation_id_idx" ON "m8_erp_push_log"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "m8_erp_push_log_push_type_reference_id_key" ON "m8_erp_push_log"("push_type", "reference_id");

-- CreateIndex
CREATE INDEX "m8_integration_alert_status_severity_last_seen_at_idx" ON "m8_integration_alert"("status", "severity", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "m8_integration_alert_alert_source_status_idx" ON "m8_integration_alert"("alert_source", "status");

-- CreateIndex
CREATE INDEX "m8_integration_alert_warehouse_id_status_idx" ON "m8_integration_alert"("warehouse_id", "status");

-- CreateIndex
CREATE INDEX "m8_integration_alert_source_ref_type_source_ref_id_idx" ON "m8_integration_alert"("source_ref_type", "source_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "m8_channel_health_snapshot_channel_name_key" ON "m8_channel_health_snapshot"("channel_name");

-- CreateIndex
CREATE INDEX "m8_device_heartbeat_device_code_received_at_idx" ON "m8_device_heartbeat"("device_code", "received_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vas_work_order_wo_number_key" ON "vas_work_order"("wo_number");

-- CreateIndex
CREATE UNIQUE INDEX "vas_work_order_external_id_key" ON "vas_work_order"("external_id");

-- CreateIndex
CREATE INDEX "vas_work_order_warehouse_id_status_created_at_idx" ON "vas_work_order"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vas_work_order_owner_id_status_created_at_idx" ON "vas_work_order"("owner_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vas_work_order_bulk_source_item_id_status_idx" ON "vas_work_order"("bulk_source_item_id", "status");

-- CreateIndex
CREATE INDEX "vas_work_order_bagged_output_item_id_status_idx" ON "vas_work_order"("bagged_output_item_id", "status");

-- CreateIndex
CREATE INDEX "vas_work_order_correlation_id_idx" ON "vas_work_order"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "vas_session_external_id_key" ON "vas_session"("external_id");

-- CreateIndex
CREATE INDEX "vas_session_wo_id_session_date_idx" ON "vas_session"("wo_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "vas_session_wo_id_session_num_key" ON "vas_session"("wo_id", "session_num");

-- CreateIndex
CREATE INDEX "vas_state_history_wo_id_created_at_idx" ON "vas_state_history"("wo_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vas_state_history_correlation_id_idx" ON "vas_state_history"("correlation_id");

-- CreateIndex
CREATE INDEX "vas_exception_log_wo_id_created_at_idx" ON "vas_exception_log"("wo_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vas_exception_log_exception_code_severity_idx" ON "vas_exception_log"("exception_code", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "vas_outbox_event_key_key" ON "vas_outbox"("event_key");

-- CreateIndex
CREATE INDEX "vas_outbox_status_next_retry_at_idx" ON "vas_outbox"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "vas_outbox_aggregate_id_event_type_idx" ON "vas_outbox"("aggregate_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "bil_contract_contract_number_key" ON "bil_contract"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "bil_contract_external_id_key" ON "bil_contract"("external_id");

-- CreateIndex
CREATE INDEX "bil_contract_owner_id_effective_from_effective_to_status_idx" ON "bil_contract"("owner_id", "effective_from", "effective_to", "status");

-- CreateIndex
CREATE INDEX "bil_contract_fee_line_contract_id_fee_type_is_active_idx" ON "bil_contract_fee_line"("contract_id", "fee_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bil_contract_fee_line_contract_id_fee_type_cargo_form_wareh_key" ON "bil_contract_fee_line"("contract_id", "fee_type", "cargo_form", "warehouse_id", "priority_rank");

-- CreateIndex
CREATE UNIQUE INDEX "bil_day_type_calendar_calendar_date_key" ON "bil_day_type_calendar"("calendar_date");

-- CreateIndex
CREATE UNIQUE INDEX "bil_event_external_id_key" ON "bil_event"("external_id");

-- CreateIndex
CREATE INDEX "bil_event_owner_id_event_date_billing_status_idx" ON "bil_event"("owner_id", "event_date", "billing_status");

-- CreateIndex
CREATE INDEX "bil_event_source_module_ref_id_idx" ON "bil_event"("source_module", "ref_id");

-- CreateIndex
CREATE INDEX "bil_event_event_type_captured_at_idx" ON "bil_event"("event_type", "captured_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bil_snapshot_run_external_id_key" ON "bil_snapshot_run"("external_id");

-- CreateIndex
CREATE INDEX "bil_snapshot_run_status_snapshot_date_idx" ON "bil_snapshot_run"("status", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "bil_snapshot_run_snapshot_date_warehouse_scope_key" ON "bil_snapshot_run"("snapshot_date", "warehouse_scope");

-- CreateIndex
CREATE INDEX "bil_storage_snapshot_owner_id_snapshot_date_idx" ON "bil_storage_snapshot"("owner_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "bil_storage_snapshot_snapshot_run_id_idx" ON "bil_storage_snapshot"("snapshot_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "bil_debit_note_dn_number_key" ON "bil_debit_note"("dn_number");

-- CreateIndex
CREATE UNIQUE INDEX "bil_debit_note_external_id_key" ON "bil_debit_note"("external_id");

-- CreateIndex
CREATE INDEX "bil_debit_note_owner_id_billing_period_start_billing_period_idx" ON "bil_debit_note"("owner_id", "billing_period_start", "billing_period_end");

-- CreateIndex
CREATE INDEX "bil_debit_note_status_locked_at_idx" ON "bil_debit_note"("status", "locked_at");

-- CreateIndex
CREATE INDEX "bil_debit_note_line_debit_note_id_idx" ON "bil_debit_note_line"("debit_note_id");

-- CreateIndex
CREATE UNIQUE INDEX "bil_debit_note_line_debit_note_id_line_seq_key" ON "bil_debit_note_line"("debit_note_id", "line_seq");

-- CreateIndex
CREATE INDEX "bil_debit_note_history_debit_note_id_action_at_idx" ON "bil_debit_note_history"("debit_note_id", "action_at" DESC);

-- CreateIndex
CREATE INDEX "bil_exception_status_exception_type_created_at_idx" ON "bil_exception"("status", "exception_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bil_exception_owner_id_status_idx" ON "bil_exception"("owner_id", "status");

-- CreateIndex
CREATE INDEX "bil_exception_debit_note_id_status_idx" ON "bil_exception"("debit_note_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bil_erp_push_outbox_external_id_key" ON "bil_erp_push_outbox"("external_id");

-- CreateIndex
CREATE INDEX "bil_erp_push_outbox_status_next_retry_at_idx" ON "bil_erp_push_outbox"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "bil_erp_push_outbox_debit_note_id_idx" ON "bil_erp_push_outbox"("debit_note_id");

-- CreateIndex
CREATE INDEX "bil_erp_push_log_debit_note_id_pushed_at_idx" ON "bil_erp_push_log"("debit_note_id", "pushed_at" DESC);

-- CreateIndex
CREATE INDEX "bil_erp_push_log_outbox_id_idx" ON "bil_erp_push_log"("outbox_id");

-- CreateIndex
CREATE UNIQUE INDEX "rpt_report_catalog_report_id_key" ON "rpt_report_catalog"("report_id");

-- CreateIndex
CREATE INDEX "rpt_report_catalog_report_group_is_active_idx" ON "rpt_report_catalog"("report_group", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rpt_reconciliation_check_check_id_key" ON "rpt_reconciliation_check"("check_id");

-- CreateIndex
CREATE INDEX "rpt_reconciliation_check_source_module_is_active_idx" ON "rpt_reconciliation_check"("source_module", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rpt_export_job_export_job_id_key" ON "rpt_export_job"("export_job_id");

-- CreateIndex
CREATE INDEX "rpt_export_job_requested_by_created_at_idx" ON "rpt_export_job"("requested_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_export_job_job_status_created_at_idx" ON "rpt_export_job"("job_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_export_job_report_id_created_at_idx" ON "rpt_export_job"("report_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_export_job_expires_at_idx" ON "rpt_export_job"("expires_at");

-- CreateIndex
CREATE INDEX "rpt_export_job_idempotency_key_idx" ON "rpt_export_job"("idempotency_key");

-- CreateIndex
CREATE INDEX "rpt_export_job_event_export_job_id_created_at_idx" ON "rpt_export_job_event"("export_job_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "rpt_reconciliation_run_run_id_key" ON "rpt_reconciliation_run"("run_id");

-- CreateIndex
CREATE INDEX "rpt_reconciliation_run_run_status_created_at_idx" ON "rpt_reconciliation_run"("run_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_reconciliation_run_requested_by_created_at_idx" ON "rpt_reconciliation_run"("requested_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_reconciliation_run_idempotency_key_idx" ON "rpt_reconciliation_run"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "rpt_reconciliation_result_result_id_key" ON "rpt_reconciliation_result"("result_id");

-- CreateIndex
CREATE INDEX "rpt_reconciliation_result_check_code_created_at_idx" ON "rpt_reconciliation_result"("check_code", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_reconciliation_result_result_status_severity_created_at_idx" ON "rpt_reconciliation_result"("result_status", "severity", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_reconciliation_result_is_resolved_severity_created_at_idx" ON "rpt_reconciliation_result"("is_resolved", "severity", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_reconciliation_result_source_module_source_ref_id_idx" ON "rpt_reconciliation_result"("source_module", "source_ref_id");

-- CreateIndex
CREATE INDEX "rpt_reconciliation_resolution_reconciliation_result_id_crea_idx" ON "rpt_reconciliation_resolution"("reconciliation_result_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "rpt_go_live_gate_gate_id_key" ON "rpt_go_live_gate"("gate_id");

-- CreateIndex
CREATE INDEX "rpt_go_live_gate_milestone_is_active_idx" ON "rpt_go_live_gate"("milestone", "is_active");

-- CreateIndex
CREATE INDEX "rpt_go_live_gate_status_snapshot_no_status_idx" ON "rpt_go_live_gate_status"("snapshot_no", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rpt_go_live_gate_status_gate_id_snapshot_no_key" ON "rpt_go_live_gate_status"("gate_id", "snapshot_no");

-- CreateIndex
CREATE INDEX "rpt_go_live_signoff_history_gate_status_id_signed_at_idx" ON "rpt_go_live_signoff_history"("gate_status_id", "signed_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_report_run_log_report_id_created_at_idx" ON "rpt_report_run_log"("report_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_report_run_log_requested_by_created_at_idx" ON "rpt_report_run_log"("requested_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_report_run_log_status_created_at_idx" ON "rpt_report_run_log"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "rpt_dashboard_cache_expires_at_idx" ON "rpt_dashboard_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "rpt_dashboard_cache_widget_code_cache_key_key" ON "rpt_dashboard_cache"("widget_code", "cache_key");

-- CreateIndex
CREATE UNIQUE INDEX "auth_local_credential_user_id_key" ON "auth_local_credential"("user_id");

-- CreateIndex
CREATE INDEX "auth_password_history_user_id_changed_at_idx" ON "auth_password_history"("user_id", "changed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_session_code_key" ON "auth_session"("session_code");

-- CreateIndex
CREATE INDEX "auth_session_user_id_is_current_idx" ON "auth_session"("user_id", "is_current");

-- CreateIndex
CREATE INDEX "auth_session_expires_at_idx" ON "auth_session"("expires_at");

-- CreateIndex
CREATE INDEX "auth_session_revoked_at_idx" ON "auth_session"("revoked_at");

-- CreateIndex
CREATE INDEX "auth_session_channel_is_current_idx" ON "auth_session"("channel", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_token_token_hash_key" ON "auth_refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_token_rotated_from_id_key" ON "auth_refresh_token"("rotated_from_id");

-- CreateIndex
CREATE INDEX "auth_refresh_token_session_id_is_revoked_idx" ON "auth_refresh_token"("session_id", "is_revoked");

-- CreateIndex
CREATE INDEX "auth_refresh_token_expires_at_idx" ON "auth_refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "auth_refresh_token_token_family_idx" ON "auth_refresh_token"("token_family");

-- CreateIndex
CREATE INDEX "auth_login_attempt_username_attempt_at_idx" ON "auth_login_attempt"("username", "attempt_at" DESC);

-- CreateIndex
CREATE INDEX "auth_login_attempt_user_id_attempt_at_idx" ON "auth_login_attempt"("user_id", "attempt_at" DESC);

-- CreateIndex
CREATE INDEX "auth_login_attempt_ip_address_attempt_at_idx" ON "auth_login_attempt"("ip_address", "attempt_at" DESC);

-- CreateIndex
CREATE INDEX "auth_security_event_event_type_occurred_at_idx" ON "auth_security_event"("event_type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "auth_security_event_user_id_occurred_at_idx" ON "auth_security_event"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "auth_security_event_severity_occurred_at_idx" ON "auth_security_event"("severity", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "auth_security_event_correlation_id_idx" ON "auth_security_event"("correlation_id");

-- CreateIndex
CREATE INDEX "auth_account_lock_user_id_locked_at_idx" ON "auth_account_lock"("user_id", "locked_at" DESC);

-- CreateIndex
CREATE INDEX "auth_account_lock_locked_until_idx" ON "auth_account_lock"("locked_until");

-- CreateIndex
CREATE INDEX "dropdown_configs_entity_field_name_is_active_idx" ON "dropdown_configs"("entity", "field_name", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "dropdown_configs_entity_field_name_value_key" ON "dropdown_configs"("entity", "field_name", "value");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_sequence_counter" ADD CONSTRAINT "number_sequence_counter_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "number_sequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_zone" ADD CONSTRAINT "md_zone_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_location" ADD CONSTRAINT "md_location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_location" ADD CONSTRAINT "md_location_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "md_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner" ADD CONSTRAINT "md_owner_default_warehouse_id_fkey" FOREIGN KEY ("default_warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_base_uom_id_fkey" FOREIGN KEY ("base_uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_billing_uom_id_fkey" FOREIGN KEY ("billing_uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_catch_weight_uom_id_fkey" FOREIGN KEY ("catch_weight_uom_id") REFERENCES "md_uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_default_zone_id_fkey" FOREIGN KEY ("default_zone_id") REFERENCES "md_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_item" ADD CONSTRAINT "md_item_packaging_material_item_id_fkey" FOREIGN KEY ("packaging_material_item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_uom_conversion" ADD CONSTRAINT "md_uom_conversion_from_uom_id_fkey" FOREIGN KEY ("from_uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_uom_conversion" ADD CONSTRAINT "md_uom_conversion_to_uom_id_fkey" FOREIGN KEY ("to_uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_uom_conversion" ADD CONSTRAINT "md_uom_conversion_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_service_code" ADD CONSTRAINT "md_service_code_default_uom_id_fkey" FOREIGN KEY ("default_uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_rate_reference" ADD CONSTRAINT "md_rate_reference_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_rate_reference" ADD CONSTRAINT "md_rate_reference_service_code_id_fkey" FOREIGN KEY ("service_code_id") REFERENCES "md_service_code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_rate_reference" ADD CONSTRAINT "md_rate_reference_billing_uom_id_fkey" FOREIGN KEY ("billing_uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_rate_reference" ADD CONSTRAINT "md_rate_reference_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_rate_reference" ADD CONSTRAINT "md_rate_reference_day_type_id_fkey" FOREIGN KEY ("day_type_id") REFERENCES "md_day_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_item_policy" ADD CONSTRAINT "md_owner_item_policy_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_item_policy" ADD CONSTRAINT "md_owner_item_policy_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_item_policy" ADD CONSTRAINT "md_owner_item_policy_billing_uom_override_id_fkey" FOREIGN KEY ("billing_uom_override_id") REFERENCES "md_uom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_item_policy" ADD CONSTRAINT "md_owner_item_policy_preferred_warehouse_id_fkey" FOREIGN KEY ("preferred_warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_import_batch_line" ADD CONSTRAINT "md_import_batch_line_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "md_import_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_import_error" ADD CONSTRAINT "md_import_error_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "md_import_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_import_error" ADD CONSTRAINT "md_import_error_batch_line_id_fkey" FOREIGN KEY ("batch_line_id") REFERENCES "md_import_batch_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_dim" ADD CONSTRAINT "invent_dim_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_dim" ADD CONSTRAINT "invent_dim_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "md_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_dim" ADD CONSTRAINT "invent_dim_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_dim" ADD CONSTRAINT "invent_dim_inventory_status_id_fkey" FOREIGN KEY ("inventory_status_id") REFERENCES "md_inventory_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_trans" ADD CONSTRAINT "invent_trans_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_trans" ADD CONSTRAINT "invent_trans_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_trans" ADD CONSTRAINT "invent_trans_dim_from_id_fkey" FOREIGN KEY ("dim_from_id") REFERENCES "invent_dim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_trans" ADD CONSTRAINT "invent_trans_dim_to_id_fkey" FOREIGN KEY ("dim_to_id") REFERENCES "invent_dim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invent_trans" ADD CONSTRAINT "invent_trans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_hand" ADD CONSTRAINT "on_hand_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_hand" ADD CONSTRAINT "on_hand_invent_dim_id_fkey" FOREIGN KEY ("invent_dim_id") REFERENCES "invent_dim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_hand" ADD CONSTRAINT "on_hand_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_hold" ADD CONSTRAINT "inventory_hold_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_hold" ADD CONSTRAINT "inventory_hold_invent_dim_id_fkey" FOREIGN KEY ("invent_dim_id") REFERENCES "invent_dim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_hold" ADD CONSTRAINT "inventory_hold_on_hand_id_fkey" FOREIGN KEY ("on_hand_id") REFERENCES "on_hand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reversal_link" ADD CONSTRAINT "inventory_reversal_link_original_trans_id_fkey" FOREIGN KEY ("original_trans_id") REFERENCES "invent_trans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reversal_link" ADD CONSTRAINT "inventory_reversal_link_reversal_trans_id_fkey" FOREIGN KEY ("reversal_trans_id") REFERENCES "invent_trans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_run" ADD CONSTRAINT "inventory_reconciliation_run_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_run" ADD CONSTRAINT "inventory_reconciliation_run_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_run" ADD CONSTRAINT "inventory_reconciliation_run_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_result" ADD CONSTRAINT "inventory_reconciliation_result_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "inventory_reconciliation_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_result" ADD CONSTRAINT "inventory_reconciliation_result_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_result" ADD CONSTRAINT "inventory_reconciliation_result_invent_dim_id_fkey" FOREIGN KEY ("invent_dim_id") REFERENCES "invent_dim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshot_run" ADD CONSTRAINT "inventory_snapshot_run_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_storage_snapshot" ADD CONSTRAINT "daily_storage_snapshot_snapshot_run_id_fkey" FOREIGN KEY ("snapshot_run_id") REFERENCES "inventory_snapshot_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_storage_snapshot" ADD CONSTRAINT "daily_storage_snapshot_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_storage_snapshot" ADD CONSTRAINT "daily_storage_snapshot_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "md_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_storage_snapshot" ADD CONSTRAINT "daily_storage_snapshot_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_storage_snapshot" ADD CONSTRAINT "daily_storage_snapshot_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_storage_snapshot" ADD CONSTRAINT "daily_storage_snapshot_invent_dim_id_fkey" FOREIGN KEY ("invent_dim_id") REFERENCES "invent_dim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "md_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_header" ADD CONSTRAINT "receipt_header_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_header" ADD CONSTRAINT "receipt_header_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "md_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_header" ADD CONSTRAINT "receipt_header_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_header" ADD CONSTRAINT "receipt_header_receiving_location_id_fkey" FOREIGN KEY ("receiving_location_id") REFERENCES "md_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_receipt_header_id_fkey" FOREIGN KEY ("receipt_header_id") REFERENCES "receipt_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line" ADD CONSTRAINT "receipt_line_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_weighing_log" ADD CONSTRAINT "receipt_weighing_log_receipt_header_id_fkey" FOREIGN KEY ("receipt_header_id") REFERENCES "receipt_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_status_history" ADD CONSTRAINT "receipt_status_history_receipt_header_id_fkey" FOREIGN KEY ("receipt_header_id") REFERENCES "receipt_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_exception_log" ADD CONSTRAINT "receipt_exception_log_receipt_header_id_fkey" FOREIGN KEY ("receipt_header_id") REFERENCES "receipt_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_integration_state" ADD CONSTRAINT "receipt_integration_state_receipt_header_id_fkey" FOREIGN KEY ("receipt_header_id") REFERENCES "receipt_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_header" ADD CONSTRAINT "shipment_header_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_header" ADD CONSTRAINT "shipment_header_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_header" ADD CONSTRAINT "shipment_header_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "md_vehicle_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_header" ADD CONSTRAINT "shipment_header_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "md_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_line" ADD CONSTRAINT "shipment_line_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_line" ADD CONSTRAINT "shipment_line_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_line" ADD CONSTRAINT "shipment_line_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "md_uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_allocation_record" ADD CONSTRAINT "shipment_allocation_record_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_allocation_record" ADD CONSTRAINT "shipment_allocation_record_shipment_line_id_fkey" FOREIGN KEY ("shipment_line_id") REFERENCES "shipment_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_allocation_record" ADD CONSTRAINT "shipment_allocation_record_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "md_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_allocation_record" ADD CONSTRAINT "shipment_allocation_record_invent_dim_id_fkey" FOREIGN KEY ("invent_dim_id") REFERENCES "invent_dim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_allocation_record" ADD CONSTRAINT "shipment_allocation_record_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_allocation_record" ADD CONSTRAINT "shipment_allocation_record_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_weighing_attempt" ADD CONSTRAINT "shipment_weighing_attempt_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_weighing_attempt" ADD CONSTRAINT "shipment_weighing_attempt_shipment_line_id_fkey" FOREIGN KEY ("shipment_line_id") REFERENCES "shipment_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_status_history" ADD CONSTRAINT "shipment_status_history_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_exception_log" ADD CONSTRAINT "shipment_exception_log_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_approval_decision" ADD CONSTRAINT "shipment_approval_decision_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_approval_decision" ADD CONSTRAINT "shipment_approval_decision_shipment_line_id_fkey" FOREIGN KEY ("shipment_line_id") REFERENCES "shipment_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_pick_work_link" ADD CONSTRAINT "shipment_pick_work_link_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_pick_work_link" ADD CONSTRAINT "shipment_pick_work_link_shipment_line_id_fkey" FOREIGN KEY ("shipment_line_id") REFERENCES "shipment_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_posting_link" ADD CONSTRAINT "shipment_posting_link_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_posting_link" ADD CONSTRAINT "shipment_posting_link_shipment_line_id_fkey" FOREIGN KEY ("shipment_line_id") REFERENCES "shipment_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_so_link" ADD CONSTRAINT "shipment_so_link_shipment_header_id_fkey" FOREIGN KEY ("shipment_header_id") REFERENCES "shipment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ic_move_order_line" ADD CONSTRAINT "ic_move_order_line_move_order_id_fkey" FOREIGN KEY ("move_order_id") REFERENCES "ic_move_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ic_transfer_order_line" ADD CONSTRAINT "ic_transfer_order_line_transfer_order_id_fkey" FOREIGN KEY ("transfer_order_id") REFERENCES "ic_transfer_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ic_cycle_count_header" ADD CONSTRAINT "ic_cycle_count_header_cycle_count_plan_id_fkey" FOREIGN KEY ("cycle_count_plan_id") REFERENCES "ic_cycle_count_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ic_cycle_count_line" ADD CONSTRAINT "ic_cycle_count_line_cycle_count_header_id_fkey" FOREIGN KEY ("cycle_count_header_id") REFERENCES "ic_cycle_count_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ic_adjustment_line" ADD CONSTRAINT "ic_adjustment_line_adjustment_header_id_fkey" FOREIGN KEY ("adjustment_header_id") REFERENCES "ic_adjustment_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_line" ADD CONSTRAINT "we_work_line_work_header_id_fkey" FOREIGN KEY ("work_header_id") REFERENCES "we_work_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_assignment_history" ADD CONSTRAINT "we_work_assignment_history_work_header_id_fkey" FOREIGN KEY ("work_header_id") REFERENCES "we_work_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_status_history" ADD CONSTRAINT "we_work_status_history_work_header_id_fkey" FOREIGN KEY ("work_header_id") REFERENCES "we_work_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_status_history" ADD CONSTRAINT "we_work_status_history_work_line_id_fkey" FOREIGN KEY ("work_line_id") REFERENCES "we_work_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_posting_link" ADD CONSTRAINT "we_work_posting_link_work_line_id_fkey" FOREIGN KEY ("work_line_id") REFERENCES "we_work_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_event_log" ADD CONSTRAINT "we_work_event_log_work_header_id_fkey" FOREIGN KEY ("work_header_id") REFERENCES "we_work_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_event_log" ADD CONSTRAINT "we_work_event_log_work_line_id_fkey" FOREIGN KEY ("work_line_id") REFERENCES "we_work_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_exception" ADD CONSTRAINT "we_work_exception_work_header_id_fkey" FOREIGN KEY ("work_header_id") REFERENCES "we_work_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_exception" ADD CONSTRAINT "we_work_exception_work_line_id_fkey" FOREIGN KEY ("work_line_id") REFERENCES "we_work_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_mobile_sync_event" ADD CONSTRAINT "we_mobile_sync_event_sync_batch_id_fkey" FOREIGN KEY ("sync_batch_id") REFERENCES "we_mobile_sync_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "we_work_outbox_event" ADD CONSTRAINT "we_work_outbox_event_work_header_id_fkey" FOREIGN KEY ("work_header_id") REFERENCES "we_work_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_weighbridge_log" ADD CONSTRAINT "m8_weighbridge_log_scale_device_id_fkey" FOREIGN KEY ("scale_device_id") REFERENCES "m8_weighbridge_device"("device_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_weighbridge_event_state" ADD CONSTRAINT "m8_weighbridge_event_state_weighbridge_log_id_fkey" FOREIGN KEY ("weighbridge_log_id") REFERENCES "m8_weighbridge_log"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_ocr_confirmed_snapshot" ADD CONSTRAINT "m8_ocr_confirmed_snapshot_ocr_result_id_fkey" FOREIGN KEY ("ocr_result_id") REFERENCES "m8_ocr_result"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_mobile_sync_event" ADD CONSTRAINT "m8_mobile_sync_event_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "m8_mobile_sync_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m8_device_heartbeat" ADD CONSTRAINT "m8_device_heartbeat_device_code_fkey" FOREIGN KEY ("device_code") REFERENCES "m8_weighbridge_device"("device_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_work_order" ADD CONSTRAINT "vas_work_order_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_work_order" ADD CONSTRAINT "vas_work_order_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_work_order" ADD CONSTRAINT "vas_work_order_bulk_source_item_id_fkey" FOREIGN KEY ("bulk_source_item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_work_order" ADD CONSTRAINT "vas_work_order_bagged_output_item_id_fkey" FOREIGN KEY ("bagged_output_item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_work_order" ADD CONSTRAINT "vas_work_order_packaging_item_id_fkey" FOREIGN KEY ("packaging_item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_work_order" ADD CONSTRAINT "vas_work_order_packaging_owner_id_fkey" FOREIGN KEY ("packaging_owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_session" ADD CONSTRAINT "vas_session_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "vas_work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_state_history" ADD CONSTRAINT "vas_state_history_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "vas_work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_exception_log" ADD CONSTRAINT "vas_exception_log_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "vas_work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vas_outbox" ADD CONSTRAINT "vas_outbox_aggregate_id_fkey" FOREIGN KEY ("aggregate_id") REFERENCES "vas_work_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_contract" ADD CONSTRAINT "bil_contract_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_contract" ADD CONSTRAINT "bil_contract_superseded_contract_id_fkey" FOREIGN KEY ("superseded_contract_id") REFERENCES "bil_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_contract_fee_line" ADD CONSTRAINT "bil_contract_fee_line_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "bil_contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_contract_fee_line" ADD CONSTRAINT "bil_contract_fee_line_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_event" ADD CONSTRAINT "bil_event_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_event" ADD CONSTRAINT "bil_event_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_event" ADD CONSTRAINT "bil_event_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_event" ADD CONSTRAINT "bil_event_debit_note_line_id_fkey" FOREIGN KEY ("debit_note_line_id") REFERENCES "bil_debit_note_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_storage_snapshot" ADD CONSTRAINT "bil_storage_snapshot_snapshot_run_id_fkey" FOREIGN KEY ("snapshot_run_id") REFERENCES "bil_snapshot_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_storage_snapshot" ADD CONSTRAINT "bil_storage_snapshot_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_storage_snapshot" ADD CONSTRAINT "bil_storage_snapshot_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "md_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_storage_snapshot" ADD CONSTRAINT "bil_storage_snapshot_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_storage_snapshot" ADD CONSTRAINT "bil_storage_snapshot_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_storage_snapshot" ADD CONSTRAINT "bil_storage_snapshot_debit_note_line_id_fkey" FOREIGN KEY ("debit_note_line_id") REFERENCES "bil_debit_note_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_debit_note" ADD CONSTRAINT "bil_debit_note_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_debit_note" ADD CONSTRAINT "bil_debit_note_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "bil_contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_debit_note_line" ADD CONSTRAINT "bil_debit_note_line_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "bil_debit_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_debit_note_line" ADD CONSTRAINT "bil_debit_note_line_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_debit_note_line" ADD CONSTRAINT "bil_debit_note_line_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_debit_note_history" ADD CONSTRAINT "bil_debit_note_history_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "bil_debit_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_exception" ADD CONSTRAINT "bil_exception_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_exception" ADD CONSTRAINT "bil_exception_billing_event_id_fkey" FOREIGN KEY ("billing_event_id") REFERENCES "bil_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_exception" ADD CONSTRAINT "bil_exception_snapshot_run_id_fkey" FOREIGN KEY ("snapshot_run_id") REFERENCES "bil_snapshot_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_exception" ADD CONSTRAINT "bil_exception_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "bil_debit_note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_erp_push_outbox" ADD CONSTRAINT "bil_erp_push_outbox_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "bil_debit_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_erp_push_log" ADD CONSTRAINT "bil_erp_push_log_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "bil_debit_note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bil_erp_push_log" ADD CONSTRAINT "bil_erp_push_log_outbox_id_fkey" FOREIGN KEY ("outbox_id") REFERENCES "bil_erp_push_outbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_export_job" ADD CONSTRAINT "rpt_export_job_report_catalog_id_fkey" FOREIGN KEY ("report_catalog_id") REFERENCES "rpt_report_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_export_job_event" ADD CONSTRAINT "rpt_export_job_event_export_job_id_fkey" FOREIGN KEY ("export_job_id") REFERENCES "rpt_export_job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_reconciliation_result" ADD CONSTRAINT "rpt_reconciliation_result_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "rpt_reconciliation_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_reconciliation_result" ADD CONSTRAINT "rpt_reconciliation_result_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "rpt_reconciliation_check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_reconciliation_resolution" ADD CONSTRAINT "rpt_reconciliation_resolution_reconciliation_result_id_fkey" FOREIGN KEY ("reconciliation_result_id") REFERENCES "rpt_reconciliation_result"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_go_live_gate_status" ADD CONSTRAINT "rpt_go_live_gate_status_gate_id_fkey" FOREIGN KEY ("gate_id") REFERENCES "rpt_go_live_gate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_go_live_signoff_history" ADD CONSTRAINT "rpt_go_live_signoff_history_gate_status_id_fkey" FOREIGN KEY ("gate_status_id") REFERENCES "rpt_go_live_gate_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rpt_report_run_log" ADD CONSTRAINT "rpt_report_run_log_report_catalog_id_fkey" FOREIGN KEY ("report_catalog_id") REFERENCES "rpt_report_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_local_credential" ADD CONSTRAINT "auth_local_credential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_password_history" ADD CONSTRAINT "auth_password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_refresh_token" ADD CONSTRAINT "auth_refresh_token_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_refresh_token" ADD CONSTRAINT "auth_refresh_token_rotated_from_id_fkey" FOREIGN KEY ("rotated_from_id") REFERENCES "auth_refresh_token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_login_attempt" ADD CONSTRAINT "auth_login_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_security_event" ADD CONSTRAINT "auth_security_event_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_account_lock" ADD CONSTRAINT "auth_account_lock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
