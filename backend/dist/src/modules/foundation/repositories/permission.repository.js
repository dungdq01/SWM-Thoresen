"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
let PermissionRepository = class PermissionRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(filters) {
        const where = {
            ...(filters.moduleCode ? { moduleCode: filters.moduleCode } : {}),
            ...(filters.resourceCode ? { resourceCode: filters.resourceCode } : {}),
            isActive: true,
        };
        return this.prisma.permission.findMany({
            where,
            orderBy: [
                { moduleCode: 'asc' },
                { resourceCode: 'asc' },
                { actionCode: 'asc' },
            ],
        });
    }
    findByCodes(permissionCodes) {
        return this.prisma.permission.findMany({
            where: {
                permissionCode: {
                    in: permissionCodes,
                },
            },
        });
    }
    async getEffectivePermissionsByUserId(userId) {
        const rows = await this.prisma.userRole.findMany({
            where: {
                userId,
                isActive: true,
                role: { isActive: true },
            },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        const roleCodes = rows.map((item) => item.role.roleCode);
        const warehouseScopes = Array.from(new Set(rows.map((item) => item.warehouseCode).filter(Boolean)));
        const ownerScopes = Array.from(new Set(rows.map((item) => item.ownerId).filter(Boolean)));
        const permissionCodes = Array.from(new Set(rows.flatMap((item) => item.role.permissions
            .filter((link) => link.permission.isActive && link.effect === 'ALLOW')
            .map((link) => link.permission.permissionCode))));
        return {
            roleCodes,
            warehouseScopes,
            ownerScopes,
            permissionCodes,
        };
    }
};
exports.PermissionRepository = PermissionRepository;
exports.PermissionRepository = PermissionRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionRepository);
//# sourceMappingURL=permission.repository.js.map