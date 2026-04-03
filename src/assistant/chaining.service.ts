import { Injectable } from '@nestjs/common';

const CHAIN_RULES: Record<string, string[]> = {
  ssh: ['hydra'],
  ftp: ['hydra'],
  http: ['nikto'],
  https: ['nikto', 'ssl'],
  smtp: [],
  mysql: [],
};

@Injectable()
export class ChainingService {
  decideNextTools(
    toolName: string,
    toolResult: any,
    alreadyRun: string[],
  ): string[] {
    const nextTools = new Set<string>();

    if (toolName === 'nmap') {
      try {
        const ports = toolResult.ports || [];
        for (const port of ports) {
          if (port.etat !== 'open' && port.state !== 'open') {
            continue;
          }
          const service = (port.service || port.name || '').toLowerCase();
          for (const [svcKey, tools] of Object.entries(CHAIN_RULES)) {
            if (service.includes(svcKey)) {
              tools.forEach((t) => nextTools.add(t));
            }
          }
        }
      } catch (e) {
        // Safe check
      }
    } else if (toolName === 'hydra') {
      // Hydra run done, AI talks about it
    } else if (toolName === 'nikto') {
      try {
        const vulns =
          toolResult.vulnerabilites || toolResult.vulnerabilities || [];
        if (vulns.length > 0 && !alreadyRun.includes('ssl')) {
          nextTools.add('ssl');
        }
      } catch (e) {}
    }

    return Array.from(nextTools).filter((t) => !alreadyRun.includes(t));
  }
}
