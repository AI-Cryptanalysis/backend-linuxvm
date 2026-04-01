import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import { SecurityToolStrategy } from '../interfaces/security-tool.interface';

const execAsync = promisify(exec);

@Injectable()
export abstract class BaseSecurityTool implements SecurityToolStrategy {
  protected abstract logger: Logger;
  protected abstract toolCommand: string;

  constructor(protected readonly toolName: string) {}

  abstract execute(target: string): Promise<string>;

  getToolName(): string {
    return this.toolName;
  }

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
}
