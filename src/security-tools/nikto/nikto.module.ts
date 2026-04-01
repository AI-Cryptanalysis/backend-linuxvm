import { Module } from '@nestjs/common';
import { NiktoService } from './nikto.service';
import { NiktoController } from './nikto.controller';

@Module({
  controllers: [NiktoController],
  providers: [NiktoService],
  exports: [NiktoService],
})
export class NiktoModule {}
