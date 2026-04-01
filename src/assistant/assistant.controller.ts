import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK) // Force a 200 OK instead of 201 or 204
  async chat(@Body('prompt') prompt: string) {
    console.log(`[AssistantController] Received request: ${prompt}`);
    const result = await this.assistantService.chat(prompt);
    
    // Ensure we never return an empty response
    return { 
      response: result || "Luminous Guardian encountered an internal silence. Please repeat your query." 
    };
  }
}
