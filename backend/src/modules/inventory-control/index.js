/**
 * Module 6: Inventory Control
 * 
 * Lớp điều phối nghiệp vụ cho các hoạt động kiểm soát tồn kho:
 * - Move Order: Di chuyển hàng trong kho
 * - Transfer Order: Chuyển hàng giữa các kho
 * - Status Change: Đổi trạng thái tồn kho
 * - Cycle Count: Kiểm kê chu kỳ
 * - Adjustment: Điều chỉnh tồn kho
 * - Reconciliation Review: Đánh giá đối chiếu sai lệch
 * - On-Hand Inquiry: Tra cứu tồn kho
 * - Movement History: Lịch sử biến động
 */

const routes = require('./inventory-control.routes');

// Services
const moveOrderService = require('./services/move-order.service');
const transferOrderService = require('./services/transfer-order.service');
const statusChangeService = require('./services/status-change.service');
const cycleCountService = require('./services/cycle-count.service');
const adjustmentService = require('./services/adjustment.service');
const reconciliationService = require('./services/reconciliation.service');
const onhandInquiryService = require('./services/onhand-inquiry.service');
const validationService = require('./services/ic-validation.service');
const stateMachineService = require('./services/ic-state-machine.service');
const postingAdapterService = require('./services/ic-posting-adapter.service');

// Domain
const enums = require('./domain/ic.enums');
const errors = require('./domain/ic.errors');
const policy = require('./domain/ic.policy');

// Repositories
const moveOrderRepo = require('./infra/move-order.repository');
const transferOrderRepo = require('./infra/transfer-order.repository');
const statusChangeRepo = require('./infra/status-change.repository');
const cycleCountRepo = require('./infra/cycle-count.repository');
const adjustmentRepo = require('./infra/adjustment.repository');
const reconciliationRepo = require('./infra/reconciliation.repository');
const statusHistoryRepo = require('./infra/ic-status-history.repository');

module.exports = {
  routes,
  services: {
    moveOrderService,
    transferOrderService,
    statusChangeService,
    cycleCountService,
    adjustmentService,
    reconciliationService,
    onhandInquiryService,
    validationService,
    stateMachineService,
    postingAdapterService,
  },
  domain: {
    enums,
    errors,
    policy,
  },
  repositories: {
    moveOrderRepo,
    transferOrderRepo,
    statusChangeRepo,
    cycleCountRepo,
    adjustmentRepo,
    reconciliationRepo,
    statusHistoryRepo,
  },
};
