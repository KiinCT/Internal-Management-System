import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { Public } from './common/decorators';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      database: this.connection.readyState === 1 ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    };
  }
}
