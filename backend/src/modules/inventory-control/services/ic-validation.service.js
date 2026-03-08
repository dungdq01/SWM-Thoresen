/**
 * Module 6: Inventory Control - Validation Service
 * Centralized validation logic for all IC operations
 */

const prisma = require('../../../shared/db/prismaClient');
const {
  IcValidationError,
  IcInvalidLocationError,
  IcReservedStockConflictError,
  IcInsufficientQtyError,
} = require('../domain/ic.errors');

async function validateItem(itemId, tx = prisma) {
  const item = await tx.mdItem.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new IcValidationError(`Item not found: ${itemId}`);
  }
  if (!item.isActive) {
    throw new IcValidationError(`Item is inactive: ${itemId}`);
  }
  return item;
}

async function validateOwner(ownerId, tx = prisma) {
  const owner = await tx.mdOwner.findUnique({ where: { id: ownerId } });
  if (!owner) {
    throw new IcValidationError(`Owner not found: ${ownerId}`);
  }
  if (!owner.isActive) {
    throw new IcValidationError(`Owner is inactive: ${ownerId}`);
  }
  return owner;
}

async function validateWarehouse(warehouseId, tx = prisma) {
  const warehouse = await tx.mdWarehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) {
    throw new IcValidationError(`Warehouse not found: ${warehouseId}`);
  }
  if (!warehouse.isActive) {
    throw new IcValidationError(`Warehouse is inactive: ${warehouseId}`);
  }
  return warehouse;
}

async function validateLocation(locationId, warehouseId, tx = prisma) {
  const location = await tx.mdLocation.findUnique({ where: { id: locationId } });
  if (!location) {
    throw new IcInvalidLocationError(`Location not found: ${locationId}`);
  }
  if (!location.isActive) {
    throw new IcInvalidLocationError(`Location is inactive: ${locationId}`);
  }
  if (location.warehouseId !== warehouseId) {
    throw new IcInvalidLocationError(`Location ${locationId} does not belong to warehouse ${warehouseId}`);
  }
  return location;
}

async function validateInventoryStatus(statusCode, tx = prisma) {
  const status = await tx.mdInventoryStatus.findUnique({ where: { statusCode } });
  if (!status) {
    throw new IcValidationError(`Inventory status not found: ${statusCode}`);
  }
  if (!status.isActive) {
    throw new IcValidationError(`Inventory status is inactive: ${statusCode}`);
  }
  return status;
}

async function validateReasonCode(code, domainCode, tx = prisma) {
  const reasonCode = await tx.reasonCode.findFirst({
    where: { code, domainCode, isActive: true },
  });
  if (!reasonCode) {
    throw new IcValidationError(`Reason code not found or inactive: ${code} for domain ${domainCode}`);
  }
  return reasonCode;
}

async function checkAvailableStock(itemId, ownerId, warehouseId, locationId, inventoryStatus, requestedQty, tx = prisma) {
  const inventDim = await tx.inventDim.findFirst({
    where: {
      warehouseId,
      locationId,
      ownerId,
      inventoryStatus: { statusCode: inventoryStatus },
    },
  });

  if (!inventDim) {
    throw new IcInsufficientQtyError(itemId, locationId, 0, requestedQty);
  }

  const onHand = await tx.onHand.findFirst({
    where: { itemId, inventDimId: inventDim.id },
  });

  if (!onHand) {
    throw new IcInsufficientQtyError(itemId, locationId, 0, requestedQty);
  }

  const available = parseFloat(onHand.availableQty);
  const requested = parseFloat(requestedQty);

  if (available < requested) {
    throw new IcInsufficientQtyError(itemId, locationId, available, requested);
  }

  return { onHand, inventDim, available };
}

async function checkReservedStock(itemId, ownerId, warehouseId, locationId, inventoryStatus, tx = prisma) {
  const inventDim = await tx.inventDim.findFirst({
    where: {
      warehouseId,
      locationId,
      ownerId,
      inventoryStatus: { statusCode: inventoryStatus },
    },
  });

  if (!inventDim) return { reservedQty: 0 };

  const onHand = await tx.onHand.findFirst({
    where: { itemId, inventDimId: inventDim.id },
  });

  if (!onHand) return { reservedQty: 0 };

  const reserved = parseFloat(onHand.reservedQty);
  if (reserved > 0) {
    throw new IcReservedStockConflictError(itemId, locationId, reserved);
  }

  return { reservedQty: reserved };
}

async function validateMoveOrderCreate(data, tx = prisma) {
  await validateWarehouse(data.warehouseId, tx);

  for (const line of data.lines) {
    await validateItem(line.itemId, tx);
    await validateOwner(line.ownerId, tx);
    await validateLocation(line.fromLocationId, data.warehouseId, tx);
    await validateLocation(line.toLocationId, data.warehouseId, tx);
    await validateInventoryStatus(line.inventoryStatus, tx);
  }
}

async function validateTransferOrderCreate(data, tx = prisma) {
  await validateWarehouse(data.fromWarehouseId, tx);
  await validateWarehouse(data.toWarehouseId, tx);

  for (const line of data.lines) {
    await validateItem(line.itemId, tx);
    await validateOwner(line.ownerId, tx);
    await validateLocation(line.fromLocationId, data.fromWarehouseId, tx);
    if (line.toLocationId) {
      await validateLocation(line.toLocationId, data.toWarehouseId, tx);
    }
    await validateInventoryStatus(line.inventoryStatus, tx);
  }
}

async function validateStatusChangeCreate(data, tx = prisma) {
  await validateWarehouse(data.warehouseId, tx);
  await validateItem(data.itemId, tx);
  await validateOwner(data.ownerId, tx);
  await validateLocation(data.locationId, data.warehouseId, tx);
  await validateInventoryStatus(data.fromStatus, tx);
  await validateInventoryStatus(data.toStatus, tx);
  await validateReasonCode(data.reasonCode, 'INVENTORY_CONTROL', tx);
}

async function validateAdjustmentCreate(data, tx = prisma) {
  await validateWarehouse(data.warehouseId, tx);
  await validateReasonCode(data.reasonCode, 'INVENTORY_CONTROL', tx);

  for (const line of data.lines) {
    await validateItem(line.itemId, tx);
    await validateOwner(line.ownerId, tx);
    await validateLocation(line.locationId, data.warehouseId, tx);
    await validateInventoryStatus(line.inventoryStatus, tx);
  }
}

module.exports = {
  validateItem,
  validateOwner,
  validateWarehouse,
  validateLocation,
  validateInventoryStatus,
  validateReasonCode,
  checkAvailableStock,
  checkReservedStock,
  validateMoveOrderCreate,
  validateTransferOrderCreate,
  validateStatusChangeCreate,
  validateAdjustmentCreate,
};
