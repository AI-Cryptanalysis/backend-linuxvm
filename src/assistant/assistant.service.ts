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

import { ContextService } from './context.service';
import { ChainingService } from './chaining.service';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private client: Groq | null = null;

  constructor(
    private configService: ConfigService,
    private nmapService: NmapService,
    private hydraService: HydraService,
    private niktoService: NiktoService,
    private contextService: ContextService,
    private chainingService: ChainingService,
  ) {
    this.initModel();
  }

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

  async chat(prompt: string, sessionId: string): Promise<string> {
    if (!this.initModel() || !this.client) {
      return 'Groq Brain Offline: Please check your API key.';
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const ctx = this.contextService.getContext(sessionId);

    // Try to detect intent and tools directly based on a structured system prompt,
    // or just let GROQ figure out the first tools as it already did before.
    const tools: ChatCompletionTool[] = [
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
          description:
            'Test for common weak passwords on SSH (Port 22) or FTP (Port 21).',
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

    const contextSummary = ctx.summary();
    const systemPrompt = `
      You are "Luminous Guardian", a Cybersecurity Expert analyst (AspisProject).
      Your goal is to perform security analysis and provide a structured tactical report.
      You must converse in French.
      
      CONTEXTE DE LA SESSION EN COURS:
      \${contextSummary}
      
      RULES:
      1. Use the available tools to scan if the user requests it. If they ask about previous results, use the Context.
      2. If you find results, calculate a SECURITY SCORE (0-100) based on risks.
      3. Format your response into these sections:
         - **TACTICAL_OVERVIEW**: High-level summary of the target's risk.
         - **SECURITY_SCORE**: A number between 0 and 100.
         - **RISK_LEVEL**: CRITICAL | HIGH | MEDIUM | LOW.
         - **VULNERABILITIES**: A table showing Port, Service, Risk, and Recommendation.
         - **PROTECTIVE_ACTIONS**: Clear steps to secure the system.
    `;

    ctx.add_message({ role: 'user', content: prompt });

    // Build payload messages
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...ctx.messages,
    ];

    // Chaining log to show the user
    const chainLog: string[] = [];

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: messages,
        tools: tools,
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls) {
        ctx.add_message(
          responseMessage as unknown as ChatCompletionMessageParam,
        );
        messages.push(responseMessage as unknown as ChatCompletionMessageParam);

        let toolsToRun: { name: string; target: string; id?: string }[] = [];

        for (const toolCall of responseMessage.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments) as {
            target: string;
          };

          let toolKey = '';
          if (fnName === 'nmap_quick_scan') toolKey = 'nmap';
          else if (fnName === 'hydra_brute_force') toolKey = 'hydra';
          else if (fnName === 'nikto_web_scan') toolKey = 'nikto';

          ctx.set_target(fnArgs.target);
          toolsToRun.push({
            name: toolKey,
            target: fnArgs.target,
            id: toolCall.id,
          });
        }

        // Chaining loop
        let iteration = 0;
        const MAX_ITERATIONS = 4;
        const toolOutputMessages: ChatCompletionMessageParam[] = [];

        while (toolsToRun.length > 0 && iteration < MAX_ITERATIONS) {
          iteration++;
          const currentTool = toolsToRun.shift()!;
          if (!currentTool) break;

          let rawResult = '';
          chainLog.push(
            `[+] Lancement de l'outil: \${currentTool.name} sur \${currentTool.target}`,
          );

          if (currentTool.name === 'nmap') {
            rawResult = await this.nmapService.execute(currentTool.target);
          } else if (currentTool.name === 'hydra') {
            rawResult = await this.hydraService.execute(currentTool.target);
          } else if (currentTool.name === 'nikto') {
            rawResult = await this.niktoService.execute(currentTool.target);
          }

          // In a real scenario we parse it properly. Let's do a fast JSON parse if possible.
          let parsedResult = {};
          try {
            // Some tools may return purely JSON structured as string, or we parse it
            parsedResult = JSON.parse(rawResult);
          } catch (e) {
            // Fallback for unstructured:
            parsedResult = { raw: rawResult };
          }

          ctx.add_scan_result(currentTool.name, parsedResult);

          // If the tool was initiated by the LLM function call, provide the id
          if (currentTool.id) {
            toolOutputMessages.push({
              tool_call_id: currentTool.id,
              role: 'tool',
              name:
                currentTool.name === 'nmap'
                  ? 'nmap_quick_scan'
                  : currentTool.name === 'hydra'
                    ? 'hydra_brute_force'
                    : 'nikto_web_scan',
              content: rawResult,
            } as ChatCompletionMessageParam);
          }

          const nextTools = this.chainingService.decideNextTools(
            currentTool.name,
            parsedResult,
            ctx.tools_run,
          );
          for (const nextTool of nextTools) {
            if (!toolsToRun.find((t) => t.name === nextTool)) {
              chainLog.push(
                `[⚙] Chaining automatique: ajout de \${nextTool} à la suite des résultats de \${currentTool.name}.`,
              );
              toolsToRun.push({ name: nextTool, target: currentTool.target });
            }
          }
        }

        // At the end, add all the tool output messages
        toolOutputMessages.forEach((msg) => {
          messages.push(msg);
          ctx.add_message(msg);
        });

        // Add auto-chained results as a text message so the AI knows about it
        const additionalResults = Object.entries(ctx.scan_results)
          .filter(
            ([k]) =>
              !toolOutputMessages.find(
                (m) =>
                  (m as any).name ===
                  (k === 'nmap'
                    ? 'nmap_quick_scan'
                    : k === 'hydra'
                      ? 'hydra_brute_force'
                      : 'nikto_web_scan'),
              ),
          )
          .map(
            ([k, v]) =>
              `Auto-chained Tool ${k} Results: ${typeof v === 'string' ? v : JSON.stringify(v)}`,
          )
          .join('\n');

        if (additionalResults.length > 0) {
          const sysMsg: ChatCompletionMessageParam = {
            role: 'system',
            content: `Here are results from automatically chained tools:\n${additionalResults}`,
          };
          messages.push(sysMsg);
          ctx.add_message(sysMsg);
        }

        const finalResponse = await this.client.chat.completions.create({
          model: modelName,
          messages: messages,
        });

        const finalOutput =
          finalResponse.choices[0]?.message?.content ||
          'Security Report generation failed.';
        ctx.add_message({ role: 'assistant', content: finalOutput });

        let resultOutput = '';
        if (chainLog.length > 0) {
          resultOutput +=
            `**CHAÎNE D'ANALYSE**\n` + chainLog.join('\n') + `\n\n`;
        }
        resultOutput += finalOutput;
        return resultOutput;
      }

      const output = responseMessage.content || 'Guardian Ready.';
      ctx.add_message({ role: 'assistant', content: output });
      return output;
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Groq AI Error: \${errorMessage}`);
      return `ALERT: Security Intelligence Failure. Original error: \${errorMessage}`;
    }
  }
}
