import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  Booking,
  BookingSchema,
  CreateBookingDto,
  CreateResourceDto,
  QueryBookingDto,
  Resource,
  ResourceSchema,
  UpdateResourceDto,
} from './booking.schema';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get('resources')
  resources(@CurrentUser() u: AuthUser, @Query('all') all?: string) {
    return this.service.listResources(all === 'true' && u.role === Role.ADMIN);
  }

  @Post('resources')
  @Roles(Role.ADMIN)
  createResource(@Body() dto: CreateResourceDto) {
    return this.service.createResource(dto);
  }

  @Patch('resources/:id')
  @Roles(Role.ADMIN)
  updateResource(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateResourceDto) {
    return this.service.updateResource(id, dto);
  }

  @Get('bookings')
  list(@Query() q: QueryBookingDto) {
    return this.service.list(q);
  }

  @Post('bookings')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateBookingDto) {
    return this.service.create(u, dto);
  }

  @Delete('bookings/:id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(u, id);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource.name, schema: ResourceSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
