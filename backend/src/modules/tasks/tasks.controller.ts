import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import {
  CreateCommentDto,
  CreateTaskDto,
  LogTimeDto,
  QueryTaskDto,
  ReorderTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('tasks')
  findAll(@CurrentUser() user: AuthUser, @Query() q: QueryTaskDto) {
    return this.service.findAll(user, q);
  }

  @Get('tasks/my')
  mine(@CurrentUser() user: AuthUser, @Query() q: QueryTaskDto) {
    return this.service.findMine(user, q);
  }

  @Get('projects/:projectId/board')
  board(@CurrentUser() user: AuthUser, @Param('projectId', ParseObjectIdPipe) projectId: string) {
    return this.service.board(user, projectId);
  }

  @Patch('tasks/reorder')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderTasksDto) {
    return this.service.reorder(user, dto);
  }

  @Get('tasks/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post('tasks')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.service.create(user, dto);
  }

  @Patch('tasks/:id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(user, id, dto);
  }

  @Patch('tasks/:id/status')
  status(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.service.updateStatus(user, id, dto.status);
  }

  @Post('tasks/:id/log-time')
  logTime(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: LogTimeDto) {
    return this.service.logTime(user, id, dto.hours);
  }

  @Delete('tasks/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(user, id);
  }

  @Get('tasks/:id/comments')
  comments(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.listComments(user, id);
  }

  @Post('tasks/:id/comments')
  addComment(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: CreateCommentDto) {
    return this.service.addComment(user, id, dto);
  }

  @Delete('comments/:id')
  removeComment(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.removeComment(user, id);
  }
}
