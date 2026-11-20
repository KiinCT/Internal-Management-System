import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import configuration, { validateEnv } from './config/configuration';
import { AssetsModule } from './modules/assets/assets.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),
        autoIndex: config.get<string>('nodeEnv') !== 'production',
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    NotificationsModule,
    ProjectsModule,
    TasksModule,
    WorkflowsModule,
    AssetsModule,
    BookingsModule,
    ReportsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    // Thứ tự: giới hạn tần suất -> xác thực JWT -> kiểm tra vai trò
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
