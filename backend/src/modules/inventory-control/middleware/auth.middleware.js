/**
 * Module 6: Inventory Control - Auth Middleware
 * Fastify preHandler hooks for authentication and authorization
 */

const PERMISSION_CODES = {
  // On-Hand Inquiry
  ONHAND_READ: 'IC.ONHAND.READ',
  MOVEMENT_READ: 'IC.MOVEMENT.READ',
  
  // Move Order
  MOVE_CREATE: 'IC.MOVE.CREATE',
  MOVE_READ: 'IC.MOVE.READ',
  MOVE_CONFIRM: 'IC.MOVE.CONFIRM',
  MOVE_EXECUTE: 'IC.MOVE.EXECUTE',
  MOVE_CANCEL: 'IC.MOVE.CANCEL',
  
  // Transfer Order
  TRANSFER_CREATE: 'IC.TRANSFER.CREATE',
  TRANSFER_READ: 'IC.TRANSFER.READ',
  TRANSFER_RELEASE: 'IC.TRANSFER.RELEASE',
  TRANSFER_SHIP: 'IC.TRANSFER.SHIP',
  TRANSFER_RECEIVE: 'IC.TRANSFER.RECEIVE',
  TRANSFER_CLOSE: 'IC.TRANSFER.CLOSE',
  TRANSFER_CANCEL: 'IC.TRANSFER.CANCEL',
  
  // Status Change
  STATUS_CREATE: 'IC.STATUS.CREATE',
  STATUS_READ: 'IC.STATUS.READ',
  STATUS_CANCEL: 'IC.STATUS.CANCEL',
  STATUS_REVERSE: 'IC.STATUS.REVERSE',
  
  // Cycle Count
  CYCLE_COUNT_CREATE: 'IC.CYCLECOUNT.CREATE',
  CYCLE_COUNT_READ: 'IC.CYCLECOUNT.READ',
  CYCLE_COUNT_RELEASE: 'IC.CYCLECOUNT.RELEASE',
  CYCLE_COUNT_SUBMIT: 'IC.CYCLECOUNT.SUBMIT',
  CYCLE_COUNT_APPROVE: 'IC.CYCLECOUNT.APPROVE',
  CYCLE_COUNT_POST: 'IC.CYCLECOUNT.POST',
  CYCLE_COUNT_CANCEL: 'IC.CYCLECOUNT.CANCEL',
  
  // Adjustment
  ADJUSTMENT_CREATE: 'IC.ADJUSTMENT.CREATE',
  ADJUSTMENT_READ: 'IC.ADJUSTMENT.READ',
  ADJUSTMENT_SUBMIT: 'IC.ADJUSTMENT.SUBMIT',
  ADJUSTMENT_APPROVE: 'IC.ADJUSTMENT.APPROVE',
  ADJUSTMENT_POST: 'IC.ADJUSTMENT.POST',
  ADJUSTMENT_CANCEL: 'IC.ADJUSTMENT.CANCEL',
  
  // Reconciliation
  RECONCILIATION_RUN: 'IC.RECONCILIATION.RUN',
  RECONCILIATION_READ: 'IC.RECONCILIATION.READ',
  RECONCILIATION_ASSIGN: 'IC.RECONCILIATION.ASSIGN',
  RECONCILIATION_RESOLVE: 'IC.RECONCILIATION.RESOLVE',
  RECONCILIATION_CLOSE: 'IC.RECONCILIATION.CLOSE',
};

/**
 * Auth preHandler - validates JWT token or dev bypass (Fastify version)
 */
function authPreHandler(authorizationService, configService) {
  return async (request, reply) => {
    try {
      request.requestId = request.id || require('crypto').randomUUID();

      const nodeEnv = configService?.get?.('NODE_ENV') || process.env.NODE_ENV;
      const bypass =
        (configService?.get?.('DEV_AUTH_BYPASS') || process.env.DEV_AUTH_BYPASS) === 'true' &&
        nodeEnv !== 'production';

      if (bypass) {
        const userCode = request.headers['x-user-code'] || 'admin';
        if (authorizationService?.resolveRequestUser) {
          request.user = await authorizationService.resolveRequestUser(userCode);
        } else {
          request.user = {
            id: 'dev-user-id',
            userCode,
            permissionCodes: Object.values(PERMISSION_CODES),
            warehouseScopes: [],
            ownerScopes: [],
          };
        }
        return;
      }

      const authorization = request.headers.authorization;
      if (!authorization?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Thiếu Bearer token hợp lệ.',
        });
      }

      const token = authorization.slice('Bearer '.length);
      const secret = configService?.get?.('JWT_SECRET') || process.env.JWT_SECRET;

      if (!secret) {
        return reply.status(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Thiếu cấu hình JWT_SECRET.',
        });
      }

      const jwt = require('jsonwebtoken');
      let payload;
      try {
        payload = jwt.verify(token, secret);
      } catch {
        return reply.status(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token không hợp lệ hoặc đã hết hạn.',
        });
      }

      const userCode = payload?.userCode;
      if (!userCode) {
        return reply.status(401).send({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token không chứa userCode hợp lệ.',
        });
      }

      if (authorizationService?.resolveRequestUser) {
        request.user = await authorizationService.resolveRequestUser(userCode);
      } else {
        request.user = { id: payload.userId, userCode, permissionCodes: [], warehouseScopes: [], ownerScopes: [] };
      }
    } catch (error) {
      console.error('Auth preHandler error:', error);
      return reply.status(500).send({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Lỗi xác thực.',
      });
    }
  };
}

/**
 * Permission preHandler - checks required permission (Fastify version)
 */
function permissionPreHandler(requiredPermission) {
  return async (request, reply) => {
    const user = request.user;

    if (!user) {
      return reply.status(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: 'Không tìm thấy thông tin người dùng trong request.',
      });
    }

    if (!user.permissionCodes?.includes(requiredPermission)) {
      return reply.status(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: `Bạn không có quyền ${requiredPermission}.`,
      });
    }

    const warehouseCode = request.headers['x-warehouse-code'];
    if (
      warehouseCode &&
      user.warehouseScopes?.length > 0 &&
      !user.warehouseScopes.includes(warehouseCode)
    ) {
      return reply.status(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: `Bạn không có quyền thao tác warehouse ${warehouseCode}.`,
      });
    }

    const ownerId = request.headers['x-owner-id'];
    if (
      ownerId &&
      user.ownerScopes?.length > 0 &&
      !user.ownerScopes.includes(ownerId)
    ) {
      return reply.status(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: `Bạn không có quyền truy cập dữ liệu của owner ${ownerId}.`,
      });
    }
  };
}

module.exports = {
  authPreHandler,
  permissionPreHandler,
  PERMISSION_CODES,
};
