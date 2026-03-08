/**
 * Module 3: Inventory Core Engine - Domain Rules
 */

const { InventoryTransType, REASON_REQUIRED_TRANS_TYPES, TRANS_TYPE_IMPACT } = require('./inventory.types');
const { Decimal } = require('decimal.js');

/**
 * Check if trans type requires reason code
 */
function requiresReasonCode(transType) {
  return REASON_REQUIRED_TRANS_TYPES.includes(transType);
}

/**
 * Check if posting would result in negative stock
 */
function wouldResultInNegativeStock(currentPhysicalQty, changeQty) {
  const current = new Decimal(currentPhysicalQty || 0);
  const change = new Decimal(changeQty || 0);
  return current.plus(change).lessThan(0);
}

/**
 * Calculate available qty from physical and reserved
 */
function calculateAvailableQty(physicalQty, reservedQty) {
  const physical = new Decimal(physicalQty || 0);
  const reserved = new Decimal(reservedQty || 0);
  return physical.minus(reserved);
}

/**
 * Check if can allocate (hold) quantity
 */
function canAllocateQty(availableQty, requestedQty) {
  const available = new Decimal(availableQty || 0);
  const requested = new Decimal(requestedQty || 0);
  return available.greaterThanOrEqualTo(requested);
}

/**
 * Get the on-hand impact for a trans type
 */
function getOnHandImpact(transType, qty) {
  const impact = TRANS_TYPE_IMPACT[transType];
  if (!impact) {
    return { fromImpact: new Decimal(0), toImpact: new Decimal(0) };
  }

  const qtyDecimal = new Decimal(qty || 0).abs();

  if (transType === InventoryTransType.MOVE || transType === InventoryTransType.STATUS_CHANGE) {
    return {
      fromImpact: qtyDecimal.negated(),
      toImpact: qtyDecimal,
    };
  }

  if (impact.sign > 0) {
    return { fromImpact: new Decimal(0), toImpact: qtyDecimal };
  }
  if (impact.sign < 0) {
    return { fromImpact: qtyDecimal.negated(), toImpact: new Decimal(0) };
  }

  return { fromImpact: new Decimal(0), toImpact: new Decimal(0) };
}

/**
 * Validate dimension requirements for trans type
 */
function validateDimensionRequirements(transType, dimFromId, dimToId) {
  const impact = TRANS_TYPE_IMPACT[transType];
  if (!impact) {
    return { valid: false, error: `Unknown trans_type: ${transType}` };
  }

  if (impact.dimFrom && !dimFromId) {
    return { valid: false, error: `dim_from is required for trans_type: ${transType}` };
  }

  if (impact.dimTo && !dimToId) {
    return { valid: false, error: `dim_to is required for trans_type: ${transType}` };
  }

  return { valid: true };
}

/**
 * Check if a trans can be reversed
 */
function canReverseTrans(trans, existingReversalLink) {
  if (!trans) {
    return { allowed: false, reason: 'Transaction not found' };
  }

  if (trans.isReversal) {
    return { allowed: false, reason: 'Cannot reverse a reversal transaction' };
  }

  if (existingReversalLink) {
    return { allowed: false, reason: 'Transaction already has a reversal' };
  }

  return { allowed: true };
}

/**
 * Calculate reconciliation diff
 */
function calculateReconciliationDiff(ledgerQty, onHandPhysicalQty) {
  const ledger = new Decimal(ledgerQty || 0);
  const onHand = new Decimal(onHandPhysicalQty || 0);
  return ledger.minus(onHand);
}

/**
 * Determine reconciliation severity based on diff
 */
function determineReconciliationSeverity(diffQty, physicalQty) {
  const diff = new Decimal(diffQty || 0).abs();
  const physical = new Decimal(physicalQty || 0).abs();

  if (diff.equals(0)) {
    return 'INFO';
  }

  if (physical.equals(0)) {
    return diff.greaterThan(0) ? 'CRITICAL' : 'INFO';
  }

  const diffPct = diff.dividedBy(physical).times(100);

  if (diffPct.greaterThan(10)) {
    return 'CRITICAL';
  }
  if (diffPct.greaterThan(5)) {
    return 'HIGH';
  }
  if (diffPct.greaterThan(1)) {
    return 'MEDIUM';
  }
  return 'INFO';
}

module.exports = {
  requiresReasonCode,
  wouldResultInNegativeStock,
  calculateAvailableQty,
  canAllocateQty,
  getOnHandImpact,
  validateDimensionRequirements,
  canReverseTrans,
  calculateReconciliationDiff,
  determineReconciliationSeverity,
};
