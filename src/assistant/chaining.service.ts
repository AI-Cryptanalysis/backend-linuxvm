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
    toolResult: Record<string, unknown>,
    alreadyRun: string[],
  ): string[] {
    const nextTools = new Set<string>();

    if (toolName === 'nmap') {
      try {
        const ports = (toolResult.ports as Record<string, unknown>[]) || [];
        for (const port of ports) {
          if (port.etat !== 'open' && port.state !== 'open') {
            continue;
          }
          const serviceName = String(
            (port.service as string | undefined) ||
              (port.name as string | undefined) ||
              '',
          ).toLowerCase();
          for (const [svcKey, tools] of Object.entries(CHAIN_RULES)) {
            if (serviceName.includes(svcKey)) {
              tools.forEach((t) => nextTools.add(t));
            }
          }
        }
      } catch {
        // Safe check
      }
    } else if (toolName === 'hydra') {
      // Hydra run done, AI talks about it
    } else if (toolName === 'nikto') {
      try {
        const vulns =
          (toolResult.vulnerabilites as any[]) ||
          (toolResult.vulnerabilities as any[]) ||
          [];
        if (vulns.length > 0 && !alreadyRun.includes('ssl')) {
          nextTools.add('ssl');
        }
      } catch {
        // Ignore error
      }
    }

    return Array.from(nextTools).filter((t) => !alreadyRun.includes(t));
  }
}
