import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { NiktoService } from './nikto.service';

@Controller('nikto')
export class NiktoController {
  constructor(private readonly niktoService: NiktoService) {}

  @Get('scan')
  async runScan(@Query('target') target: string): Promise<string> {
    if (!target) {
      throw new BadRequestException('Target is required');
    }
    return this.niktoService.execute(target);
  }
}
