import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

// Money is stored as BigInt minor units; JSON cannot encode BigInt natively.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  );

  // Security
  await app.register(helmet as never, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  // FRONTEND_URL accepts one URL or a comma-separated list (e.g. prod + localhost for testing).
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor(), new LoggingInterceptor());

  // OpenAPI — dev/staging convenience only; not exposed on a production deployment.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SokoOS API')
      .setDescription('Business operating platform for Uganda — REST API v1')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, doc);
  }

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.warn(`SokoOS API running on :${port}`);
  console.warn(`OpenAPI docs: http://localhost:${port}/docs`);
}

bootstrap();
