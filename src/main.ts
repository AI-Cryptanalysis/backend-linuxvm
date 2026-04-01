import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  console.log(
    `Security Assistant ready at: http://localhost:${port}/assistant/chat`,
  );
}
void bootstrap();
