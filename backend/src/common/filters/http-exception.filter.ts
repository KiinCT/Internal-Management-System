import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

/** Chuẩn hóa mọi lỗi về dạng { statusCode, message, error, path, timestamp }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Lỗi hệ thống';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as { message?: string | string[]; error?: string };
        message = b.message ?? exception.message;
        error = b.error ?? exception.name;
      }
      if (typeof body === 'string') error = exception.name;
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Giá trị không hợp lệ cho trường ${exception.path}`;
      error = 'Bad Request';
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = Object.values(exception.errors).map((e) => e.message);
      error = 'Bad Request';
    } else if ((exception as { code?: number })?.code === 11000) {
      status = HttpStatus.CONFLICT;
      const keys = Object.keys(
        (exception as { keyValue?: object }).keyValue ?? {},
      );
      message = `Dữ liệu đã tồn tại: ${keys.join(', ')}`;
      error = 'Conflict';
    } else {
      this.logger.error(exception as Error, (exception as Error)?.stack);
    }

    res.status(status).json({
      statusCode: status,
      message,
      error,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
