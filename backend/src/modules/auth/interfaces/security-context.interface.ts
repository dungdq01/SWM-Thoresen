export interface SecurityContext {
  userId: string;
  userCode: string;
  username: string;
  fullName: string;
  sessionId: string;
  channel: 'WEB' | 'MOBILE' | 'API';
  authVersion: bigint;
  roleCodes: string[];
  permissionCodes: string[];
  warehouseIds: string[];
  selectedWarehouseId: string | null;
  ownerScope: string[];
  isCustomerViewer: boolean;
  correlationId: string;
  mustChangePassword: boolean;
}

export interface TokenPayload {
  sub: string;
  sid: string;
  usr: string;
  ucd: string;
  ch: 'WEB' | 'MOBILE' | 'API';
  av: number;
  wh: string | null;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  jti: string;
  sub: string;
  sid: string;
  fam: string;
  iat: number;
  exp: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  sessionId: string;
  user: {
    id: string;
    userCode: string;
    username: string;
    fullName: string;
    roleCodes: string[];
    mustChangePassword: boolean;
  };
  warehouseOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  selectedWarehouseId: string | null;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

export interface SessionInfo {
  id: string;
  sessionCode: string;
  channel: string;
  deviceName: string | null;
  ipAddress: string | null;
  loginAt: Date;
  lastSeenAt: Date;
  isCurrent: boolean;
}

export interface UserProfile {
  id: string;
  userCode: string;
  username: string;
  fullName: string;
  email: string | null;
  roleCodes: string[];
  selectedWarehouseId: string | null;
  warehouseOptions: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  ownerScope: string[];
  channel: string;
  mustChangePassword: boolean;
}

export interface PermissionSnapshot {
  roleCodes: string[];
  permissions: string[];
  warehouseScope: string[];
  ownerScope: string[];
}
