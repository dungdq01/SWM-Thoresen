import { Injectable, BadRequestException } from '@nestjs/common';

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

const SHIPMENT_TRANSITIONS: StateTransition[] = [
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

@Injectable()
export class ShipmentStateMachineService {
  canTransition(currentStatus: ShipmentStatus, action: string): boolean {
    return SHIPMENT_TRANSITIONS.some(
      (t) => t.from === currentStatus && t.action === action,
    );
  }

  getNextStatus(currentStatus: ShipmentStatus, action: string): ShipmentStatus | null {
    const transition = SHIPMENT_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.action === action,
    );
    return transition?.to || null;
  }

  validateTransition(
    currentStatus: ShipmentStatus,
    action: string,
    context?: TransitionContext,
  ): { valid: boolean; nextStatus: ShipmentStatus | null; error?: string } {
    const transition = SHIPMENT_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.action === action,
    );

    if (!transition) {
      return {
        valid: false,
        nextStatus: null,
        error: `Invalid transition: ${action} from ${currentStatus}`,
      };
    }

    if (transition.guard && context && !transition.guard(context)) {
      return {
        valid: false,
        nextStatus: null,
        error: `Guard condition not met for ${action}`,
      };
    }

    return { valid: true, nextStatus: transition.to };
  }

  assertCanTransition(currentStatus: ShipmentStatus, action: string): void {
    if (!this.canTransition(currentStatus, action)) {
      throw new BadRequestException(
        `Cannot perform ${action} when shipment is in ${currentStatus} status`,
      );
    }
  }

  getAvailableActions(currentStatus: ShipmentStatus): string[] {
    return SHIPMENT_TRANSITIONS
      .filter((t) => t.from === currentStatus)
      .map((t) => t.action);
  }

  isTerminalState(status: ShipmentStatus): boolean {
    return status === ShipmentStatus.CLOSED || status === ShipmentStatus.CANCELLED;
  }

  canCancel(status: ShipmentStatus): boolean {
    const cancelableStates = [
      ShipmentStatus.DRAFT,
      ShipmentStatus.CONFIRMED,
      ShipmentStatus.ALLOCATED,
    ];
    return cancelableStates.includes(status);
  }

  canReverse(status: ShipmentStatus): boolean {
    return status === ShipmentStatus.SHIPPED;
  }
}
