import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistantModule } from './assistant/assistant.module';
import { NmapModule } from './security-tools/nmap/nmap.module';
import { HydraModule } from './security-tools/hydra/hydra.module';
import { NiktoModule } from './security-tools/nikto/nikto.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AssistantModule,
    NmapModule,
    HydraModule,
    NiktoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
