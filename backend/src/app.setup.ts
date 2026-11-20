import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/** Cấu hình dùng chung cho main.ts và e2e test. */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  app.setGlobalPrefix(config.get<string>('apiPrefix') ?? 'api/v1');
  app.use(helmet());
  app.enableCors({ origin: config.get<string[]>('corsOrigin'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  return config;
}
