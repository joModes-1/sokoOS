import { Controller, Post, Body, Get, Patch, Delete, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RegisterSchema, LoginSchema } from '@sokoos/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: unknown) {
    const input = RegisterSchema.parse(body);
    return this.auth.register(input);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() req: FastifyRequest) {
    const input = LoginSchema.parse(body);
    const ip = req.headers['x-forwarded-for']?.toString() ?? req.ip;
    const ua = req.headers['user-agent'];
    return this.auth.login(input, ip, ua);
  }

  @Public()
  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  async mfaChallenge(@Body() body: { challengeToken: string; code: string }) {
    return this.auth.verifyMfa(body.challengeToken, body.code);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.auth.verifyByEmail(String(body?.email ?? ''), String(body?.code ?? ''));
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }) {
    return this.auth.resendVerification(String(body?.email ?? ''));
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@CurrentUser() user: AuthUser, @Body() body: { code: string }) {
    return this.auth.verifyPhone(user.id, body.code);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.auth.resetPassword(body.token, body.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refreshToken(body.refreshToken);
  }

  @Delete('sessions/:sessionId')
  async revokeSession(@Param('sessionId') sessionId: string, @CurrentUser() user: AuthUser) {
    return this.auth.revokeSession(sessionId, user.id);
  }

  @Post('mfa/enrol')
  async enrollMfa(@CurrentUser() user: AuthUser) {
    return this.auth.enrollMfa(user.id);
  }

  @Post('mfa/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmMfa(@CurrentUser() user: AuthUser, @Body() body: { factorId: string; code: string }) {
    return this.auth.confirmMfa(user.id, body.factorId, body.code);
  }

  @Get('me')
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
