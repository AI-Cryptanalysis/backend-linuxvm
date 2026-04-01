export interface SecurityRisk {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
  message: string;
}

export const RISKY_PORTS: Record<number, SecurityRisk> = {
  21: {
    level: 'HIGH',
    message: 'FTP is open — data is in cleartext, disable if possible.',
  },
  22: {
    level: 'MEDIUM',
    message: 'SSH is open — secure if configured, disable root login.',
  },
  23: {
    level: 'HIGH',
    message: 'Telnet — non-encrypted protocol, ban absolutely.',
  },
  80: { level: 'LOW', message: 'HTTP — no encryption, redirect to HTTPS.' },
  443: { level: 'OK', message: 'HTTPS — secure if certificate is valid.' },
  3389: {
    level: 'HIGH',
    message: 'RDP — frequent target for ransomware, restrict access.',
  },
  8080: {
    level: 'MEDIUM',
    message: 'Alternative HTTP — often unsecured services.',
  },
};

export function assessRisks(
  parsedPorts: { port: number; service: string }[],
): SecurityRisk[] {
  return parsedPorts
    .filter((p) => RISKY_PORTS[p.port])
    .map((p) => ({
      ...RISKY_PORTS[p.port],
      message: `[Port ${p.port}/${p.service}] ${RISKY_PORTS[p.port].message}`,
    }));
}

export function calculateSecurityScore(risks: SecurityRisk[]): number {
  let score = 100;
  for (const risk of risks) {
    if (risk.level === 'CRITICAL') score -= 40;
    if (risk.level === 'HIGH') score -= 25;
    if (risk.level === 'MEDIUM') score -= 15;
    if (risk.level === 'LOW') score -= 5;
  }
  return Math.max(0, score);
}
