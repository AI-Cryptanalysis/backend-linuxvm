import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { SecurityToolStrategy } from '../interfaces/security-tool.interface';

const execAsync = promisify(exec);

@Injectable()
export abstract class BaseSecurityTool implements SecurityToolStrategy {
  protected abstract logger: Logger;
  protected abstract toolCommand: string;

  constructor(protected readonly toolName: string) {}

  // ─── Sync (blocking) execute — used by REST API & old AI path ─────────────
  abstract execute(target: string): Promise<string>;

  // ─── Streaming execute — used by WebSocket AI path ────────────────────────
  abstract executeStream(target: string): AsyncGenerator<string>;

  getToolName(): string {
    return this.toolName;
  }

  // ─── Blocking command runner (for REST/old AI path) ───────────────────────
  protected async runCommand(command: string): Promise<string> {
    const platform = os.platform();
    try {
      const { stdout } = await execAsync(command);
      return `SYSTEM_TRACE [${platform}] ${this.toolName.toUpperCase()}_OUTPUT: ${stdout}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute ${this.toolName}: ${message}`);
      return `SYSTEM_TRACE [${platform}] ${this.toolName.toUpperCase()}_ERROR: ${message}`;
    }
  }

  // ─── Streaming command runner (for WebSocket path) ────────────────────────
  // Uses spawn() so stdout chunks are emitted as they arrive, not buffered.
  protected async *streamCommand(
    cmd: string,
    args: string[],
  ): AsyncGenerator<string> {
    const platform = os.platform();

    // shell:true lets the command resolve through PATH on both Linux and Windows
    const child = spawn(cmd, args, { shell: true });

    if (!child.stdout) {
      yield `SYSTEM_TRACE [${platform}] ${this.toolName.toUpperCase()}_ERROR: No stdout stream\n`;
      return;
    }

    // Node.js streams are async iterables — each chunk arrives as it's printed
    for await (const chunk of child.stdout) {
      yield (chunk as Buffer).toString('utf8');
    }

    // Wait for the process to fully exit before signalling done
    await new Promise<void>((resolve) => child.on('close', resolve));
  }
}
