import { Injectable, Logger } from '@nestjs/common';
import { BaseSecurityTool } from '../strategies/base-tool.strategy';

@Injectable()
export class NiktoService extends BaseSecurityTool {
  protected logger = new Logger(NiktoService.name);
  protected toolCommand = 'nikto';

  constructor() {
    super('nikto');
  }

  // ─── REST / old AI path ──────────────────────────────────────────────────
  async execute(target: string): Promise<string> {
    this.logger.log(`Starting Nikto scan on ${target}...`);
    return this.runCommand(`nikto -h ${target} -Tuning 123 -maxtime 30s`);
  }

  // ─── WebSocket streaming path ─────────────────────────────────────────────
  async *executeStream(target: string): AsyncGenerator<string> {
    this.logger.log(`[STREAM] Starting Nikto scan on: ${target}`);
    yield* this.streamCommand('nikto', [
      '-h', target,
      '-Tuning', '123',
      '-maxtime', '30s',
    ]);
  }
}
