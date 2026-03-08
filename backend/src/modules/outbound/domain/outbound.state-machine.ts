/**
 * Outbound State Machine - Domain Layer
 * Defines state transitions for shipment lifecycle
 */

export enum ShipmentStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  ALLOCATED = 'ALLOCATED',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  WEIGHING_TARE = 'WEIGHING_TARE',
  LOADING = 'LOADING',
  ALL_WEIGHED = 'ALL_WEIGHED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SHIPPED = 'SHIPPED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentLineStatus {
  PENDING = 'PENDING',
  ALLOCATED = 'ALLOCATED',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  LOADING = 'LOADING',
  WEIGHED_PASS = 'WEIGHED_PASS',
  WEIGHED_FAIL = 'WEIGHED_FAIL',
  LINE_SHIPPED = 'LINE_SHIPPED',
  CANCELLED = 'CANCELLED',
}

export interface StateTransition {
  from: ShipmentStatus;
  to: ShipmentStatus;
  action: string;
  guard?: (context: TransitionContext) => boolean;
}

export interface TransitionContext {
  shipmentId: string;
  userId?: string;
  allLinesAllocated?: boolean;
  allLinesPicked?: boolean;
  hasTare?: boolean;
  allLinesWeighed?: boolean;
  allLinesPassed?: boolean;
  pendingApprovalCount?: number;
  hasOpenExceptions?: boolean;
}

export const SHIPMENT_TRANSITIONS: StateTransition[] = [
  { from: ShipmentStatus.DRAFT, to: ShipmentStatus.CONFIRMED, action: 'CONFIRM' },
  { from: ShipmentStatus.DRAFT, to: ShipmentStatus.CANCELLED, action: 'CANCEL' },
  { from: ShipmentStatus.CONFIRMED, to: ShipmentStatus.ALLOCATED, action: 'ALLOCATE' },
  { from: ShipmentStatus.CONFIRMED, to: ShipmentStatus.CANCELLED, action: 'CANCEL' },
  { from: ShipmentStatus.ALLOCATED, to: ShipmentStatus.PICKING, action: 'START_PICK' },
  { from: ShipmentStatus.ALLOCATED, to: ShipmentStatus.CONFIRMED, action: 'UNALLOCATE' },
  { from: ShipmentStatus.ALLOCATED, to: ShipmentStatus.CANCELLED, action: 'CANCEL' },
  { from: ShipmentStatus.PICKING, to: ShipmentStatus.PICKED, action: 'COMPLETE_PICK' },
  { from: ShipmentStatus.PICKING, to: ShipmentStatus.ALLOCATED, action: 'SHORT_PICK' },
  { from: ShipmentStatus.PICKED, to: ShipmentStatus.WEIGHING_TARE, action: 'RECORD_TARE' },
  { from: ShipmentStatus.WEIGHING_TARE, to: ShipmentStatus.LOADING, action: 'START_LOAD' },
  { from: ShipmentStatus.LOADING, to: ShipmentStatus.ALL_WEIGHED, action: 'ALL_WEIGHED' },
  { from: ShipmentStatus.LOADING, to: ShipmentStatus.PENDING_APPROVAL, action: 'TOLERANCE_FAIL' },
  { from: ShipmentStatus.ALL_WEIGHED, to: ShipmentStatus.SHIPPED, action: 'SHIP' },
  { from: ShipmentStatus.ALL_WEIGHED, to: ShipmentStatus.PENDING_APPROVAL, action: 'TOLERANCE_FAIL' },
  { from: ShipmentStatus.PENDING_APPROVAL, to: ShipmentStatus.ALL_WEIGHED, action: 'APPROVE' },
  { from: ShipmentStatus.PENDING_APPROVAL, to: ShipmentStatus.LOADING, action: 'REWEIGH' },
  { from: ShipmentStatus.PENDING_APPROVAL, to: ShipmentStatus.CANCELLED, action: 'REJECT' },
  { from: ShipmentStatus.SHIPPED, to: ShipmentStatus.CLOSED, action: 'CLOSE' },
];

export const LINE_TRANSITIONS = [
  { from: ShipmentLineStatus.PENDING, to: ShipmentLineStatus.ALLOCATED, action: 'ALLOCATE' },
  { from: ShipmentLineStatus.ALLOCATED, to: ShipmentLineStatus.PENDING, action: 'UNALLOCATE' },
  { from: ShipmentLineStatus.ALLOCATED, to: ShipmentLineStatus.PICKING, action: 'START_PICK' },
  { from: ShipmentLineStatus.PICKING, to: ShipmentLineStatus.PICKED, action: 'COMPLETE_PICK' },
  { from: ShipmentLineStatus.PICKED, to: ShipmentLineStatus.LOADING, action: 'START_LOAD' },
  { from: ShipmentLineStatus.LOADING, to: ShipmentLineStatus.WEIGHED_PASS, action: 'WEIGH_PASS' },
  { from: ShipmentLineStatus.LOADING, to: ShipmentLineStatus.WEIGHED_FAIL, action: 'WEIGH_FAIL' },
  { from: ShipmentLineStatus.WEIGHED_FAIL, to: ShipmentLineStatus.WEIGHED_PASS, action: 'APPROVE' },
  { from: ShipmentLineStatus.WEIGHED_FAIL, to: ShipmentLineStatus.LOADING, action: 'REWEIGH' },
  { from: ShipmentLineStatus.WEIGHED_PASS, to: ShipmentLineStatus.LINE_SHIPPED, action: 'SHIP' },
];

export function canTransition(current: ShipmentStatus, action: string): boolean {
  return SHIPMENT_TRANSITIONS.some((t) => t.from === current && t.action === action);
}

export function getNextStatus(current: ShipmentStatus, action: string): ShipmentStatus | null {
  const transition = SHIPMENT_TRANSITIONS.find((t) => t.from === current && t.action === action);
  return transition?.to || null;
}

export function getAvailableActions(current: ShipmentStatus): string[] {
  return SHIPMENT_TRANSITIONS.filter((t) => t.from === current).map((t) => t.action);
}

export function isTerminalState(status: ShipmentStatus): boolean {
  return status === ShipmentStatus.CLOSED || status === ShipmentStatus.CANCELLED;
}

export function canCancel(status: ShipmentStatus): boolean {
  const cancelableStates = [
    ShipmentStatus.DRAFT,
    ShipmentStatus.CONFIRMED,
    ShipmentStatus.ALLOCATED,
  ];
  return cancelableStates.includes(status);
}

export function canReverse(status: ShipmentStatus): boolean {
  return status === ShipmentStatus.SHIPPED;
}
