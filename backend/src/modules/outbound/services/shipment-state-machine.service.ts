import { Injectable, BadRequestException } from '@nestjs/common';

export enum ShipmentStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  SHIPPED = 'SHIPPED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export interface StateTransition {
  from: ShipmentStatus;
  to: ShipmentStatus;
  action: string;
}

/**
 * Simplified Outbound State Machine:
 *
 * DRAFT → CONFIRMED → LOADING → LOADED → SHIPPED → CLOSED
 *   ↓        ↓
 * CANCELLED  CANCELLED
 *
 * Loading flow:
 * - CONFIRMED + START_LOADING → LOADING (cân tare xe rỗng)
 * - LOADING + LOAD_ITEM → LOADING (xếp từng item, cân sau mỗi item)
 * - LOADING + COMPLETE_LOADING → LOADED (xếp xong tất cả)
 * - LOADED + SHIP → SHIPPED
 */
const SHIPMENT_TRANSITIONS: StateTransition[] = [
  // Create & Confirm
  { from: ShipmentStatus.DRAFT, to: ShipmentStatus.CONFIRMED, action: 'CONFIRM' },
  { from: ShipmentStatus.DRAFT, to: ShipmentStatus.CANCELLED, action: 'CANCEL' },

  // Loading
  { from: ShipmentStatus.CONFIRMED, to: ShipmentStatus.LOADING, action: 'START_LOADING' },
  { from: ShipmentStatus.CONFIRMED, to: ShipmentStatus.CANCELLED, action: 'CANCEL' },
  { from: ShipmentStatus.LOADING, to: ShipmentStatus.LOADED, action: 'COMPLETE_LOADING' },
  { from: ShipmentStatus.LOADING, to: ShipmentStatus.CANCELLED, action: 'CANCEL' },

  // Ship & Close
  { from: ShipmentStatus.LOADED, to: ShipmentStatus.SHIPPED, action: 'SHIP' },
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
      ShipmentStatus.LOADING,
    ];
    return cancelableStates.includes(status);
  }
}
