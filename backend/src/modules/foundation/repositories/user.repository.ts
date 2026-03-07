import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(userId: string) {
    return this.prisma.appUser.findUnique({
      where: { id: userId },
    });
  }

  findByUserCode(userCode: string) {
    return this.prisma.appUser.findUnique({
      where: { userCode },
    });
  }
}
