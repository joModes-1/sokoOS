import { Controller, Post, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RegisterBusinessSchema } from '@sokoos/shared';

@ApiTags('businesses')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  constructor(private businesses: BusinessesService) {}

  @Post()
  async register(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = RegisterBusinessSchema.parse(body);
    return this.businesses.registerBusiness(user.id, input);
  }

  @Get(':businessId')
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.businesses.getProfile(user.businessId!, user.id);
  }

  @Patch(':businessId')
  async updateProfile(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.businesses.updateProfile(user.businessId!, user.id, body as never);
  }

  @Patch(':businessId/settings')
  async updateSettings(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.businesses.updateSettings(user.businessId!, body as never);
  }
}
