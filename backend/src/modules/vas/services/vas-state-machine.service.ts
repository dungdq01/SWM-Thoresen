import { Injectable } from '@nestjs/common';
import { VasWoStatus, VasStateAction } from '../domain/vas.enums';
import { VasInvalidStateError } from '../domain/vas.errors';

interface StateTransition {
  from: VasWoStatus[];
  to: VasWoStatus;
  action: VasStateAction;
}

const TRANSITIONS: StateTransition[] = [
  { from: [VasWoStatus.DRAFT], to: VasWoStatus.CONFIRMED, action: VasStateAction.CONFIRM },
  { from: [VasWoStatus.CONFIRMED], to: VasWoStatus.IN_PROGRESS, action: VasStateAction.START },
  { from: [VasWoStatus.IN_PROGRESS], to: VasWoStatus.IN_PROGRESS, action: VasStateAction.ADD_SESSION },
  { from: [VasWoStatus.IN_PROGRESS], to: VasWoStatus.COMPLETED, action: VasStateAction.COMPLETE },
  { from: [VasWoStatus.DRAFT], to: VasWoStatus.CANCELLED, action: VasStateAction.CANCEL },
  { from: [VasWoStatus.CONFIRMED], to: VasWoStatus.CANCELLED, action: VasStateAction.CANCEL },
  { from: [VasWoStatus.IN_PROGRESS], to: VasWoStatus.CANCELLED, action: VasStateAction.CANCEL },
];

@Injectable()
export class VasStateMachineService {
  assertCanConfirm(currentStatus: string): void {
    this.assertTransition(currentStatus, VasStateAction.CONFIRM);
  }

  assertCanStart(currentStatus: string): void {
    this.assertTransition(currentStatus, VasStateAction.START);
  }

  assertCanAddSession(currentStatus: string): void {
    const allowedStatuses = [VasWoStatus.CONFIRMED, VasWoStatus.IN_PROGRESS];
    if (!allowedStatuses.includes(currentStatus as VasWoStatus)) {
      throw new VasInvalidStateError(currentStatus, allowedStatuses);
    }
  }

  assertCanComplete(currentStatus: string): void {
    this.assertTransition(currentStatus, VasStateAction.COMPLETE);
  }

  assertCanCancel(currentStatus: string): void {
    this.assertTransition(currentStatus, VasStateAction.CANCEL);
  }

  assertCanUpdate(currentStatus: string): void {
    if (currentStatus !== VasWoStatus.DRAFT) {
      throw new VasInvalidStateError(currentStatus, [VasWoStatus.DRAFT]);
    }
  }

  getNextStatus(currentStatus: string, action: VasStateAction): VasWoStatus {
    const transition = TRANSITIONS.find(
      (t) => t.from.includes(currentStatus as VasWoStatus) && t.action === action,
    );

    if (!transition) {
      throw new VasInvalidStateError(
        currentStatus,
        TRANSITIONS.filter((t) => t.action === action).flatMap((t) => t.from),
      );
    }

    return transition.to;
  }

  isTerminalState(status: string): boolean {
    return status === VasWoStatus.COMPLETED || status === VasWoStatus.CANCELLED;
  }

  private assertTransition(currentStatus: string, action: VasStateAction): void {
    const validTransitions = TRANSITIONS.filter(
      (t) => t.action === action && t.from.includes(currentStatus as VasWoStatus),
    );

    if (validTransitions.length === 0) {
      const allowedFrom = TRANSITIONS.filter((t) => t.action === action).flatMap((t) => t.from);
      throw new VasInvalidStateError(currentStatus, allowedFrom);
    }
  }
}
