import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Required: tell NestJS to use socket.io instead of the default native ws adapter.
  // Without this, socket.io-client on the frontend will get a timeout error.
  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Shifted to 5070 because Firefox blocks 5060
  const port = process.env.PORT || 5070;
  await app.listen(port);
  console.log(`\n--- Luminous Guardian Backend ---`);
  console.log(`REST  → http://localhost:${port}/assistant/chat`);
  console.log(`WS    → ws://localhost:${port} (socket.io)`);
}
void bootstrap();
