import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { NotificationsModule } from '../notifications/notifications.module';
import { CreateProjectDto, QueryProjectDto, UpdateMembersDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { Project, ProjectSchema } from './schemas/project.schema';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() q: QueryProjectDto) {
    return this.service.findAll(user, q);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.MANAGER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/members')
  members(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateMembersDto) {
    return this.service.updateMembers(user, id, dto.memberIds);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(user, id);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    NotificationsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, MongooseModule],
})
export class ProjectsModule {}
