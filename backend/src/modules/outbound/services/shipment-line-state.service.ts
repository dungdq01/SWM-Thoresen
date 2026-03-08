import { Injectable, BadRequestException } from '@nestjs/common';

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

export interface LineStateTransition {
  from: ShipmentLineStatus;
  to: ShipmentLineStatus;
  action: string;
}

const LINE_TRANSITIONS: LineStateTransition[] = [
  { from: ShipmentLineStatus.PENDING, to: ShipmentLineStatus.ALLOCATED, action: 'ALLOCATE' },
  { from: ShipmentLineStatus.PENDING, to: ShipmentLineStatus.CANCELLED, action: 'CANCEL' },
  { from: ShipmentLineStatus.ALLOCATED, to: ShipmentLineStatus.PICKING, action: 'START_PICK' },
  { from: ShipmentLineStatus.ALLOCATED, to: ShipmentLineStatus.PENDING, action: 'UNALLOCATE' },
  { from: ShipmentLineStatus.ALLOCATED, to: ShipmentLineStatus.CANCELLED, action: 'CANCEL' },
  { from: ShipmentLineStatus.PICKING, to: ShipmentLineStatus.PICKED, action: 'COMPLETE_PICK' },
  { from: ShipmentLineStatus.PICKING, to: ShipmentLineStatus.ALLOCATED, action: 'SHORT_PICK' },
  { from: ShipmentLineStatus.PICKED, to: ShipmentLineStatus.LOADING, action: 'START_LOAD' },
  { from: ShipmentLineStatus.LOADING, to: ShipmentLineStatus.WEIGHED_PASS, action: 'WEIGH_PASS' },
  { from: ShipmentLineStatus.LOADING, to: ShipmentLineStatus.WEIGHED_FAIL, action: 'WEIGH_FAIL' },
  { from: ShipmentLineStatus.WEIGHED_PASS, to: ShipmentLineStatus.LINE_SHIPPED, action: 'SHIP' },
  { from: ShipmentLineStatus.WEIGHED_FAIL, to: ShipmentLineStatus.WEIGHED_PASS, action: 'APPROVE' },
  { from: ShipmentLineStatus.WEIGHED_FAIL, to: ShipmentLineStatus.LOADING, action: 'REWEIGH' },
  { from: ShipmentLineStatus.WEIGHED_FAIL, to: ShipmentLineStatus.CANCELLED, action: 'REJECT' },
];

@Injectable()
export class ShipmentLineStateService {
  canTransition(currentStatus: ShipmentLineStatus, action: string): boolean {
    return LINE_TRANSITIONS.some(
      (t) => t.from === currentStatus && t.action === action,
    );
  }

  getNextStatus(currentStatus: ShipmentLineStatus, action: string): ShipmentLineStatus | null {
    const transition = LINE_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.action === action,
    );
    return transition?.to || null;
  }

  validateTransition(
    currentStatus: ShipmentLineStatus,
    action: string,
  ): { valid: boolean; nextStatus: ShipmentLineStatus | null; error?: string } {
    const transition = LINE_TRANSITIONS.find(
      (t) => t.from === currentStatus && t.action === action,
    );

    if (!transition) {
      return {
        valid: false,
        nextStatus: null,
        error: `Invalid line transition: ${action} from ${currentStatus}`,
      };
    }

    return { valid: true, nextStatus: transition.to };
  }

  assertCanTransition(currentStatus: ShipmentLineStatus, action: string): void {
    if (!this.canTransition(currentStatus, action)) {
      throw new BadRequestException(
        `Cannot perform ${action} on line in ${currentStatus} status`,
      );
    }
  }

  getAvailableActions(currentStatus: ShipmentLineStatus): string[] {
    return LINE_TRANSITIONS
      .filter((t) => t.from === currentStatus)
      .map((t) => t.action);
  }

  isTerminalState(status: ShipmentLineStatus): boolean {
    return (
      status === ShipmentLineStatus.LINE_SHIPPED ||
      status === ShipmentLineStatus.CANCELLED
    );
  }

  isWeighedState(status: ShipmentLineStatus): boolean {
    return (
      status === ShipmentLineStatus.WEIGHED_PASS ||
      status === ShipmentLineStatus.WEIGHED_FAIL ||
      status === ShipmentLineStatus.LINE_SHIPPED
    );
  }

  requiresApproval(status: ShipmentLineStatus): boolean {
    return status === ShipmentLineStatus.WEIGHED_FAIL;
  }
}
