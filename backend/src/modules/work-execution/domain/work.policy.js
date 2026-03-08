/**
 * Module 7: Work Execution - Business Policies
 */

const { SHORT_PICK_THRESHOLDS, LOCATION_TYPE_FOR_WORK, WORK_TYPES } = require('./work.types');
const {
  ShortPickThresholdExceededError,
  LocationTypeNotAllowedError,
  ActualQuantityInvalidError,
  ManagerEvidenceRequiredError,
  ReasonCodeRequiredError,
} = require('./work.errors');

function calculateVariance(expectedQty, actualQty) {
  const variance = Number(actualQty) - Number(expectedQty);
  const variancePct = Math.abs(variance) / Number(expectedQty) * 100;
  return { variance, variancePct };
}

function validateShortPick(expectedQty, actualQty, isManagerOverride = false) {
  const { variance, variancePct } = calculateVariance(expectedQty, actualQty);
  
  if (variance < 0) {
    if (variancePct > SHORT_PICK_THRESHOLDS.WARN_PCT && !isManagerOverride) {
      throw new ShortPickThresholdExceededError(
        expectedQty,
        actualQty,
        variancePct,
        SHORT_PICK_THRESHOLDS.WARN_PCT
      );
    }
  }
  
  return {
    isShortPick: variance < 0,
    variance,
    variancePct,
    requiresException: variance < 0 && variancePct > SHORT_PICK_THRESHOLDS.ALLOW_PCT,
  };
}

function validateActualQuantity(actualQty) {
  if (actualQty === null || actualQty === undefined) {
    throw new ActualQuantityInvalidError(actualQty, 'Actual quantity is required');
  }
  const qty = Number(actualQty);
  if (isNaN(qty)) {
    throw new ActualQuantityInvalidError(actualQty, 'Actual quantity must be a number');
  }
  if (qty < 0) {
    throw new ActualQuantityInvalidError(actualQty, 'Actual quantity cannot be negative');
  }
  return qty;
}

function validateLocationForWorkType(location, workType, isSource) {
  const rules = LOCATION_TYPE_FOR_WORK[workType];
  if (!rules) return true;
  
  const expectedType = isSource ? rules.from : rules.to;
  if (!expectedType) return true;
  
  if (location.locationType !== expectedType) {
    throw new LocationTypeNotAllowedError(
      location.locationCode,
      location.locationType,
      [expectedType]
    );
  }
  
  return true;
}

function validateDestinationLocation(location, workType) {
  if (!location) return true;
  
  if (location.status === 'BLOCKED') {
    throw new LocationTypeNotAllowedError(
      location.locationCode,
      'BLOCKED',
      ['OK', 'HOLD']
    );
  }
  
  return validateLocationForWorkType(location, workType, false);
}

function validateSourceLocation(location, workType) {
  if (!location) return true;
  return validateLocationForWorkType(location, workType, true);
}

function validateManagerOverride(input) {
  if (!input.reasonCode) {
    throw new ManagerEvidenceRequiredError('reasonCode');
  }
  if (!input.evidenceText || input.evidenceText.trim().length < 10) {
    throw new ManagerEvidenceRequiredError('evidenceText (minimum 10 characters)');
  }
  if (input.actualQty === undefined || input.actualQty === null) {
    throw new ManagerEvidenceRequiredError('actualQty');
  }
  return true;
}

function validateSkipLine(input) {
  if (!input.reasonCode) {
    throw new ReasonCodeRequiredError('skip line');
  }
  return true;
}

function validateCancelWork(input, hasCompletedLines) {
  if (!input.reasonCode) {
    throw new ReasonCodeRequiredError('cancel work');
  }
  return true;
}

function getPostingRequestType(workType) {
  switch (workType) {
    case WORK_TYPES.PUTAWAY:
    case WORK_TYPES.PICK:
    case WORK_TYPES.MOVE:
      return 'MOVE';
    case WORK_TYPES.TRANSFER_PICK:
      return 'TRANSFER_SHIP';
    case WORK_TYPES.TRANSFER_PUT:
      return 'TRANSFER_RECEIVE';
    default:
      return 'MOVE';
  }
}

function getTargetModuleForCallback(sourceModule) {
  return sourceModule;
}

function getCallbackEventType(workType) {
  switch (workType) {
    case WORK_TYPES.PUTAWAY:
      return 'PUTAWAY_COMPLETED';
    case WORK_TYPES.PICK:
      return 'PICK_COMPLETED';
    case WORK_TYPES.MOVE:
      return 'MOVE_COMPLETED';
    case WORK_TYPES.TRANSFER_PICK:
      return 'TRANSFER_PICK_COMPLETED';
    case WORK_TYPES.TRANSFER_PUT:
      return 'TRANSFER_PUT_COMPLETED';
    default:
      return 'WORK_COMPLETED';
  }
}

function calculatePriority(sourceModule, workType) {
  const basePriority = 50;
  const modulePriority = {
    M5: -10,
    M4: 0,
    M6: 10,
    MANUAL: 20,
  };
  const typePriority = {
    PICK: -5,
    PUTAWAY: 0,
    TRANSFER_PICK: 5,
    TRANSFER_PUT: 5,
    MOVE: 10,
  };
  
  return basePriority + (modulePriority[sourceModule] || 0) + (typePriority[workType] || 0);
}

module.exports = {
  calculateVariance,
  validateShortPick,
  validateActualQuantity,
  validateLocationForWorkType,
  validateDestinationLocation,
  validateSourceLocation,
  validateManagerOverride,
  validateSkipLine,
  validateCancelWork,
  getPostingRequestType,
  getTargetModuleForCallback,
  getCallbackEventType,
  calculatePriority,
};
