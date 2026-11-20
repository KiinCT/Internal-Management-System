import { Body, Controller, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import {
  ActionRequestDto,
  CreateRequestDto,
  CreateWorkflowTemplateDto,
  QueryRequestDto,
  UpdateWorkflowTemplateDto,
} from './dto/workflow.dto';
import {
  WorkflowTemplate,
  WorkflowTemplateSchema,
  WorkRequest,
  WorkRequestSchema,
} from './schemas/workflow.schema';
import { WorkflowsService } from './workflows.service';

@ApiTags('Workflow templates')
@ApiBearerAuth()
@Controller('workflow-templates')
export class WorkflowTemplatesController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
    return this.service.listTemplates(all === 'true' && user.role === Role.ADMIN);
  }

  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.getTemplate(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateWorkflowTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateWorkflowTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }
}

@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: QueryRequestDto) {
    return this.service.listRequests(user, q);
  }

  @Get('pending-approval')
  pending(@CurrentUser() user: AuthUser, @Query() q: QueryRequestDto) {
    q.scope = 'pending';
    return this.service.listRequests(user, q);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.getRequest(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.service.createRequest(user, dto);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ActionRequestDto) {
    return this.service.approve(user, id, dto.comment);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ActionRequestDto) {
    return this.service.reject(user, id, dto.comment);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.cancel(user, id);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowTemplate.name, schema: WorkflowTemplateSchema },
      { name: WorkRequest.name, schema: WorkRequestSchema },
    ]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [WorkflowTemplatesController, RequestsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService, MongooseModule],
})
export class WorkflowsModule {}
