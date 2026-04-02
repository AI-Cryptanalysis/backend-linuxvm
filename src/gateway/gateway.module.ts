import { Module } from '@nestjs/common';
import { ScanGateway } from './scan.gateway';
import { AssistantModule } from '../assistant/assistant.module';

@Module({
  // Import AssistantModule so ScanGateway can inject AssistantService
  imports: [AssistantModule],
  providers: [ScanGateway],
})
export class GatewayModule {}
