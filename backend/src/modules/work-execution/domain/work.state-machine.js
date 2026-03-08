/**
 * Module 7: Work Execution - State Machine
 * Defines valid state transitions for work headers and lines
 */

const { WORK_STATUS, WORK_LINE_STATUS, TRIGGER_ACTION } = require('./work.types');
const { InvalidStateTransitionError } = require('./work.errors');

const HEADER_TRANSITIONS = {
  [WORK_STATUS.OPEN]: {
    [TRIGGER_ACTION.START]: WORK_STATUS.IN_PROGRESS,
    [TRIGGER_ACTION.CANCEL]: WORK_STATUS.CANCELLED,
  },
  [WORK_STATUS.IN_PROGRESS]: {
    [TRIGGER_ACTION.COMPLETE]: WORK_STATUS.COMPLETED,
    [TRIGGER_ACTION.CANCEL]: WORK_STATUS.CANCELLED,
  },
  [WORK_STATUS.COMPLETED]: {},
  [WORK_STATUS.CANCELLED]: {},
};

const LINE_TRANSITIONS = {
  [WORK_LINE_STATUS.OPEN]: {
    [TRIGGER_ACTION.START]: WORK_LINE_STATUS.IN_PROGRESS,
    [TRIGGER_ACTION.CANCEL]: WORK_LINE_STATUS.CANCELLED,
  },
  [WORK_LINE_STATUS.IN_PROGRESS]: {
    [TRIGGER_ACTION.COMPLETE]: WORK_LINE_STATUS.COMPLETED,
    [TRIGGER_ACTION.SKIP]: WORK_LINE_STATUS.SKIPPED,
    [TRIGGER_ACTION.CANCEL]: WORK_LINE_STATUS.CANCELLED,
  },
  [WORK_LINE_STATUS.COMPLETED]: {},
  [WORK_LINE_STATUS.SKIPPED]: {},
  [WORK_LINE_STATUS.CANCELLED]: {},
};

const TERMINAL_HEADER_STATES = [WORK_STATUS.COMPLETED, WORK_STATUS.CANCELLED];
const TERMINAL_LINE_STATES = [WORK_LINE_STATUS.COMPLETED, WORK_LINE_STATUS.SKIPPED, WORK_LINE_STATUS.CANCELLED];

function canTransitionHeader(fromStatus, action) {
  const transitions = HEADER_TRANSITIONS[fromStatus];
  return transitions && transitions[action] !== undefined;
}

function canTransitionLine(fromStatus, action) {
  const transitions = LINE_TRANSITIONS[fromStatus];
  return transitions && transitions[action] !== undefined;
}

function getNextHeaderStatus(fromStatus, action) {
  const transitions = HEADER_TRANSITIONS[fromStatus];
  if (!transitions || transitions[action] === undefined) {
    return null;
  }
  return transitions[action];
}

function getNextLineStatus(fromStatus, action) {
  const transitions = LINE_TRANSITIONS[fromStatus];
  if (!transitions || transitions[action] === undefined) {
    return null;
  }
  return transitions[action];
}

function assertCanTransitionHeader(headerId, fromStatus, action) {
  if (!canTransitionHeader(fromStatus, action)) {
    throw new InvalidStateTransitionError('HEADER', headerId, fromStatus, null, action);
  }
}

function assertCanTransitionLine(lineId, fromStatus, action) {
  if (!canTransitionLine(fromStatus, action)) {
    throw new InvalidStateTransitionError('LINE', lineId, fromStatus, null, action);
  }
}

function isHeaderTerminal(status) {
  return TERMINAL_HEADER_STATES.includes(status);
}

function isLineTerminal(status) {
  return TERMINAL_LINE_STATES.includes(status);
}

function canClaim(header) {
  return header.status === WORK_STATUS.OPEN && !header.assignedTo;
}

function canRelease(header, userId) {
  return header.assignedTo === userId && header.status === WORK_STATUS.OPEN;
}

function canStart(header, userId) {
  return header.assignedTo === userId && header.status === WORK_STATUS.OPEN;
}

function canStartLine(header, line) {
  return header.status === WORK_STATUS.IN_PROGRESS && line.status === WORK_LINE_STATUS.OPEN;
}

function canCompleteLine(header, line) {
  return header.status === WORK_STATUS.IN_PROGRESS && line.status === WORK_LINE_STATUS.IN_PROGRESS;
}

function canSkipLine(header, line) {
  return header.status === WORK_STATUS.IN_PROGRESS && 
         (line.status === WORK_LINE_STATUS.OPEN || line.status === WORK_LINE_STATUS.IN_PROGRESS);
}

function canCancel(header) {
  return !isHeaderTerminal(header.status);
}

function shouldCompleteHeader(lines) {
  if (!lines || lines.length === 0) return false;
  return lines.every(line => isLineTerminal(line.status));
}

function hasAnyCompletedLine(lines) {
  return lines.some(line => line.status === WORK_LINE_STATUS.COMPLETED);
}

module.exports = {
  HEADER_TRANSITIONS,
  LINE_TRANSITIONS,
  TERMINAL_HEADER_STATES,
  TERMINAL_LINE_STATES,
  canTransitionHeader,
  canTransitionLine,
  getNextHeaderStatus,
  getNextLineStatus,
  assertCanTransitionHeader,
  assertCanTransitionLine,
  isHeaderTerminal,
  isLineTerminal,
  canClaim,
  canRelease,
  canStart,
  canStartLine,
  canCompleteLine,
  canSkipLine,
  canCancel,
  shouldCompleteHeader,
  hasAnyCompletedLine,
};
