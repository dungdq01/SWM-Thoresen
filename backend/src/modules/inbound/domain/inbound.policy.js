/**
 * Module 4: Inbound Operations - Domain Policies
 * Business rules và validation policies
 */

const { Decimal } = require('decimal.js');

/**
 * Tolerance Policy - Kiểm tra variance có nằm trong tolerance cho phép không
 */
class TolerancePolicy {
  /**
   * Tính variance percentage
   * @param {number} netWeight - Trọng lượng thực tế (kg)
   * @param {number} expectedQty - Số lượng kỳ vọng
   * @returns {number} Variance percentage (absolute)
   */
  static calculateVariance(netWeight, expectedQty) {
    if (!expectedQty || expectedQty <= 0) {
      return 100; // Invalid expected qty
    }
    const net = new Decimal(netWeight);
    const expected = new Decimal(expectedQty);
    const diff = net.minus(expected).abs();
    const variance = diff.dividedBy(expected).times(100);
    return variance.toNumber();
  }

  /**
   * Kiểm tra tolerance
   * @param {number} variancePct - Variance percentage
   * @param {number} tolerancePct - Tolerance percentage cho phép
   * @returns {{ pass: boolean, variancePct: number, tolerancePct: number }}
   */
  static checkTolerance(variancePct, tolerancePct) {
    if (tolerancePct === null || tolerancePct === undefined) {
      return { pass: false, variancePct, tolerancePct: null, reason: 'TOLERANCE_NOT_CONFIGURED' };
    }
    const pass = variancePct <= tolerancePct;
    return { pass, variancePct, tolerancePct, reason: pass ? null : 'VARIANCE_EXCEEDED' };
  }

  /**
   * Lookup tolerance từ hierarchy
   * Priority: owner_item_policy > item > owner.default > system_default
   */
  static async lookupTolerance(prisma, ownerId, itemId) {
    // 1. Check owner_item_policy
    const ownerItemPolicy = await prisma.mdOwnerItemPolicy.findUnique({
      where: { ownerId_itemId: { ownerId, itemId } },
      select: { tolerancePctInboundOverride: true, isActive: true },
    });

    if (ownerItemPolicy?.isActive && ownerItemPolicy.tolerancePctInboundOverride !== null) {
      return {
        tolerance: Number(ownerItemPolicy.tolerancePctInboundOverride),
        source: 'OWNER_ITEM_POLICY',
      };
    }

    // 2. Check item
    const item = await prisma.mdItem.findUnique({
      where: { id: itemId },
      select: { tolerancePctInbound: true, isActive: true },
    });

    if (item?.isActive && item.tolerancePctInbound !== null) {
      return {
        tolerance: Number(item.tolerancePctInbound),
        source: 'ITEM',
      };
    }

    // 3. Check owner default
    const owner = await prisma.mdOwner.findUnique({
      where: { id: ownerId },
      select: { defaultTolerancePct: true, isActive: true },
    });

    if (owner?.isActive && owner.defaultTolerancePct !== null) {
      return {
        tolerance: Number(owner.defaultTolerancePct),
        source: 'OWNER_DEFAULT',
      };
    }

    // 4. System default (có thể config trong environment)
    const systemDefault = process.env.DEFAULT_INBOUND_TOLERANCE_PCT;
    if (systemDefault) {
      return {
        tolerance: Number(systemDefault),
        source: 'SYSTEM_DEFAULT',
      };
    }

    return { tolerance: null, source: null };
  }
}

/**
 * Cancel Policy - Kiểm tra điều kiện cancel receipt
 */
class CancelPolicy {
  static CANCELLABLE_STATES = ['DRAFT', 'AWAITING_WEIGHING', 'WEIGHED_IN', 'PROCESSING'];

  /**
   * Kiểm tra có thể cancel không
   */
  static canCancel(status, hasPostedInventory = false) {
    if (hasPostedInventory) {
      return {
        allowed: false,
        reason: 'Không thể cancel receipt đã post inventory. Vui lòng sử dụng reversal flow.',
      };
    }
    if (!this.CANCELLABLE_STATES.includes(status)) {
      return {
        allowed: false,
        reason: `Không thể cancel receipt ở trạng thái ${status}. Chỉ cho phép cancel ở: ${this.CANCELLABLE_STATES.join(', ')}`,
      };
    }
    return { allowed: true };
  }
}

/**
 * Bagged Inbound Policy - Kiểm tra over-receipt cho hàng bao
 */
class BaggedPolicy {
  /**
   * Kiểm tra over-receipt rule cho bagged cargo
   */
  static async checkOverReceipt(prisma, poId, currentBagCount) {
    // Tính tổng bag_count đã received cho PO này
    const result = await prisma.receiptLine.aggregate({
      where: {
        header: {
          poId,
          status: { in: ['RECEIVED', 'PUTAWAY', 'CLOSED'] },
        },
        cargoForm: { in: ['BAGGED_25KG', 'BAGGED_40KG', 'BAGGED_50KG'] },
      },
      _sum: { bagCount: true },
    });

    const totalReceived = result._sum.bagCount || 0;
    const totalWithCurrent = totalReceived + currentBagCount;

    // Lấy expected bag count từ PO (giả sử có bảng PO hoặc field expectedBagCount)
    // Ở Phase 1, có thể skip check này nếu chưa có PO table
    return {
      totalReceived,
      totalWithCurrent,
      // overReceiptBlocked: totalWithCurrent > expectedBagCount
    };
  }
}

/**
 * Weight Validation Policy
 */
class WeightValidationPolicy {
  static validateGrossWeight(grossWeightKg) {
    if (grossWeightKg === null || grossWeightKg === undefined) {
      return { valid: false, reason: 'Gross weight là bắt buộc' };
    }
    if (grossWeightKg <= 0) {
      return { valid: false, reason: 'Gross weight phải lớn hơn 0' };
    }
    return { valid: true };
  }

  static validateTareWeight(tareWeightKg, grossWeightKg) {
    if (tareWeightKg === null || tareWeightKg === undefined) {
      return { valid: false, reason: 'Tare weight là bắt buộc' };
    }
    if (tareWeightKg <= 0) {
      return { valid: false, reason: 'Tare weight phải lớn hơn 0' };
    }
    if (tareWeightKg >= grossWeightKg) {
      return { valid: false, reason: 'Tare weight phải nhỏ hơn Gross weight' };
    }
    return { valid: true };
  }

  static calculateNetWeight(grossWeightKg, tareWeightKg) {
    return new Decimal(grossWeightKg).minus(tareWeightKg).toNumber();
  }
}

module.exports = {
  TolerancePolicy,
  CancelPolicy,
  BaggedPolicy,
  WeightValidationPolicy,
};
