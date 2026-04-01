import { Injectable, Logger } from '@nestjs/common';
import { BaseSecurityTool } from '../strategies/base-tool.strategy';

@Injectable()
export class NiktoService extends BaseSecurityTool {
  protected logger = new Logger(NiktoService.name);
  protected toolCommand = 'nikto';

  constructor() {
    super('nikto');
  }

  async execute(target: string): Promise<string> {
    this.logger.log(`Starting Nikto scan on ${target}...`);
    return this.runCommand(`nikto -h ${target} -Tuning 123 -maxtime 30s`);
  }
}
