/**
 * Module 4: Inbound Operations - State Machine
 * Quản lý tập trung các transition rules cho Receipt lifecycle
 */

const RECEIPT_STATUS = {
  DRAFT: 'DRAFT',
  AWAITING_WEIGHING: 'AWAITING_WEIGHING',
  WEIGHED_IN: 'WEIGHED_IN',
  PROCESSING: 'PROCESSING',
  WEIGHED_OUT: 'WEIGHED_OUT',
  RECEIVED: 'RECEIVED',
  PUTAWAY: 'PUTAWAY',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

const RECEIPT_ACTIONS = {
  CONFIRM: 'confirm',
  WEIGH_IN: 'weighIn',
  START_PROCESSING: 'startProcessing',
  WEIGH_OUT: 'weighOut',
  AUTO_ACCEPT: 'autoAccept',
  AUTO_REJECT: 'autoReject',
  REWEIGH: 'reweigh',
  CANCEL: 'cancel',
  PUTAWAY_COMPLETE: 'putawayComplete',
  CLOSE: 'close',
};

const TRANSITION_MAP = {
  [RECEIPT_ACTIONS.CONFIRM]: {
    from: [RECEIPT_STATUS.DRAFT],
    to: RECEIPT_STATUS.AWAITING_WEIGHING,
    sideEffects: ['generateReceiptNumber'],
  },
  [RECEIPT_ACTIONS.WEIGH_IN]: {
    from: [RECEIPT_STATUS.AWAITING_WEIGHING],
    to: RECEIPT_STATUS.WEIGHED_IN,
    sideEffects: ['logWeighIn', 'updateGrossWeight'],
  },
  [RECEIPT_ACTIONS.START_PROCESSING]: {
    from: [RECEIPT_STATUS.WEIGHED_IN],
    to: RECEIPT_STATUS.PROCESSING,
    sideEffects: [],
  },
  [RECEIPT_ACTIONS.WEIGH_OUT]: {
    from: [RECEIPT_STATUS.PROCESSING],
    to: RECEIPT_STATUS.WEIGHED_OUT,
    sideEffects: ['logWeighOut', 'calculateNetWeight', 'checkTolerance'],
  },
  [RECEIPT_ACTIONS.AUTO_ACCEPT]: {
    from: [RECEIPT_STATUS.WEIGHED_OUT],
    to: RECEIPT_STATUS.RECEIVED,
    sideEffects: ['postInventory', 'createPutawayWork', 'captureBillingEvent'],
  },
  [RECEIPT_ACTIONS.AUTO_REJECT]: {
    from: [RECEIPT_STATUS.WEIGHED_OUT],
    to: RECEIPT_STATUS.REJECTED,
    sideEffects: ['logException'],
  },
  [RECEIPT_ACTIONS.REWEIGH]: {
    from: [RECEIPT_STATUS.REJECTED],
    to: RECEIPT_STATUS.AWAITING_WEIGHING,
    sideEffects: ['incrementAttempt', 'resetWeights'],
  },
  [RECEIPT_ACTIONS.CANCEL]: {
    from: [
      RECEIPT_STATUS.DRAFT,
      RECEIPT_STATUS.AWAITING_WEIGHING,
      RECEIPT_STATUS.WEIGHED_IN,
      RECEIPT_STATUS.PROCESSING,
    ],
    to: RECEIPT_STATUS.CANCELLED,
    sideEffects: ['logCancel'],
  },
  [RECEIPT_ACTIONS.PUTAWAY_COMPLETE]: {
    from: [RECEIPT_STATUS.RECEIVED],
    to: RECEIPT_STATUS.PUTAWAY,
    sideEffects: ['updateWorkId'],
  },
  [RECEIPT_ACTIONS.CLOSE]: {
    from: [RECEIPT_STATUS.PUTAWAY],
    to: RECEIPT_STATUS.CLOSED,
    sideEffects: [],
  },
};

const TERMINAL_STATES = [
  RECEIPT_STATUS.CLOSED,
  RECEIPT_STATUS.CANCELLED,
];

const CANCELLABLE_STATES = [
  RECEIPT_STATUS.DRAFT,
  RECEIPT_STATUS.AWAITING_WEIGHING,
  RECEIPT_STATUS.WEIGHED_IN,
  RECEIPT_STATUS.PROCESSING,
];

const MAX_REWEIGH_ATTEMPTS = 3;

class ReceiptStateMachine {
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
        reason: `Không thể thực hiện "${action}" từ trạng thái "${currentStatus}". Cần ở trạng thái: ${rule.from.join(', ')}`,
      };
    }
    return { allowed: true, toStatus: rule.to, sideEffects: rule.sideEffects };
  }

  /**
   * Lấy trạng thái đích của transition
   */
  static getTargetStatus(action) {
    const rule = TRANSITION_MAP[action];
    return rule ? rule.to : null;
  }

  /**
   * Kiểm tra có thể cancel không
   */
  static canCancel(currentStatus) {
    return CANCELLABLE_STATES.includes(currentStatus);
  }

  /**
   * Kiểm tra có phải terminal state không
   */
  static isTerminal(status) {
    return TERMINAL_STATES.includes(status);
  }

  /**
   * Kiểm tra có thể reweigh không
   */
  static canReweigh(currentStatus, attemptNumber) {
    if (currentStatus !== RECEIPT_STATUS.REJECTED) {
      return { allowed: false, reason: 'Chỉ có thể reweigh khi ở trạng thái REJECTED' };
    }
    if (attemptNumber >= MAX_REWEIGH_ATTEMPTS) {
      return { allowed: false, reason: `Đã vượt quá số lần reweigh cho phép (${MAX_REWEIGH_ATTEMPTS})` };
    }
    return { allowed: true };
  }

  /**
   * Lấy danh sách actions có thể thực hiện từ status hiện tại
   */
  static getAvailableActions(currentStatus) {
    const actions = [];
    for (const [action, rule] of Object.entries(TRANSITION_MAP)) {
      if (rule.from.includes(currentStatus)) {
        actions.push(action);
      }
    }
    return actions;
  }

  /**
   * Validate business state trước khi post inventory
   */
  static canPostInventory(status) {
    return status === RECEIPT_STATUS.RECEIVED;
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
