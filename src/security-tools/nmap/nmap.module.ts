import { Module } from '@nestjs/common';
import { NmapService } from './nmap.service';
import { NmapController } from './nmap.controller';

@Module({
  controllers: [NmapController],
  providers: [NmapService],
  exports: [NmapService],
})
export class NmapModule {}
