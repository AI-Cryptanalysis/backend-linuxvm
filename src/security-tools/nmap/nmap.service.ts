import { Injectable, Logger } from '@nestjs/common';
import { BaseSecurityTool } from '../strategies/base-tool.strategy';

@Injectable()
export class NmapService extends BaseSecurityTool {
  protected logger = new Logger(NmapService.name);
  protected toolCommand = 'nmap';

  constructor() {
    super('nmap');
  }

  async execute(target: string): Promise<string> {
    this.logger.log(`Starting nmap scan for: ${target}`);
    return this.runCommand(`nmap -F ${target}`);
  }
}
