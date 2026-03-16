-- CreateEnum
CREATE TYPE "CarrierGroup" AS ENUM ('TRUCKING', 'SHIPPING_LINE', 'FREIGHT_FORWARDER', 'BARGE_OPERATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('TRUCK', 'VESSEL', 'BARGE', 'CONTAINER', 'RAIL');

-- CreateEnum
CREATE TYPE "VesselType" AS ENUM ('BULK_CARRIER', 'BARGE', 'GENERAL_CARGO', 'CONTAINER', 'TANKER', 'OTHER');

-- CreateTable
CREATE TABLE "md_item_groups" (
    "id" UUID NOT NULL,
    "item_group_code" VARCHAR(50) NOT NULL,
    "item_group_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cargo_form" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_item_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_carriers" (
    "id" UUID NOT NULL,
    "carrier_code" VARCHAR(50) NOT NULL,
    "carrier_name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "carrier_group" "CarrierGroup" NOT NULL,
    "transport_mode" "TransportMode" NOT NULL,
    "default_vehicle_type_code" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_vessels" (
    "id" UUID NOT NULL,
    "vessel_code" VARCHAR(50) NOT NULL,
    "vessel_name" VARCHAR(255) NOT NULL,
    "imo_number" VARCHAR(20),
    "vessel_type" "VesselType" NOT NULL,
    "nationality" VARCHAR(100),
    "call_sign" VARCHAR(20),
    "dwt_ton" DECIMAL(12,2),
    "loa_m" DECIMAL(8,2),
    "beam_m" DECIMAL(8,2),
    "draft_m" DECIMAL(8,2),
    "year_built" SMALLINT,
    "owner" VARCHAR(255),
    "operator" VARCHAR(255),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_vessels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_owner_sku_mappings" (
    "id" UUID NOT NULL,
    "mapping_code" VARCHAR(100) NOT NULL,
    "owner_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "owner_sku_code" VARCHAR(100) NOT NULL,
    "owner_sku_name" VARCHAR(255) NOT NULL,
    "billing_class" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_owner_sku_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_location_types" (
    "id" UUID NOT NULL,
    "location_type_code" VARCHAR(50) NOT NULL,
    "location_type_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_location_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "md_item_groups_item_group_code_key" ON "md_item_groups"("item_group_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_carriers_carrier_code_key" ON "md_carriers"("carrier_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_vessels_vessel_code_key" ON "md_vessels"("vessel_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_owner_sku_mappings_mapping_code_key" ON "md_owner_sku_mappings"("mapping_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_owner_sku_mappings_owner_id_item_id_owner_sku_code_key" ON "md_owner_sku_mappings"("owner_id", "item_id", "owner_sku_code");

-- CreateIndex
CREATE UNIQUE INDEX "md_location_types_location_type_code_key" ON "md_location_types"("location_type_code");

-- AddForeignKey
ALTER TABLE "md_owner_sku_mappings" ADD CONSTRAINT "md_owner_sku_mappings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "md_owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_owner_sku_mappings" ADD CONSTRAINT "md_owner_sku_mappings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "md_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
