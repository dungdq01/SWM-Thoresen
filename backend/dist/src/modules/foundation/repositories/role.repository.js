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
exports.RoleRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
let RoleRepository = class RoleRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(filters) {
        const where = {
            ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
            ...(filters.roleCode
                ? { roleCode: { contains: filters.roleCode, mode: 'insensitive' } }
                : {}),
        };
        return this.prisma.role.findMany({
            where,
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
            orderBy: { roleCode: 'asc' },
        });
    }
    findById(roleId) {
        return this.prisma.role.findUnique({
            where: { id: roleId },
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
        });
    }
    findByCode(roleCode) {
        return this.prisma.role.findUnique({
            where: { roleCode },
        });
    }
    create(data) {
        return this.prisma.role.create({
            data: {
                roleCode: data.roleCode,
                roleName: data.roleName,
                description: data.description,
                createdBy: data.actorUserId,
                updatedBy: data.actorUserId,
            },
        });
    }
    update(roleId, data) {
        return this.prisma.role.update({
            where: { id: roleId },
            data: {
                ...(data.roleName !== undefined ? { roleName: data.roleName } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                updatedBy: data.actorUserId,
            },
        });
    }
    async assignPermissions(roleId, permissionLinks, actorUserId) {
        return this.prisma.$transaction(async (tx) => {
            for (const permissionLink of permissionLinks) {
                await tx.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId,
                            permissionId: permissionLink.permissionId,
                        },
                    },
                    update: {
                        effect: permissionLink.effect,
                        createdBy: actorUserId,
                    },
                    create: {
                        roleId,
                        permissionId: permissionLink.permissionId,
                        effect: permissionLink.effect,
                        createdBy: actorUserId,
                    },
                });
            }
            return tx.role.findUnique({
                where: { id: roleId },
                include: {
                    permissions: {
                        include: { permission: true },
                    },
                },
            });
        });
    }
    async assignRoleToUser(data) {
        if (data.isPrimary) {
            await this.prisma.userRole.updateMany({
                where: {
                    userId: data.userId,
                    isActive: true,
                },
                data: {
                    isPrimary: false,
                },
            });
        }
        return this.prisma.userRole.create({
            data: {
                userId: data.userId,
                roleId: data.roleId,
                warehouseCode: data.warehouseCode,
                ownerId: data.ownerId ?? undefined,
                isPrimary: data.isPrimary ?? false,
                assignedBy: data.actorUserId,
            },
            include: {
                role: true,
                user: true,
            },
        });
    }
};
exports.RoleRepository = RoleRepository;
exports.RoleRepository = RoleRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoleRepository);
//# sourceMappingURL=role.repository.js.map