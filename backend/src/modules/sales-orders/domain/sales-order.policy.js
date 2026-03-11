/**
 * Sales Orders Module - Domain Policies
 * Business rules: blocking rule TC-11, validation
 */

const { Decimal } = require('decimal.js');

/**
 * Blocking Policy — TC-11 CONFIRMED
 * SUM(shipment.expected_qty) ≤ SO.expected_qty per line
 */
class BlockingPolicy {
  /**
   * Kiểm tra release qty có vượt SO line remaining không
   * @param {Decimal|number} expectedQtyKg - SO line expected
   * @param {Decimal|number} releasedQtyKg - SO line already released
   * @param {Decimal|number} releaseQtyKg  - Qty muốn release lần này
   * @returns {{ allowed: boolean, remaining: number, reason?: string }}
   */
  static checkLineBlocking(expectedQtyKg, releasedQtyKg, releaseQtyKg) {
    const expected = new Decimal(expectedQtyKg);
    const released = new Decimal(releasedQtyKg);
    const release = new Decimal(releaseQtyKg);
    const remaining = expected.minus(released);

    if (release.greaterThan(remaining)) {
      return {
        allowed: false,
        remaining: remaining.toNumber(),
        reason: `Release qty ${release.toNumber()} kg vượt remaining ${remaining.toNumber()} kg`,
      };
    }
    return { allowed: true, remaining: remaining.minus(release).toNumber() };
  }
}

/**
 * Master Data Validation Policy
 */
class MasterDataValidation {
  /**
   * Validate references tồn tại và active
   */
  static async validateReferences(prisma, { ownerId, customerId, warehouseId }) {
    const errors = [];

    const owner = await prisma.mdOwner.findUnique({
      where: { id: ownerId },
      select: { id: true, isActive: true },
    });
    if (!owner) errors.push({ entity: 'Owner', id: ownerId, reason: 'Không tồn tại' });
    else if (!owner.isActive) errors.push({ entity: 'Owner', id: ownerId, reason: 'Không active' });

    const customer = await prisma.mdCustomer.findUnique({
      where: { id: customerId },
      select: { id: true, isActive: true },
    });
    if (!customer) errors.push({ entity: 'Customer', id: customerId, reason: 'Không tồn tại' });
    else if (!customer.isActive) errors.push({ entity: 'Customer', id: customerId, reason: 'Không active' });

    const warehouse = await prisma.mdWarehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, isActive: true },
    });
    if (!warehouse) errors.push({ entity: 'Warehouse', id: warehouseId, reason: 'Không tồn tại' });
    else if (!warehouse.isActive) errors.push({ entity: 'Warehouse', id: warehouseId, reason: 'Không active' });

    return errors;
  }

  /**
   * Validate line items tồn tại và active
   */
  static async validateLineItems(prisma, lines) {
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const item = await prisma.mdItem.findUnique({
        where: { id: line.itemId },
        select: { id: true, isActive: true, itemCode: true },
      });
      if (!item) {
        errors.push({ lineIndex: i, entity: 'Item', id: line.itemId, reason: 'Không tồn tại' });
      } else if (!item.isActive) {
        errors.push({ lineIndex: i, entity: 'Item', id: line.itemId, reason: 'Không active' });
      }

      const uom = await prisma.mdUom.findUnique({
        where: { id: line.uomId },
        select: { id: true, isActive: true },
      });
      if (!uom) {
        errors.push({ lineIndex: i, entity: 'UOM', id: line.uomId, reason: 'Không tồn tại' });
      } else if (!uom.isActive) {
        errors.push({ lineIndex: i, entity: 'UOM', id: line.uomId, reason: 'Không active' });
      }
    }
    return errors;
  }
}

module.exports = {
  BlockingPolicy,
  MasterDataValidation,
};
