/**
 * Module 7: Work Execution - Controller
 */

const { WorkHeaderRepository } = require('./infra/workHeader.repository');
const { WorkLineRepository } = require('./infra/workLine.repository');
const { WorkEventRepository } = require('./infra/workEvent.repository');
const { WorkExceptionRepository } = require('./infra/workException.repository');
const { WorkOutboxRepository } = require('./infra/workOutbox.repository');
const { MobileSyncRepository } = require('./infra/mobileSync.repository');
const { InventoryAdapter } = require('./infra/inventoryAdapter');
const { mapWorkHeaderToResponse, mapWorkLineToResponse } = require('./infra/work.mapper');

const { GenerateWorkUseCase } = require('./application/generateWork.usecase');
const { ClaimWorkUseCase, ReleaseWorkUseCase } = require('./application/claimWork.usecase');
const { StartWorkUseCase, StartLineUseCase } = require('./application/startWork.usecase');
const { CompleteLineUseCase } = require('./application/completeLine.usecase');
const { SkipLineUseCase } = require('./application/skipLine.usecase');
const { CancelWorkUseCase } = require('./application/cancelWork.usecase');
const { GetWorkListUseCase, GetWorkDetailUseCase, GetWorkHistoryUseCase, GetAvailableWorksUseCase, GetMyWorksUseCase, GetDashboardSummaryUseCase, GetWorkExceptionsUseCase } = require('./application/getWorkList.usecase');
const { SyncBatchUseCase } = require('./application/syncBatch.usecase');
const { ValidateScanUseCase } = require('./application/validateScan.usecase');

const { WorkNotFoundError, WorkLineNotFoundError } = require('./domain/work.errors');

class WorkExecutionController {
  constructor(prisma, postingEngine, locationRepo, numberSequenceService) {
    this.prisma = prisma;
    
    this.workHeaderRepo = new WorkHeaderRepository(prisma);
    this.workLineRepo = new WorkLineRepository(prisma);
    this.workEventRepo = new WorkEventRepository(prisma);
    this.workExceptionRepo = new WorkExceptionRepository(prisma);
    this.workOutboxRepo = new WorkOutboxRepository(prisma);
    this.mobileSyncRepo = new MobileSyncRepository(prisma);
    this.inventoryAdapter = new InventoryAdapter(prisma, postingEngine);
    this.locationRepo = locationRepo;
    this.numberSequenceService = numberSequenceService;
  }

  _getContext(req) {
    return {
      userId: req.user?.id || req.userId,
      roles: req.user?.roles || [],
      isManager: req.user?.roles?.includes('WAREHOUSE_MANAGER'),
      sourceApp: req.headers['x-source-app'] || 'WEB',
      correlationId: req.headers['x-correlation-id'],
      warehouseId: req.warehouseId || req.query.warehouseId,
    };
  }

  _getPagination(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    return {
      offset: (page - 1) * pageSize,
      limit: Math.min(pageSize, 100),
    };
  }

  async listWorks(req, res) {
    try {
      const filters = req.validatedQuery || req.query;
      const pagination = this._getPagination(filters);
      
      const usecase = new GetWorkListUseCase(this.workHeaderRepo);
      const result = await usecase.execute(filters, pagination);
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getWork(req, res) {
    try {
      const { id } = req.params;
      
      const usecase = new GetWorkDetailUseCase(this.workHeaderRepo, this.workEventRepo, this.workExceptionRepo);
      const result = await usecase.execute(id);
      
      if (!result) {
        return res.status(404).json({ success: false, error: { code: 'WE-404-001', message: 'Work not found' } });
      }
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getWorkHistory(req, res) {
    try {
      const { id } = req.params;
      
      const usecase = new GetWorkHistoryUseCase(this.workHeaderRepo, this.workEventRepo);
      const result = await usecase.execute(id);
      
      if (!result) {
        return res.status(404).json({ success: false, error: { code: 'WE-404-001', message: 'Work not found' } });
      }
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getWorkExceptions(req, res) {
    try {
      const { id } = req.params;
      
      const usecase = new GetWorkExceptionsUseCase(this.workExceptionRepo);
      const result = await usecase.execute(id, this.workHeaderRepo);
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getDashboardSummary(req, res) {
    try {
      const { warehouseId } = req.query;
      
      const usecase = new GetDashboardSummaryUseCase(this.workHeaderRepo, this.workExceptionRepo);
      const result = await usecase.execute(warehouseId);
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async generateWork(req, res) {
    try {
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new GenerateWorkUseCase(
          this.workHeaderRepo,
          this.workLineRepo,
          this.workEventRepo,
          this.numberSequenceService
        );
        return usecase.execute(input, context, tx);
      });
      
      const statusCode = result.created ? 201 : 200;
      res.status(statusCode).json({
        success: true,
        data: mapWorkHeaderToResponse(result.work),
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async claimWork(req, res) {
    try {
      const { id } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new ClaimWorkUseCase(this.workHeaderRepo, this.workEventRepo);
        return usecase.execute(id, input, context, tx);
      });
      
      res.json({
        success: true,
        data: mapWorkHeaderToResponse(result.work),
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async releaseWork(req, res) {
    try {
      const { id } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new ReleaseWorkUseCase(this.workHeaderRepo, this.workEventRepo);
        return usecase.execute(id, input, context, tx);
      });
      
      res.json({
        success: true,
        data: mapWorkHeaderToResponse(result.work),
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async startWork(req, res) {
    try {
      const { id } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new StartWorkUseCase(this.workHeaderRepo, this.workEventRepo);
        return usecase.execute(id, input, context, tx);
      });
      
      res.json({
        success: true,
        data: mapWorkHeaderToResponse(result.work),
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async cancelWork(req, res) {
    try {
      const { id } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new CancelWorkUseCase(
          this.workHeaderRepo,
          this.workLineRepo,
          this.workEventRepo,
          this.workOutboxRepo
        );
        return usecase.execute(id, input, context, tx);
      });
      
      res.json({
        success: true,
        data: mapWorkHeaderToResponse(result.work),
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async startLine(req, res) {
    try {
      const { id, lineNum } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new StartLineUseCase(this.workHeaderRepo, this.workLineRepo, this.workEventRepo);
        return usecase.execute(id, parseInt(lineNum), input, context, tx);
      });
      
      res.json({
        success: true,
        data: mapWorkLineToResponse(result.line),
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async completeLine(req, res) {
    try {
      const { id, lineNum } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new CompleteLineUseCase(
          this.workHeaderRepo,
          this.workLineRepo,
          this.workEventRepo,
          this.workExceptionRepo,
          this.workOutboxRepo,
          this.inventoryAdapter,
          this.locationRepo
        );
        return usecase.execute(id, parseInt(lineNum), input, context, tx);
      });
      
      res.json({
        success: true,
        data: {
          line: mapWorkLineToResponse(result.line),
          headerStatus: result.header.status,
        },
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async skipLine(req, res) {
    try {
      const { id, lineNum } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new SkipLineUseCase(
          this.workHeaderRepo,
          this.workLineRepo,
          this.workEventRepo,
          this.workExceptionRepo,
          this.workOutboxRepo
        );
        return usecase.execute(id, parseInt(lineNum), input, context, tx);
      });
      
      res.json({
        success: true,
        data: {
          line: mapWorkLineToResponse(result.line),
          headerStatus: result.header.status,
        },
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async managerOverrideComplete(req, res) {
    try {
      const { id } = req.params;
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const usecase = new CompleteLineUseCase(
          this.workHeaderRepo,
          this.workLineRepo,
          this.workEventRepo,
          this.workExceptionRepo,
          this.workOutboxRepo,
          this.inventoryAdapter,
          this.locationRepo
        );
        return usecase.execute(id, input.lineNum, { ...input, isManagerOverride: true }, context, tx);
      });
      
      res.json({
        success: true,
        data: {
          line: mapWorkLineToResponse(result.line),
          headerStatus: result.header.status,
        },
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getAvailableWorks(req, res) {
    try {
      const query = req.validatedQuery || req.query;
      const pagination = this._getPagination(query);
      
      const usecase = new GetAvailableWorksUseCase(this.workHeaderRepo);
      const result = await usecase.execute(query.warehouseId, query.workTypes, pagination);
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMyWorks(req, res) {
    try {
      const context = this._getContext(req);
      const query = req.validatedQuery || req.query;
      const pagination = this._getPagination(query);
      
      const usecase = new GetMyWorksUseCase(this.workHeaderRepo);
      const result = await usecase.execute(context.userId, query.statuses, pagination);
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validateScan(req, res) {
    try {
      const input = req.validatedBody || req.body;
      
      const usecase = new ValidateScanUseCase(this.workHeaderRepo, this.locationRepo);
      const result = await usecase.execute(input);
      
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async syncBatch(req, res) {
    try {
      const input = req.validatedBody || req.body;
      const context = this._getContext(req);
      
      const startLineUseCase = new StartLineUseCase(this.workHeaderRepo, this.workLineRepo, this.workEventRepo);
      const completeLineUseCase = new CompleteLineUseCase(
        this.workHeaderRepo,
        this.workLineRepo,
        this.workEventRepo,
        this.workExceptionRepo,
        this.workOutboxRepo,
        this.inventoryAdapter,
        this.locationRepo
      );
      const skipLineUseCase = new SkipLineUseCase(
        this.workHeaderRepo,
        this.workLineRepo,
        this.workEventRepo,
        this.workExceptionRepo,
        this.workOutboxRepo
      );
      
      const usecase = new SyncBatchUseCase(
        this.mobileSyncRepo,
        this.workHeaderRepo,
        this.workLineRepo,
        startLineUseCase,
        completeLineUseCase,
        skipLineUseCase,
        this.prisma
      );
      
      const result = await usecase.execute(input, context);
      
      res.json({
        success: true,
        data: result.batch,
        eventResults: result.eventResults,
        isIdempotent: result.isIdempotent,
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  _handleError(res, error) {
    console.error('WorkExecutionController Error:', error);
    
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'WE-500-000',
          message: error.message,
          details: error.details,
          retryable: error.retryable || false,
        },
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'WE-500-000',
        message: 'Internal server error',
      },
    });
  }
}

module.exports = { WorkExecutionController };
