import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import * as express from 'express';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
    rawBody: true, // Bật raw body cho toàn bộ app
  });

  // QUAN TRỌNG: Cấu hình raw body cho webhook TRƯỚC helmet và CORS
  app.use('/stripe/webhook', express.raw({ type: 'application/json' }));
  
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));

  // Cho phép tất cả domain truy cập
  app.enableCors({
    origin: true, // Hoặc có thể dùng '*' 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'stripe-signature' // Thêm header cho Stripe webhook
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // Tạm thời tắt để test
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/v1/uploads/',
    setHeaders: (res, path) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Drezzup API')
    .setDescription('Drezzup API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    // Thêm security scheme global
    .addSecurity('JWT-auth', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Áp dụng JWT cho tất cả các endpoints
  Object.keys(document.paths).forEach(path => {
    Object.keys(document.paths[path]).forEach(method => {
      if (document.paths[path][method].operationId) {
        document.paths[path][method].security = [{ 'JWT-auth': [] }];
      }
    });
  });

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      securityDefinitions: {
        'JWT-auth': {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Enter your bearer token in the format **Bearer &lt;token&gt;**'
        }
      }
    },
  });
  const baseUrl = process.env.BASE_URL;
  app.enableShutdownHooks();
  //them code 15phut tu ping server 1 lan
  setInterval(() => {
    axios.get(baseUrl +'/products');
    axios.get(https://serverseejam.onrender.com/);
  }, 15 * 60 * 1000); // 15 phút

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
