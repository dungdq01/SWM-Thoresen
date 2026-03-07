"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoundationModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const governance_controller_1 = require("./controllers/governance.controller");
const log_controller_1 = require("./controllers/log.controller");
const number_sequence_controller_1 = require("./controllers/number-sequence.controller");
const number_sequence_repository_1 = require("./repositories/number-sequence.repository");
const permission_controller_1 = require("./controllers/permission.controller");
const reason_code_controller_1 = require("./controllers/reason-code.controller");
const role_controller_1 = require("./controllers/role.controller");
const governance_repository_1 = require("./repositories/governance.repository");
const log_repository_1 = require("./repositories/log.repository");
const permission_repository_1 = require("./repositories/permission.repository");
const reason_code_repository_1 = require("./repositories/reason-code.repository");
const role_repository_1 = require("./repositories/role.repository");
const user_repository_1 = require("./repositories/user.repository");
const authorization_service_1 = require("./services/authorization.service");
const governance_service_1 = require("./services/governance.service");
const idempotency_service_1 = require("./services/idempotency.service");
const log_service_1 = require("./services/log.service");
const number_sequence_service_1 = require("./services/number-sequence.service");
const permission_service_1 = require("./services/permission.service");
const reason_code_service_1 = require("./services/reason-code.service");
const role_service_1 = require("./services/role.service");
let FoundationModule = class FoundationModule {
};
exports.FoundationModule = FoundationModule;
exports.FoundationModule = FoundationModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [
            role_controller_1.RoleController,
            permission_controller_1.PermissionController,
            reason_code_controller_1.ReasonCodeController,
            number_sequence_controller_1.NumberSequenceController,
            governance_controller_1.GovernanceController,
            log_controller_1.LogController,
        ],
        providers: [
            role_repository_1.RoleRepository,
            permission_repository_1.PermissionRepository,
            reason_code_repository_1.ReasonCodeRepository,
            number_sequence_repository_1.NumberSequenceRepository,
            governance_repository_1.GovernanceRepository,
            log_repository_1.LogRepository,
            user_repository_1.UserRepository,
            authorization_service_1.AuthorizationService,
            role_service_1.RoleService,
            permission_service_1.PermissionService,
            reason_code_service_1.ReasonCodeService,
            number_sequence_service_1.NumberSequenceService,
            governance_service_1.GovernanceService,
            log_service_1.LogService,
            idempotency_service_1.IdempotencyService,
        ],
        exports: [authorization_service_1.AuthorizationService, idempotency_service_1.IdempotencyService, log_service_1.LogService],
    })
], FoundationModule);
//# sourceMappingURL=foundation.module.js.map