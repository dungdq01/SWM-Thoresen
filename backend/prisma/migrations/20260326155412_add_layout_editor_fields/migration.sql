-- CreateEnum
CREATE TYPE "RackType" AS ENUM ('SELECTIVE', 'DRIVE_IN', 'PUSH_BACK', 'PALLET_FLOW', 'CANTILEVER', 'MEZZANINE', 'FLOOR_STACK');

-- CreateEnum
CREATE TYPE "SiteElementType" AS ENUM ('ROAD', 'GATE', 'PARKING', 'WEIGHBRIDGE', 'OFFICE', 'LOADING_AREA', 'GREEN_AREA');

-- AlterTable
ALTER TABLE "md_location" ADD COLUMN     "display_color" VARCHAR(20),
ADD COLUMN     "location_depth_m" DECIMAL(18,2),
ADD COLUMN     "location_width_m" DECIMAL(18,2),
ADD COLUMN     "rotation_deg" DECIMAL(5,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "md_warehouse" ADD COLUMN     "display_color" VARCHAR(20),
ADD COLUMN     "length_m" DECIMAL(18,2),
ADD COLUMN     "site_rotation_deg" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "site_x_coord" DECIMAL(18,6),
ADD COLUMN     "site_y_coord" DECIMAL(18,6),
ADD COLUMN     "width_m" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "md_zone" ADD COLUMN     "display_color" VARCHAR(20),
ADD COLUMN     "rotation_deg" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "sort_order" INTEGER DEFAULT 0,
ADD COLUMN     "x_coord" DECIMAL(18,6),
ADD COLUMN     "y_coord" DECIMAL(18,6),
ADD COLUMN     "zone_depth_m" DECIMAL(18,2),
ADD COLUMN     "zone_width_m" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "md_rack" (
    "id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "zone_id" UUID,
    "rack_code" VARCHAR(50) NOT NULL,
    "rack_name" VARCHAR(255),
    "rack_type" "RackType" NOT NULL,
    "x_coord" DECIMAL(18,6) NOT NULL,
    "y_coord" DECIMAL(18,6) NOT NULL,
    "rack_width_m" DECIMAL(18,2) NOT NULL,
    "rack_depth_m" DECIMAL(18,2) NOT NULL,
    "rack_height_m" DECIMAL(18,2),
    "rotation_deg" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "levels" INTEGER NOT NULL DEFAULT 1,
    "bays_per_level" INTEGER NOT NULL DEFAULT 1,
    "display_color" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "row_version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "md_site_map_element" (
    "id" UUID NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "warehouse_id" UUID,
    "element_type" "SiteElementType" NOT NULL,
    "label" VARCHAR(255),
    "x_coord" DECIMAL(18,6) NOT NULL,
    "y_coord" DECIMAL(18,6) NOT NULL,
    "element_width_m" DECIMAL(18,2),
    "element_depth_m" DECIMAL(18,2),
    "rotation_deg" DECIMAL(5,2) DEFAULT 0,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "md_site_map_element_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "md_rack_zone_id_is_active_idx" ON "md_rack"("zone_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "md_rack_warehouse_id_rack_code_key" ON "md_rack"("warehouse_id", "rack_code");

-- CreateIndex
CREATE INDEX "md_site_map_element_site_id_is_active_idx" ON "md_site_map_element"("site_id", "is_active");

-- AddForeignKey
ALTER TABLE "md_rack" ADD CONSTRAINT "md_rack_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_rack" ADD CONSTRAINT "md_rack_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "md_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "md_site_map_element" ADD CONSTRAINT "md_site_map_element_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "md_warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
