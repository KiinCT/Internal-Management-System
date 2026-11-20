import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = configureApp(app);

  const swagger = new DocumentBuilder()
    .setTitle('Work Management API')
    .setDescription('Hệ thống quản lý công việc và vận hành nội bộ doanh nghiệp')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger), {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/${config.get('apiPrefix')}`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
