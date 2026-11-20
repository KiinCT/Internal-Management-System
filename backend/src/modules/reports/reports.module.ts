import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ReportQueryDto, ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.service.overview(u, q);
  }

  @Get('tasks-by-status')
  byStatus(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.service.tasksByStatus(u, q);
  }

  @Get('overdue')
  overdue(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.service.overdue(u, q);
  }

  @Get('workload')
  workload(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.service.workload(u, q);
  }

  @Get('completed-trend')
  trend(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.service.completedTrend(u, q);
  }
}

@Module({
  imports: [ProjectsModule, TasksModule, WorkflowsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
