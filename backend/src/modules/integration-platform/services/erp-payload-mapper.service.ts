import { Injectable, Logger } from '@nestjs/common';

export interface DebitNotePayload {
  debitNoteNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  issueDate: string;
  dueDate: string;
}

export interface ErpDebitNoteRequest {
  documentType: string;
  documentNumber: string;
  businessPartnerId: string;
  businessPartnerName: string;
  totalAmount: number;
  currencyCode: string;
  lines: Array<{
    lineNumber: number;
    itemDescription: string;
    qty: number;
    price: number;
    lineAmount: number;
  }>;
  documentDate: string;
  paymentDueDate: string;
  sourceSystem: string;
  correlationId: string;
}

@Injectable()
export class ErpPayloadMapperService {
  private readonly logger = new Logger(ErpPayloadMapperService.name);

  mapDebitNoteToErp(payload: DebitNotePayload, correlationId: string): ErpDebitNoteRequest {
    return {
      documentType: 'DEBIT_NOTE',
      documentNumber: payload.debitNoteNumber,
      businessPartnerId: payload.customerId,
      businessPartnerName: payload.customerName,
      totalAmount: payload.amount,
      currencyCode: payload.currency,
      lines: payload.lineItems.map((item, index) => ({
        lineNumber: index + 1,
        itemDescription: item.description,
        qty: item.quantity,
        price: item.unitPrice,
        lineAmount: item.amount,
      })),
      documentDate: payload.issueDate,
      paymentDueDate: payload.dueDate,
      sourceSystem: 'SWM',
      correlationId,
    };
  }

  validateDebitNotePayload(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.debitNoteNumber) errors.push('debitNoteNumber is required');
    if (!payload.customerId) errors.push('customerId is required');
    if (typeof payload.amount !== 'number') errors.push('amount must be a number');
    if (!payload.currency) errors.push('currency is required');
    if (!Array.isArray(payload.lineItems)) errors.push('lineItems must be an array');
    if (!payload.issueDate) errors.push('issueDate is required');
    if (!payload.dueDate) errors.push('dueDate is required');

    return { valid: errors.length === 0, errors };
  }
}
