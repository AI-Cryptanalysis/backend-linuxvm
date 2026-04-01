import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { NmapModule } from '../security-tools/nmap/nmap.module';
import { HydraModule } from '../security-tools/hydra/hydra.module';
import { NiktoModule } from '../security-tools/nikto/nikto.module';

@Module({
  imports: [NmapModule, HydraModule, NiktoModule],
  providers: [AssistantService],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
