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

  async chat(prompt: string): Promise<string> {
    if (!this.initModel() || !this.client) {
      return 'Groq Brain Offline: Please check your API key.';
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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

    const systemPrompt = `
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
}
