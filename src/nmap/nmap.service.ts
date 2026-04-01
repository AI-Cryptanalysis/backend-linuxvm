import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class NmapService {
  private readonly logger = new Logger(NmapService.name);

  async quickScan(target: string): Promise<string> {
    const platform = os.platform(); // 'win32' or 'linux'
    
    try {
      this.logger.log(`[${platform}] Starting nmap scan for: ${target}`);
      
      // We use 'which nmap' on linux to confirm it exists
      if (platform === 'linux') {
        try {
          await execAsync('which nmap');
        } catch {
          return `CRITICAL_ERROR: Nmap not found on LINUX system. Path: ${process.env.PATH}`;
        }
      }

      const { stdout } = await execAsync(`nmap -F ${target}`);
      return stdout; // Return raw for the AI to parse
    } catch (error) {
      this.logger.error(`Failed to execute nmap on ${platform}: ${error.message}`);
      return `SYSTEM_TRACE [${platform}]: nmap command failed. Reason: ${error.message}`;
    }
  }
}
