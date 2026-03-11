import { Module } from '@nestjs/common';
import { WorkExecutionController } from './work-execution.controller.nest';
import { WorkExecutionService } from './work-execution.service.nest';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkExecutionController],
  providers: [WorkExecutionService],
  exports: [WorkExecutionService],
})
export class WorkExecutionModule {}
