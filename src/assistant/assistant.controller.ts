import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK) // Force a 200 OK instead of 201 or 204
  async chat(
    @Body('prompt') prompt: string,
    @Body('session_id') sessionId?: string,
  ) {
    const sid = sessionId || 'default_session';
    console.log(
      `[AssistantController] Received request: \${prompt}, session: \${sid}`,
    );
    const result = await this.assistantService.chat(prompt, sid);

    // Ensure we never return an empty response
    return {
      response:
        result ||
        'Luminous Guardian encountered an internal silence. Please repeat your query.',
    };
  }
}
