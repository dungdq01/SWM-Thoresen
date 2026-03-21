import { Module } from '@nestjs/common';
import { FoundationModule } from '../foundation/foundation.module';
import { GoodsSplitController } from './goods-split.controller';
import { GoodsSplitService } from './goods-split.service';

@Module({
  imports: [FoundationModule],
  controllers: [GoodsSplitController],
  providers: [GoodsSplitService],
  exports: [GoodsSplitService],
})
export class GoodsSplitModule {}
