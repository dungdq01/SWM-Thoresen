/**
 * Module 4: Inbound Operations
 * Entry point for module exports
 */

const { InboundController } = require('./inbound.controller');
const { createInboundRoutes, PERMISSION_CODES } = require('./inbound.routes');
const { ReceiptService } = require('./application/receipt.service');
const { ReceiptRepository } = require('./infra/receipt.repository');
const { ReceiptWeighingRepository } = require('./infra/receipt-weighing.repository');
const { ReceiptStatusHistoryRepository } = require('./infra/receipt-status-history.repository');
const { ReceiptStateMachine, RECEIPT_STATUS, RECEIPT_ACTIONS } = require('./domain/inbound.state-machine');
const { TolerancePolicy, CancelPolicy, WeightValidationPolicy } = require('./domain/inbound.policy');
const { InboundError, ERROR_CODES } = require('./domain/inbound.errors');

module.exports = {
  // Controller & Routes
  InboundController,
  createInboundRoutes,
  PERMISSION_CODES,
  
  // Services
  ReceiptService,
  
  // Repositories
  ReceiptRepository,
  ReceiptWeighingRepository,
  ReceiptStatusHistoryRepository,
  
  // Domain
  ReceiptStateMachine,
  RECEIPT_STATUS,
  RECEIPT_ACTIONS,
  TolerancePolicy,
  CancelPolicy,
  WeightValidationPolicy,
  InboundError,
  ERROR_CODES,
};
