/**
 * Sales Orders Module - State Machine
 * Quản lý tập trung các transition rules cho SO lifecycle
 * Reference: PRD Section 7.1
 */

const SO_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_RELEASED: 'PARTIALLY_RELEASED',
  FULLY_RELEASED: 'FULLY_RELEASED',
  SHIPPED: 'SHIPPED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

const SO_LINE_STATUS = {
  OPEN: 'OPEN',
  PARTIALLY_RELEASED: 'PARTIALLY_RELEASED',
  FULLY_RELEASED: 'FULLY_RELEASED',
  SHIPPED: 'SHIPPED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

const SO_ACTIONS = {
  CONFIRM: 'CONFIRM',
  CANCEL: 'CANCEL',
  RELEASE_SHIPMENT: 'RELEASE_SHIPMENT',
  SHIP_COMPLETE: 'SHIP_COMPLETE',
  CLOSE: 'CLOSE',
  ROLLBACK_RELEASE: 'ROLLBACK_RELEASE',
};

const TRANSITION_MAP = {
  [SO_ACTIONS.CONFIRM]: {
    from: [SO_STATUS.DRAFT],
    to: SO_STATUS.CONFIRMED,
  },
  [SO_ACTIONS.CANCEL]: {
    from: [SO_STATUS.DRAFT, SO_STATUS.CONFIRMED],
    to: SO_STATUS.CANCELLED,
  },
  [SO_ACTIONS.RELEASE_SHIPMENT]: {
    from: [SO_STATUS.CONFIRMED, SO_STATUS.PARTIALLY_RELEASED, SO_STATUS.FULLY_RELEASED],
    to: null, // Dynamic: PARTIALLY_RELEASED or FULLY_RELEASED
  },
  [SO_ACTIONS.SHIP_COMPLETE]: {
    from: [SO_STATUS.PARTIALLY_RELEASED, SO_STATUS.FULLY_RELEASED],
    to: SO_STATUS.SHIPPED,
  },
  [SO_ACTIONS.CLOSE]: {
    from: [SO_STATUS.SHIPPED],
    to: SO_STATUS.CLOSED,
  },
  [SO_ACTIONS.ROLLBACK_RELEASE]: {
    from: [SO_STATUS.PARTIALLY_RELEASED, SO_STATUS.FULLY_RELEASED],
    to: null, // Dynamic: back to CONFIRMED or PARTIALLY_RELEASED
  },
};

const TERMINAL_STATES = [SO_STATUS.CLOSED, SO_STATUS.CANCELLED];

const CANCELLABLE_STATES = [SO_STATUS.DRAFT, SO_STATUS.CONFIRMED];

const RELEASABLE_STATES = [SO_STATUS.CONFIRMED, SO_STATUS.PARTIALLY_RELEASED, SO_STATUS.FULLY_RELEASED];

class SalesOrderStateMachine {
  /**
   * Kiểm tra transition có được phép không
   */
  static canTransition(currentStatus, action) {
    const rule = TRANSITION_MAP[action];
    if (!rule) {
      return { allowed: false, reason: `Action không hợp lệ: ${action}` };
    }
    if (!rule.from.includes(currentStatus)) {
      return {
        allowed: false,
        reason: `Không thể thực hiện "${action}" từ trạng thái "${currentStatus}". Cần ở: ${rule.from.join(', ')}`,
      };
    }
    return { allowed: true, toStatus: rule.to };
  }

  /**
   * Tính SO status sau khi release shipment
   * Based on total released vs total expected per line
   */
  static computeStatusAfterRelease(totalExpectedQtyKg, totalReleasedQtyKg) {
    if (totalReleasedQtyKg >= totalExpectedQtyKg) {
      return SO_STATUS.FULLY_RELEASED;
    }
    return SO_STATUS.PARTIALLY_RELEASED;
  }

  /**
   * Tính SO line status sau khi release
   */
  static computeLineStatusAfterRelease(expectedQtyKg, releasedQtyKg) {
    if (releasedQtyKg >= expectedQtyKg) {
      return SO_LINE_STATUS.FULLY_RELEASED;
    }
    if (releasedQtyKg > 0) {
      return SO_LINE_STATUS.PARTIALLY_RELEASED;
    }
    return SO_LINE_STATUS.OPEN;
  }

  /**
   * Tính SO status sau khi rollback release (shipment cancelled)
   */
  static computeStatusAfterRollback(totalExpectedQtyKg, totalReleasedQtyKg) {
    if (totalReleasedQtyKg <= 0) {
      return SO_STATUS.CONFIRMED;
    }
    if (totalReleasedQtyKg >= totalExpectedQtyKg) {
      return SO_STATUS.FULLY_RELEASED;
    }
    return SO_STATUS.PARTIALLY_RELEASED;
  }

  static canCancel(currentStatus) {
    return CANCELLABLE_STATES.includes(currentStatus);
  }

  static canRelease(currentStatus) {
    return RELEASABLE_STATES.includes(currentStatus);
  }

  static isTerminal(status) {
    return TERMINAL_STATES.includes(status);
  }

  static getAvailableActions(currentStatus) {
    const actions = [];
    for (const [action, rule] of Object.entries(TRANSITION_MAP)) {
      if (rule.from.includes(currentStatus)) {
        actions.push(action);
      }
    }
    return actions;
  }
}

module.exports = {
  SO_STATUS,
  SO_LINE_STATUS,
  SO_ACTIONS,
  TRANSITION_MAP,
  TERMINAL_STATES,
  CANCELLABLE_STATES,
  RELEASABLE_STATES,
  SalesOrderStateMachine,
};
