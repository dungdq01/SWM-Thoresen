-- Add LOADED to ShipmentStatus enum (needed for outbound loading flow)
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'LOADED' AFTER 'LOADING';
