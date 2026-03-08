/**
 * Module 3: Inventory Core Engine - Auth Middleware
 * Express middleware wrapper for authentication and authorization
 */

const PERMISSION_CODES = {
  POSTING_CREATE: 'INVENTORY.POSTING.CREATE',
  POSTING_READ: 'INVENTORY.POSTING.READ',
  REVERSAL_CREATE: 'INVENTORY.REVERSAL.CREATE',
  ONHAND_READ: 'INVENTORY.ONHAND.READ',
  HOLD_CREATE: 'INVENTORY.HOLD.CREATE',
  HOLD_READ: 'INVENTORY.HOLD.READ',
  HOLD_RELEASE: 'INVENTORY.HOLD.RELEASE',
  HOLD_CANCEL: 'INVENTORY.HOLD.CANCEL',
  TRANSACTION_READ: 'INVENTORY.TRANSACTION.READ',
};

/**
 * Auth middleware - validates JWT token or dev bypass
 */
function authMiddleware(authorizationService, configService) {
  return async (req, res, next) => {
    try {
      req.requestId = req.requestId || require('crypto').randomUUID();

      const nodeEnv = configService?.get?.('NODE_ENV') || process.env.NODE_ENV;
      const bypass =
        (configService?.get?.('DEV_AUTH_BYPASS') || process.env.DEV_AUTH_BYPASS) === 'true' &&
        nodeEnv !== 'production';

      if (bypass) {
        const userCode = req.headers['x-user-code'] || 'admin';
        if (authorizationService?.resolveRequestUser) {
          req.user = await authorizationService.resolveRequestUser(userCode);
        } else {
          req.user = {
            id: 'dev-user-id',
            userCode,
            permissionCodes: Object.values(PERMISSION_CODES),
            warehouseScopes: [],
            ownerScopes: [],
          };
        }
        return next();
      }

      const authorization = req.headers.authorization;
      if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Thiếu Bearer token hợp lệ.',
        });
      }

      const token = authorization.slice('Bearer '.length);
      const secret = configService?.get?.('JWT_SECRET') || process.env.JWT_SECRET;

      if (!secret) {
        return res.status(401).json({
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
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token không hợp lệ hoặc đã hết hạn.',
        });
      }

      const userCode = payload?.userCode;
      if (!userCode) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token không chứa userCode hợp lệ.',
        });
      }

      if (authorizationService?.resolveRequestUser) {
        req.user = await authorizationService.resolveRequestUser(userCode);
      } else {
        req.user = { id: payload.userId, userCode, permissionCodes: [], warehouseScopes: [], ownerScopes: [] };
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Lỗi xác thực.',
      });
    }
  };
}

/**
 * Permission middleware - checks required permission
 */
function permissionMiddleware(requiredPermission) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Không tìm thấy thông tin người dùng trong request.',
      });
    }

    if (!user.permissionCodes?.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Bạn không có quyền ${requiredPermission}.`,
      });
    }

    const warehouseCode = req.headers['x-warehouse-code'];
    if (
      warehouseCode &&
      user.warehouseScopes?.length > 0 &&
      !user.warehouseScopes.includes(warehouseCode)
    ) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Bạn không có quyền thao tác warehouse ${warehouseCode}.`,
      });
    }

    const ownerId = req.headers['x-owner-id'];
    if (
      ownerId &&
      user.ownerScopes?.length > 0 &&
      !user.ownerScopes.includes(ownerId)
    ) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Bạn không có quyền truy cập dữ liệu của owner ${ownerId}.`,
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  permissionMiddleware,
  PERMISSION_CODES,
};
