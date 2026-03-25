/**
 * Module 4: Inbound Operations - State Machine
 * Quản lý tập trung các transition rules cho Receipt lifecycle
 *
 * Flow: NEW → CONFIRMED → AWAITING_WEIGHING → WEIGHING_1 → UNLOADING → UNLOADED → WEIGHING_2 → COMPLETED
 */

const RECEIPT_STATUS = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  AWAITING_WEIGHING: 'AWAITING_WEIGHING',
  WEIGHING_1: 'WEIGHING_1',
  UNLOADING: 'UNLOADING',
  UNLOADED: 'UNLOADED',
  WEIGHING_2: 'WEIGHING_2',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR',
};

const RECEIPT_ACTIONS = {
  CONFIRM: 'confirm',
  CREATE_WEIGH_TICKET: 'createWeighTicket',
  WEIGH_IN: 'weighIn',
  START_UNLOADING: 'startUnloading',
  COMPLETE_UNLOADING: 'completeUnloading',
  WEIGH_OUT: 'weighOut',
  AUTO_ACCEPT: 'autoAccept',
  AUTO_REJECT: 'autoReject',
  REWEIGH: 'reweigh',
  CANCEL: 'cancel',
  CLOSE: 'close',
};

const TRANSITION_MAP = {
  [RECEIPT_ACTIONS.CONFIRM]: {
    from: [RECEIPT_STATUS.NEW],
    to: RECEIPT_STATUS.CONFIRMED,
    sideEffects: ['generateReceiptNumber'],
  },
  [RECEIPT_ACTIONS.CREATE_WEIGH_TICKET]: {
    from: [RECEIPT_STATUS.CONFIRMED],
    to: RECEIPT_STATUS.AWAITING_WEIGHING,
    sideEffects: [],
  },
  [RECEIPT_ACTIONS.WEIGH_IN]: {
    from: [RECEIPT_STATUS.AWAITING_WEIGHING],
    to: RECEIPT_STATUS.WEIGHING_1,
    sideEffects: ['logWeighIn', 'updateGrossWeight'],
  },
  [RECEIPT_ACTIONS.START_UNLOADING]: {
    from: [RECEIPT_STATUS.WEIGHING_1],
    to: RECEIPT_STATUS.UNLOADING,
    sideEffects: [],
  },
  [RECEIPT_ACTIONS.COMPLETE_UNLOADING]: {
    from: [RECEIPT_STATUS.UNLOADING],
    to: RECEIPT_STATUS.UNLOADED,
    sideEffects: [],
  },
  [RECEIPT_ACTIONS.WEIGH_OUT]: {
    from: [RECEIPT_STATUS.UNLOADED],
    to: RECEIPT_STATUS.WEIGHING_2,
    sideEffects: ['logWeighOut', 'calculateNetWeight', 'checkTolerance'],
  },
  [RECEIPT_ACTIONS.AUTO_ACCEPT]: {
    from: [RECEIPT_STATUS.WEIGHING_2],
    to: RECEIPT_STATUS.COMPLETED,
    sideEffects: ['postInventory', 'captureBillingEvent'],
  },
  [RECEIPT_ACTIONS.AUTO_REJECT]: {
    from: [RECEIPT_STATUS.WEIGHING_2],
    to: RECEIPT_STATUS.REJECTED,
    sideEffects: ['logException'],
  },
  [RECEIPT_ACTIONS.REWEIGH]: {
    from: [RECEIPT_STATUS.REJECTED],
    to: RECEIPT_STATUS.CONFIRMED,
    sideEffects: ['incrementAttempt', 'resetWeights'],
  },
  [RECEIPT_ACTIONS.CANCEL]: {
    from: [
      RECEIPT_STATUS.NEW,
      RECEIPT_STATUS.CONFIRMED,
      RECEIPT_STATUS.AWAITING_WEIGHING,
      RECEIPT_STATUS.WEIGHING_1,
      RECEIPT_STATUS.UNLOADING,
    ],
    to: RECEIPT_STATUS.CANCELLED,
    sideEffects: ['logCancel'],
  },
  [RECEIPT_ACTIONS.CLOSE]: {
    from: [RECEIPT_STATUS.COMPLETED],
    to: RECEIPT_STATUS.CLOSED,
    sideEffects: [],
  },
};

const TERMINAL_STATES = [
  RECEIPT_STATUS.CLOSED,
  RECEIPT_STATUS.CANCELLED,
];

const CANCELLABLE_STATES = [
  RECEIPT_STATUS.NEW,
  RECEIPT_STATUS.CONFIRMED,
  RECEIPT_STATUS.AWAITING_WEIGHING,
  RECEIPT_STATUS.WEIGHING_1,
  RECEIPT_STATUS.UNLOADING,
];

const MAX_REWEIGH_ATTEMPTS = 3;

class ReceiptStateMachine {
  static canTransition(currentStatus, action) {
    const rule = TRANSITION_MAP[action];
    if (!rule) {
      return { allowed: false, reason: `Action không hợp lệ: ${action}` };
    }
    if (!rule.from.includes(currentStatus)) {
      return {
        allowed: false,
        reason: `Không thể thực hiện "${action}" từ trạng thái "${currentStatus}". Cần ở trạng thái: ${rule.from.join(', ')}`,
      };
    }
    return { allowed: true, toStatus: rule.to, sideEffects: rule.sideEffects };
  }

  static getTargetStatus(action) {
    const rule = TRANSITION_MAP[action];
    return rule ? rule.to : null;
  }

  static canCancel(currentStatus) {
    return CANCELLABLE_STATES.includes(currentStatus);
  }

  static isTerminal(status) {
    return TERMINAL_STATES.includes(status);
  }

  static canReweigh(currentStatus, attemptNumber) {
    if (currentStatus !== RECEIPT_STATUS.REJECTED) {
      return { allowed: false, reason: 'Chỉ có thể reweigh khi ở trạng thái REJECTED' };
    }
    if (attemptNumber >= MAX_REWEIGH_ATTEMPTS) {
      return { allowed: false, reason: `Đã vượt quá số lần reweigh cho phép (${MAX_REWEIGH_ATTEMPTS})` };
    }
    return { allowed: true };
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

  static canPostInventory(status) {
    return status === RECEIPT_STATUS.COMPLETED;
  }
}

module.exports = {
  RECEIPT_STATUS,
  RECEIPT_ACTIONS,
  TRANSITION_MAP,
  TERMINAL_STATES,
  CANCELLABLE_STATES,
  MAX_REWEIGH_ATTEMPTS,
  ReceiptStateMachine,
};
