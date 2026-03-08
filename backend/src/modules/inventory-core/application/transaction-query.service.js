/**
 * Module 3: Inventory Core Engine - Transaction Query Service
 */

const { InventTransRepository } = require('../infra/invent-trans.repository');
const { ReversalLinkRepository } = require('../infra/reversal-link.repository');

class TransactionQueryService {
  constructor(prisma) {
    this.prisma = prisma;
    this.inventTransRepo = new InventTransRepository(prisma);
    this.reversalLinkRepo = new ReversalLinkRepository(prisma);
  }

  /**
   * Query transactions with filters
   */
  async queryTransactions(filters, pagination) {
    return this.inventTransRepo.findMany(filters, pagination);
  }

  /**
   * Get transaction by trans_id (business key)
   */
  async getByTransId(transId) {
    return this.inventTransRepo.findByTransId(transId);
  }

  /**
   * Get transaction detail by database ID
   */
  async getById(id) {
    return this.inventTransRepo.findById(id);
  }

  /**
   * Get transaction with reversal info
   */
  async getTransactionWithReversalInfo(transId) {
    const trans = await this.inventTransRepo.findByTransId(transId);
    if (!trans) {
      return null;
    }

    const reversalLinks = await this.reversalLinkRepo.findByTransIds([trans.id]);

    const reversalInfo = {
      hasBeenReversed: false,
      isReversal: trans.isReversal,
      reversalLink: null,
    };

    for (const link of reversalLinks) {
      if (link.originalTransId === trans.id) {
        reversalInfo.hasBeenReversed = true;
        reversalInfo.reversalLink = link;
      }
    }

    return {
      ...trans,
      reversalInfo,
    };
  }

  /**
   * Get transactions by reference (receipt/shipment/etc)
   */
  async getByReference(refType, refId, refLineId = null) {
    const filters = { refType, refId };
    if (refLineId) {
      filters.refLineId = refLineId;
    }
    return this.inventTransRepo.findMany(filters, { page: 1, pageSize: 100 });
  }

  /**
   * Get transactions by correlation ID
   */
  async getByCorrelationId(correlationId) {
    return this.inventTransRepo.findMany(
      { correlationId },
      { page: 1, pageSize: 100 }
    );
  }
}

module.exports = { TransactionQueryService };
