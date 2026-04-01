import { Controller, Post, Body } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /**
   * Endpoint to analyze scan results.
   */
  @Post('analyze')
  async analyze(@Body('toonData') toonData: string): Promise<{ briefing: string }> {
    const briefing = await this.assistantService.analyzeScan(toonData);
    return { briefing };
  }

  /**
   * General chat endpoint for the Luminous Guardian.
   */
  @Post('chat')
  async chat(
    @Body('prompt') prompt: string,
    @Body('context') context?: string,
  ): Promise<{ response: string }> {
    const response = await this.assistantService.chat(prompt, context);
    return { response };
  }
}
