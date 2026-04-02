import { Injectable, Logger } from '@nestjs/common';
import { BaseSecurityTool } from '../strategies/base-tool.strategy';

@Injectable()
export class HydraService extends BaseSecurityTool {
  protected logger = new Logger(HydraService.name);
  protected toolCommand = 'hydra';

  constructor() {
    super('hydra');
  }

  // ─── REST / old AI path ──────────────────────────────────────────────────
  async execute(target: string): Promise<string> {
    this.logger.log(`Starting Hydra scan on ${target}...`);
    return this.runCommand(`hydra -l admin -p password ssh://${target} -t 4`);
  }

  // ─── WebSocket streaming path ─────────────────────────────────────────────
  async *executeStream(target: string): AsyncGenerator<string> {
    this.logger.log(`[STREAM] Starting Hydra scan on: ${target}`);
    yield* this.streamCommand('hydra', [
      '-l', 'admin',
      '-p', 'password',
      `ssh://${target}`,
      '-t', '4',
    ]);
  }
}
