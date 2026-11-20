import { Body, Controller, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  Asset,
  AssetSchema,
  AssignAssetDto,
  CreateAssetDto,
  NoteDto,
  QueryAssetDto,
  UpdateAssetDto,
} from './asset.schema';
import { AssetsService } from './assets.service';

const ASSET_ADMINS = [Role.ADMIN, Role.DIRECTOR];

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: QueryAssetDto) {
    return this.service.list(u, q);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.service.get(u, id);
  }

  @Post()
  @Roles(...ASSET_ADMINS)
  create(@Body() dto: CreateAssetDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...ASSET_ADMINS)
  update(@CurrentUser() u: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.service.update(u, id, dto);
  }

  @Post(':id/assign')
  @Roles(...ASSET_ADMINS)
  assign(@CurrentUser() u: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: AssignAssetDto) {
    return this.service.assign(u, id, dto);
  }

  @Post(':id/return')
  @Roles(...ASSET_ADMINS)
  ret(@CurrentUser() u: AuthUser, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: NoteDto) {
    return this.service.return(u, id, dto.note);
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]), NotificationsModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
