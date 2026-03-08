/**
 * Module 7: Work Execution - Deliver Outbox Events Use Case
 * Fix HI-2: Outbox consumer/publisher service
 */

const { OUTBOX_STATUS } = require('../domain/work.types');

class DeliverOutboxUseCase {
  constructor(workOutboxRepo, httpClient) {
    this.workOutboxRepo = workOutboxRepo;
    this.httpClient = httpClient;
    this.maxRetries = 5;
    this.moduleEndpoints = {
      M4: '/api/v1/internal/inbound/callbacks',
      M5: '/api/v1/internal/outbound/callbacks',
      M6: '/api/v1/internal/inventory-control/callbacks',
    };
  }

  async execute(batchSize = 50) {
    const pendingEvents = await this.workOutboxRepo.findPendingEvents(batchSize);
    
    const results = {
      total: pendingEvents.length,
      sent: 0,
      failed: 0,
      dead: 0,
    };

    for (const event of pendingEvents) {
      try {
        await this._deliverEvent(event);
        results.sent++;
      } catch (error) {
        if (event.retryCount >= this.maxRetries) {
          await this.workOutboxRepo.markAsDead(event.id, error.message);
          results.dead++;
        } else {
          await this.workOutboxRepo.markAsFailed(event.id, error.message);
          results.failed++;
        }
      }
    }

    return results;
  }

  async _deliverEvent(event) {
    const endpoint = this.moduleEndpoints[event.targetModule];
    if (!endpoint) {
      throw new Error(`Unknown target module: ${event.targetModule}`);
    }

    if (this.httpClient && typeof this.httpClient.post === 'function') {
      await this.httpClient.post(endpoint, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        correlationId: event.payload?.correlationId,
      });
    }

    await this.workOutboxRepo.markAsSent(event.id);
  }

  async retryFailedEvents(batchSize = 20) {
    const failedEvents = await this.workOutboxRepo.findFailedEventsReadyForRetry(batchSize);
    
    const results = {
      total: failedEvents.length,
      retried: 0,
      dead: 0,
    };

    for (const event of failedEvents) {
      try {
        await this._deliverEvent(event);
        results.retried++;
      } catch (error) {
        if (event.retryCount >= this.maxRetries) {
          await this.workOutboxRepo.markAsDead(event.id, error.message);
          results.dead++;
        } else {
          await this.workOutboxRepo.incrementRetry(event.id, error.message);
        }
      }
    }

    return results;
  }
}

module.exports = { DeliverOutboxUseCase };
