import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

export interface ScanResult {
  [tool: string]: any;
}

export class SessionContext {
  messages: ChatCompletionMessageParam[] = [];
  scan_results: ScanResult = {};
  last_target: string | null = null;
  tools_run: string[] = [];
  last_scan_time: number = Date.now();

  add_message(message: ChatCompletionMessageParam) {
    this.messages.push(message);
    if (this.messages.length > 20) {
      this.messages.shift();
    }
  }

  add_scan_result(tool: string, result: any) {
    this.scan_results[tool] = result;
    if (!this.tools_run.includes(tool)) {
      this.tools_run.push(tool);
    }
    this.last_scan_time = Date.now();
  }

  set_target(target: string) {
    if (this.last_target !== target) {
      this.last_target = target;
      this.scan_results = {};
      this.tools_run = [];
    }
    this.last_scan_time = Date.now();
  }

  summary(): string {
    if (!this.last_target) {
      return 'Aucune cible scannée pour le moment.';
    }
    let sum = `Cible: ${this.last_target}\nOutils exécutés: ${this.tools_run.join(', ')}\nRésultats:\n`;
    for (const [tool, res] of Object.entries(this.scan_results)) {
      sum += `- ${tool.toUpperCase()}: ${typeof res === 'string' ? res : JSON.stringify(res)}\n`;
    }
    return sum;
  }
}

@Injectable()
export class ContextService {
  private contexts: Map<string, SessionContext> = new Map();

  getContext(sessionId: string): SessionContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, new SessionContext());
    }
    return this.contexts.get(sessionId)!;
  }

  resetContext(sessionId: string) {
    this.contexts.delete(sessionId);
  }
}
