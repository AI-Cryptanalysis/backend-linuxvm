import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { NmapService } from './nmap.service';

@Controller('nmap')
export class NmapController {
  constructor(private readonly nmapService: NmapService) {}

  @Get('scan')
  async runScan(@Query('target') target: string): Promise<string> {
    if (!target) {
      throw new BadRequestException('Target is required (e.g., /nmap/scan?target=127.0.0.1)');
    }

    try {
      return await this.nmapService.quickScan(target);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
