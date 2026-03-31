import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NmapModule } from './nmap/nmap.module';

@Module({
  imports: [NmapModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
