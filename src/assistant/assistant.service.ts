import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'groq-sdk/resources/chat/completions';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NmapService } from '../security-tools/nmap/nmap.service';
import { HydraService } from '../security-tools/hydra/hydra.service';
import { NiktoService } from '../security-tools/nikto/nikto.service';

// ─── Emit function type: (socketEvent, payload) => void ─────────────────────
type EmitFn = (event: string, data: string) => void;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private client: Groq | null = null;

  constructor(
    private configService: ConfigService,
    private nmapService: NmapService,
    private hydraService: HydraService,
    private niktoService: NiktoService,
  ) {
    this.initModel();
  }

  // ─── Hot-reload API key from .env on every call ──────────────────────────
  private initModel(): boolean {
    dotenv.config({
      path: path.resolve(process.cwd(), '.env'),
      override: true,
    });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      this.client = null;
      return false;
    }
    this.client = new Groq({ apiKey });
    return true;
  }

  // ─── Shared tool definitions (used by both chat paths) ───────────────────
  private getTools(): ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'nmap_quick_scan',
          description: 'Scan a network target (IP or hostname) for open ports.',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target to scan.' },
            },
            required: ['target'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'hydra_brute_force',
          description: 'Test for common weak passwords on SSH (Port 22).',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target to test.' },
            },
            required: ['target'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'nikto_web_scan',
          description: 'Scan a web server for vulnerabilities.',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Target URL or IP.' },
            },
            required: ['target'],
          },
        },
      },
    ];
  }

  // ─── Shared system prompt ─────────────────────────────────────────────────
  private getSystemPrompt(): string {
    return `
      You are "Luminous Guardian", a Cybersecurity Expert analyst (AspisProject).
      Your goal is to perform security analysis and provide a structured tactical report.
      
      RULES:
      1. ALWAYS use the tools if a scan or test is requested.
      2. If you find results, calculate a SECURITY SCORE (0-100) based on risks.
      3. Format your response into these sections:
         - **TACTICAL_OVERVIEW**: High-level summary of the target's risk.
         - **SECURITY_SCORE**: A number between 0 and 100.
         - **RISK_LEVEL**: CRITICAL | HIGH | MEDIUM | LOW.
         - **VULNERABILITIES**: A table showing Port, Service, Risk, and Recommendation.
         - **PROTECTIVE_ACTIONS**: Clear steps to secure the system.
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH 1 — REST (blocking, unchanged)
  // Used by: POST /assistant/chat
  // ═══════════════════════════════════════════════════════════════════════════
  async chat(prompt: string): Promise<string> {
    if (!this.initModel() || !this.client) {
      return 'Groq Brain Offline: Please check your API key.';
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const tools = this.getTools();
    const systemPrompt = this.getSystemPrompt();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: messages,
        tools: tools,
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls) {
        messages.push(responseMessage as unknown as ChatCompletionMessageParam);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments) as {
            target: string;
          };
          let result = '';

          if (functionName === 'nmap_quick_scan') {
            result = await this.nmapService.execute(functionArgs.target);
          } else if (functionName === 'hydra_brute_force') {
            result = await this.hydraService.execute(functionArgs.target);
          } else if (functionName === 'nikto_web_scan') {
            result = await this.niktoService.execute(functionArgs.target);
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: result,
          } as ChatCompletionMessageParam);
        }

        const finalResponse = await this.client.chat.completions.create({
          model: modelName,
          messages: messages,
        });

        return (
          finalResponse.choices[0]?.message?.content ||
          'Security Report generation failed.'
        );
      }

      return responseMessage.content || 'Guardian Ready.';
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Groq AI Error: ${errorMessage}`);
      return `ALERT: Security Intelligence Failure. Original error: ${errorMessage}`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH 2 — WebSocket (streaming, real-time)
  // Used by: ScanGateway → socket 'start_scan' event
  //
  // Each step emits an event to the client via the emit() callback:
  //   scan:status  — human-readable progress message
  //   scan:tool    — live line of raw tool output (nmap/hydra/nikto stdout)
  //   scan:ai      — one streaming token from the AI report
  //   scan:complete — the full assembled report (for storage/reference)
  //   scan:error   — something went wrong
  // ═══════════════════════════════════════════════════════════════════════════
  async chatStream(prompt: string, emit: EmitFn): Promise<void> {
    if (!this.initModel() || !this.client) {
      emit('scan:error', 'Groq Brain Offline: Please check your API key.');
      return;
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const tools = this.getTools();
    const systemPrompt = this.getSystemPrompt();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    try {
      // ── Round 1: Ask AI what tools to run (not streamed — need full response) ──
      emit('scan:status', '🤖 Luminous Guardian is analyzing your request...');

      const response = await this.client.chat.completions.create({
        model: modelName,
        messages,
        tools,
      });

      const responseMessage = response.choices[0].message;

      // ── Tool execution loop ──────────────────────────────────────────────────
      if (responseMessage.tool_calls) {
        messages.push(responseMessage as unknown as ChatCompletionMessageParam);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments) as {
            target: string;
          };

          emit(
            'scan:status',
            `⚡ Running ${functionName} on ${functionArgs.target}...`,
          );

          // Get the right streaming generator
          let generator: AsyncGenerator<string> | null = null;

          if (functionName === 'nmap_quick_scan') {
            generator = this.nmapService.executeStream(functionArgs.target);
          } else if (functionName === 'hydra_brute_force') {
            generator = this.hydraService.executeStream(functionArgs.target);
          } else if (functionName === 'nikto_web_scan') {
            generator = this.niktoService.executeStream(functionArgs.target);
          }

          // Stream each line of tool output to the client AND accumulate for AI
          let fullToolResult = '';
          if (generator) {
            for await (const line of generator) {
              emit('scan:tool', line);        // live terminal line → frontend
              fullToolResult += line;         // accumulate for Round 2
            }
          }

          emit('scan:status', `✅ ${functionName} complete.`);

          // Push tool result into the conversation so AI can analyze it
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: fullToolResult,
          } as ChatCompletionMessageParam);
        }

        // ── Round 2: AI reads tool output, writes report — STREAMED token by token ──
        emit('scan:status', '📝 AI is generating the security report...');

        const stream = await this.client.chat.completions.create({
          model: modelName,
          messages,
          stream: true,   // ← Groq streams the report token by token
        });

        let fullReport = '';
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            emit('scan:ai', token);   // each word/token → frontend in real-time
            fullReport += token;
          }
        }

        // Send the fully assembled report as a final event (useful for saving)
        emit('scan:complete', fullReport);
        return;
      }

      // ── No tool calls needed — stream a direct AI reply ─────────────────────
      emit('scan:status', '📝 Luminous Guardian is responding...');

      const stream = await this.client.chat.completions.create({
        model: modelName,
        messages,
        stream: true,
      });

      let fullReport = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          emit('scan:ai', token);
          fullReport += token;
        }
      }

      emit('scan:complete', fullReport);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Groq Streaming Error: ${errorMessage}`);
      emit('scan:error', `ALERT: Security Intelligence Failure. ${errorMessage}`);
    }
  }
}
