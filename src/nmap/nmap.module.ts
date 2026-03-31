import { Module } from '@nestjs/common';
import { NmapController } from './nmap.controller';
import { NmapService } from './nmap.service';

@Module({
  controllers: [NmapController],
  providers: [NmapService],
})
export class NmapModule {}
