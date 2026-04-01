import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { HydraService } from './hydra.service';

@Controller('hydra')
export class HydraController {
  constructor(private readonly hydraService: HydraService) {}

  @Get('scan')
  async runScan(@Query('target') target: string): Promise<string> {
    if (!target) {
      throw new BadRequestException('Target is required');
    }
    return this.hydraService.execute(target);
  }
}
