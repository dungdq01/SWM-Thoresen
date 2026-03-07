import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
export declare class UserRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(userId: string): import(".prisma/client").Prisma.Prisma__AppUserClient<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userCode: string;
        username: string;
        fullName: string;
        email: string | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    findByUserCode(userCode: string): import(".prisma/client").Prisma.Prisma__AppUserClient<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userCode: string;
        username: string;
        fullName: string;
        email: string | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
}
