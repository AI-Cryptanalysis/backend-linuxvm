import { Module } from '@nestjs/common';
import { HydraService } from './hydra.service';
import { HydraController } from './hydra.controller';

@Module({
  controllers: [HydraController],
  providers: [HydraService],
  exports: [HydraService],
})
export class HydraModule {}
