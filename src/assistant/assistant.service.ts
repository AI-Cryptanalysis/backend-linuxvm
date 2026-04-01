import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NmapService } from '../nmap/nmap.service';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private client: Groq | null = null;

  constructor(
    private configService: ConfigService,
    private nmapService: NmapService,
  ) {
    this.initModel();
  }

  private initModel(): boolean {
    dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      this.client = null;
      return false;
    }
    this.client = new Groq({ apiKey });
    return true;
  }

  async chat(prompt: string, context?: string): Promise<string> {
    if (!this.initModel() || !this.client) {
      return 'Groq Brain Offline: Please check your API key.';
    }

    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    
    // Simplified tool definition to prevent AI syntax errors
    const tools: any[] = [
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
    ];

    const systemPrompt = `
      You are "Luminous Guardian", a Cybersecurity Expert.
      You have access to a tool named 'nmap_quick_scan'. 
      
      When a user asks to scan something, use the tool. 
      DO NOT try to write your own tags like <function>. Use the built-in tool calling system.
      
      Formatting Rules:
      - ALWAYS use Markdown.
      - Use Tables for scan results.
      - Use Bold Headers for sections.
    `;

    let messages: any[] = [{ role: 'system', content: systemPrompt }];
    if (context) messages.push({ role: 'system', content: `Context: ${context}` });
    messages.push({ role: 'user', content: prompt });

    try {
      let response = await this.client.chat.completions.create({
        model: modelName,
        messages: messages,
        tools: tools,
        // tool_choice: 'auto' is usually fine, but force 'auto' clearly
      });

      let responseMessage = response.choices[0].message;

      // Handle the case where the AI wants to use a tool
      if (responseMessage.tool_calls) {
        messages.push(responseMessage);
        
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          if (functionName === 'nmap_quick_scan') {
            const scanResult = await this.nmapService.quickScan(functionArgs.target);
            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: scanResult,
            });
          }
        }

        // Final response after tool execution
        const finalResponse = await this.client.chat.completions.create({
          model: modelName,
          messages: messages,
        });

        return finalResponse.choices[0]?.message?.content || 'No analysis provided.';
      }

      return responseMessage.content || 'I cannot process that request right now.';
    } catch (error) {
      this.logger.error(`Groq AI Error: ${error.message}`);
      // Special check for tool errors
      if (error.message.includes('tool_call')) {
         return "The Luminous Guardian is recalibrating its scanning sensors. Please try rephrasing your scan request (e.g., 'Scan 127.0.0.1').";
      }
      return `AI Error: ${error.message}`;
    }
  }

  async analyzeScan(toonData: string): Promise<string> {
    return this.chat(`Analyze this: ${toonData}`);
  }
}
