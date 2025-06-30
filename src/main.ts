import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Cho phép cross-origin cho ảnh
    contentSecurityPolicy: false, // hoặc cấu hình lại cho phù hợp
  }),
);

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
      'Origin'
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
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );



  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/v1/uploads/',
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
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

  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);

  // Tự động ping server mỗi 5 phútAdd commentMore actions
  setInterval(() => {
    const url = `https://fizennn.click/v1/products`;
    fetch(url)Add commentMore actions
      .then(() => console.log(`Pinged ${url} at ${new Date().toISOString()}`))
      .catch((err) => console.error(`Ping failed: ${err}`));
  }, 15 * 60 * 1000); // 5 phút
}

bootstrap();
