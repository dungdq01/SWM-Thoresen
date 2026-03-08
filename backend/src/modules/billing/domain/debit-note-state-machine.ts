/**
 * Module 10: Billing & Commercial Control - Debit Note State Machine
 * 
 * State transitions:
 *   DRAFT -> REVIEWED -> APPROVED -> LOCKED
 *   
 * Regenerate allowed: DRAFT, REVIEWED, APPROVED (not LOCKED)
 */

import { BilDebitNoteStatus, BilDnActionCode } from './billing.enums';
import { createBillingError } from './billing.errors';

export interface StateTransition {
  from: BilDebitNoteStatus;
  to: BilDebitNoteStatus;
  action: BilDnActionCode;
}

const VALID_TRANSITIONS: StateTransition[] = [
  { from: BilDebitNoteStatus.DRAFT, to: BilDebitNoteStatus.REVIEWED, action: BilDnActionCode.REVIEWED },
  { from: BilDebitNoteStatus.REVIEWED, to: BilDebitNoteStatus.APPROVED, action: BilDnActionCode.APPROVED },
  { from: BilDebitNoteStatus.APPROVED, to: BilDebitNoteStatus.LOCKED, action: BilDnActionCode.LOCKED },
];

const REGENERATE_ALLOWED_STATUSES = [
  BilDebitNoteStatus.DRAFT,
  BilDebitNoteStatus.REVIEWED,
  BilDebitNoteStatus.APPROVED,
];

export class DebitNoteStateMachine {
  /**
   * Validate if a state transition is allowed
   */
  static canTransition(from: BilDebitNoteStatus, to: BilDebitNoteStatus): boolean {
    return VALID_TRANSITIONS.some(t => t.from === from && t.to === to);
  }

  /**
   * Get the action code for a transition
   */
  static getActionForTransition(from: BilDebitNoteStatus, to: BilDebitNoteStatus): BilDnActionCode | null {
    const transition = VALID_TRANSITIONS.find(t => t.from === from && t.to === to);
    return transition?.action ?? null;
  }

  /**
   * Validate and return next status or throw error
   */
  static validateTransition(currentStatus: BilDebitNoteStatus, targetStatus: BilDebitNoteStatus): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw createBillingError('DN_INVALID_STATE', {
        currentStatus,
        targetStatus,
        message: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      });
    }
  }

  /**
   * Check if regenerate is allowed for current status
   */
  static canRegenerate(status: BilDebitNoteStatus): boolean {
    return REGENERATE_ALLOWED_STATUSES.includes(status);
  }

  /**
   * Validate regenerate is allowed or throw error
   */
  static validateRegenerate(status: BilDebitNoteStatus): void {
    if (!this.canRegenerate(status)) {
      throw createBillingError('DN_LOCKED_IMMUTABLE', {
        currentStatus: status,
        message: 'Cannot regenerate a locked debit note',
      });
    }
  }

  /**
   * Check if debit note is locked (immutable)
   */
  static isLocked(status: BilDebitNoteStatus): boolean {
    return status === BilDebitNoteStatus.LOCKED;
  }

  /**
   * Validate modification is allowed (not locked)
   */
  static validateModifiable(status: BilDebitNoteStatus): void {
    if (this.isLocked(status)) {
      throw createBillingError('DN_LOCKED_IMMUTABLE', {
        currentStatus: status,
      });
    }
  }

  /**
   * Get available next statuses from current status
   */
  static getAvailableTransitions(currentStatus: BilDebitNoteStatus): BilDebitNoteStatus[] {
    return VALID_TRANSITIONS
      .filter(t => t.from === currentStatus)
      .map(t => t.to);
  }
}
