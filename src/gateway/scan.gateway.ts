import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AssistantService } from '../assistant/assistant.service';

// ─── WebSocket server on the same port as HTTP (via socket.io adapter) ───────
// cors '*' for development — tighten to your frontend URL in production
@WebSocketGateway({ cors: { origin: '*' } })
export class ScanGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScanGateway.name);

  constructor(private readonly assistantService: AssistantService) {}

  // ─── Lifecycle: client connects ───────────────────────────────────────────
  handleConnection(client: Socket) {
    this.logger.log(`[WS] Client connected: ${client.id}`);
    // Immediately greet the new client so the frontend knows the socket works
    client.emit('connected', {
      message: '⚡ Luminous Guardian WebSocket ready.',
      clientId: client.id,
    });
  }

  // ─── Lifecycle: client disconnects ───────────────────────────────────────
  handleDisconnect(client: Socket) {
    this.logger.log(`[WS] Client disconnected: ${client.id}`);
  }

  // ─── Main event: 'start_scan' ─────────────────────────────────────────────
  // Client sends:  socket.emit('start_scan', { prompt: 'scan 192.168.1.1' })
  //
  // Server emits back (in order):
  //   'scan:status'   → { data: string }  — progress/status messages
  //   'scan:tool'     → { data: string }  — live terminal line from tool
  //   'scan:ai'       → { data: string }  — streaming AI token
  //   'scan:complete' → { data: string }  — full assembled report
  //   'scan:error'    → { data: string }  — something went wrong
  @SubscribeMessage('start_scan')
  async handleScan(
    @MessageBody() body: { prompt: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!body?.prompt) {
      client.emit('scan:error', { data: 'prompt is required' });
      return;
    }

    this.logger.log(`[WS] start_scan from ${client.id}: "${body.prompt}"`);

    // Build the emit function — binds Socket.io emit to this specific client
    const emit = (event: string, data: string) => {
      client.emit(event, { data });
    };

    // Hand off to AssistantService — it calls emit() for every update
    await this.assistantService.chatStream(body.prompt, emit);
  }
}
