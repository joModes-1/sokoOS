import { Controller, NotFoundException, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { DevService } from './dev.service.js';

/**
 * Development-only endpoints that back the in-app "Load demo data" button.
 *
 * The service refuses to run when NODE_ENV is production, so this controller is harmless if it
 * somehow ships; the 404 here makes that explicit rather than leaking a working endpoint.
 */
@ApiTags('dev')
@ApiBearerAuth()
@Controller('dev')
export class DevController {
  constructor(private dev: DevService) {}

  @Post('demo-data')
  @RequirePermissions('catalogue.manage')
  async demoData(@CurrentUser() user: AuthUser) {
    if (!this.dev.enabled) throw new NotFoundException();
    return this.dev.seedDemoData(user.businessId!);
  }
}