/**
 * Module 7: Work Execution - Query Use Cases
 */

const { mapWorkHeaderToResponse, mapWorkListItemToResponse, mapMobileWorkToResponse, mapExceptionToResponse } = require('../infra/work.mapper');

class GetWorkListUseCase {
  constructor(workHeaderRepo) {
    this.workHeaderRepo = workHeaderRepo;
  }

  async execute(filters, pagination) {
    const { items, total } = await this.workHeaderRepo.findMany(filters, pagination);
    
    return {
      items: items.map(mapWorkListItemToResponse),
      total,
      page: Math.floor(pagination.offset / pagination.limit) + 1,
      pageSize: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }
}

class GetWorkDetailUseCase {
  constructor(workHeaderRepo, workEventRepo, workExceptionRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workEventRepo = workEventRepo;
    this.workExceptionRepo = workExceptionRepo;
  }

  async execute(workId) {
    const header = await this.workHeaderRepo.findByWorkId(workId);
    if (!header) {
      return null;
    }
    
    const [exceptions] = await Promise.all([
      this.workExceptionRepo.findByWorkHeaderId(header.id),
    ]);
    
    const response = mapWorkHeaderToResponse(header);
    response.exceptions = exceptions.map(mapExceptionToResponse);
    
    return response;
  }
}

class GetWorkHistoryUseCase {
  constructor(workHeaderRepo, workEventRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workEventRepo = workEventRepo;
  }

  async execute(workId) {
    const header = await this.workHeaderRepo.findByWorkId(workId);
    if (!header) {
      return null;
    }
    
    const history = await this.workEventRepo.getWorkHistory(header.id);
    return history;
  }
}

class GetAvailableWorksUseCase {
  constructor(workHeaderRepo) {
    this.workHeaderRepo = workHeaderRepo;
  }

  async execute(warehouseId, workTypes, pagination) {
    const { items, total } = await this.workHeaderRepo.findAvailableWorks(warehouseId, workTypes, pagination);
    
    return {
      items: items.map(mapMobileWorkToResponse),
      total,
    };
  }
}

class GetMyWorksUseCase {
  constructor(workHeaderRepo) {
    this.workHeaderRepo = workHeaderRepo;
  }

  async execute(userId, statuses, pagination) {
    const { items, total } = await this.workHeaderRepo.findMyWorks(userId, statuses, pagination);
    
    return {
      items: items.map(mapMobileWorkToResponse),
      total,
    };
  }
}

class GetDashboardSummaryUseCase {
  constructor(workHeaderRepo, workExceptionRepo) {
    this.workHeaderRepo = workHeaderRepo;
    this.workExceptionRepo = workExceptionRepo;
  }

  async execute(warehouseId) {
    const summary = await this.workHeaderRepo.getDashboardSummary(warehouseId);
    return summary;
  }
}

class GetWorkExceptionsUseCase {
  constructor(workExceptionRepo) {
    this.workExceptionRepo = workExceptionRepo;
  }

  async execute(workId, workHeaderRepo) {
    const header = await workHeaderRepo.findByWorkId(workId);
    if (!header) {
      return [];
    }
    
    const exceptions = await this.workExceptionRepo.findByWorkHeaderId(header.id);
    return exceptions.map(mapExceptionToResponse);
  }
}

module.exports = {
  GetWorkListUseCase,
  GetWorkDetailUseCase,
  GetWorkHistoryUseCase,
  GetAvailableWorksUseCase,
  GetMyWorksUseCase,
  GetDashboardSummaryUseCase,
  GetWorkExceptionsUseCase,
};
