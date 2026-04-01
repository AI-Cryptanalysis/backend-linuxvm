import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class NmapService {
  private readonly logger = new Logger(NmapService.name);

  /**
   * Run a quick Nmap scan.
   */
  async quickScan(target: string): Promise<string> {
    const platform = os.platform();
    try {
      this.logger.log(`[${platform}] Starting nmap scan for: ${target}`);
      const { stdout } = await execAsync(`nmap -F ${target}`);
      return `SYSTEM_TRACE [${platform}] NMAP_OUTPUT: ${stdout}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute nmap: ${message}`);
      return `SYSTEM_TRACE [${platform}] NMAP_ERROR: ${message}`;
    }
  }

  /**
   * Run Hydra to test for common weak passwords on SSH.
   */
  async runHydra(target: string): Promise<string> {
    const platform = os.platform();
    this.logger.log(`Starting Hydra scan on ${target}...`);
    try {
      // Basic test using admin/password pairs
      const { stdout } = await execAsync(
        `hydra -l admin -p password ssh://${target} -t 4`,
      );
      return `SYSTEM_TRACE [${platform}] HYDRA_OUTPUT: ${stdout}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `SYSTEM_TRACE [${platform}] HYDRA_ERROR: ${message}`;
    }
  }

  /**
   * Run Nikto to scan for web server vulnerabilities.
   */
  async runNikto(target: string): Promise<string> {
    const platform = os.platform();
    this.logger.log(`Starting Nikto scan on ${target}...`);
    try {
      const { stdout } = await execAsync(
        `nikto -h ${target} -Tuning 123 -maxtime 30s`,
      );
      return `SYSTEM_TRACE [${platform}] NIKTO_OUTPUT: ${stdout}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `SYSTEM_TRACE [${platform}] NIKTO_ERROR: ${message}`;
    }
  }
}
