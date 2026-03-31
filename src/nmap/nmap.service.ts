import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { encode } from '@toon-format/toon';

const execAsync = promisify(exec);

interface NmapPort {
  port: string;
  protocol: string;
  state: string;
  service: string;
}

interface NmapResult {
  target: string;
  status: string;
  ports: NmapPort[];
}

@Injectable()
export class NmapService {
  private readonly logger = new Logger(NmapService.name);

  /**
   * Performs a fast scan and returns the results in TOON format.
   */
  async quickScan(target: string): Promise<string> {
    if (!this.isValidTarget(target)) {
      throw new Error('Invalid scan target.');
    }

    try {
      this.logger.log(`Starting nmap scan for target: ${target}`);
      const { stdout } = await execAsync(`nmap -F ${target}`);
      
      // Parse the raw text into a JSON object
      const parsedData = this.parseNmapOutput(stdout);
      
      // Encode the JSON object into official TOON format
      return encode(parsedData);
    } catch (error) {
      this.logger.error(`Failed to execute nmap: ${error.message}`);
      return `Scan Error: ${error.message}`;
    }
  }

  /**
   * Parsers raw Nmap string into a structured JSON object.
   */
  private parseNmapOutput(raw: string): NmapResult {
    const lines = raw.split('\n');
    const result: NmapResult = {
      target: 'unknown',
      status: 'unknown',
      ports: [],
    };

    lines.forEach(line => {
      // 1. Identify Target
      if (line.includes('Nmap scan report for')) {
        result.target = line.replace('Nmap scan report for ', '').trim();
      }
      // 2. Identify Status
      if (line.includes('Host is')) {
        result.status = line.split('(')[0].replace('Host is ', '').trim();
      }
      // 3. Identify Ports (Matches like "3000/tcp open ppp")
      const portMatch = line.match(/^(\d+)\/(\w+)\s+(\w+)\s+(.+)$/);
      if (portMatch) {
        result.ports.push({
          port: portMatch[1],
          protocol: portMatch[2],
          state: portMatch[3],
          service: portMatch[4],
        });
      }
    });

    return result;
  }

  private isValidTarget(target: string): boolean {
    const targetRegex = /^[a-zA-Z0-9.-]+$/;
    return targetRegex.test(target);
  }
}
