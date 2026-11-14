import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';

@Controller()
export class HealthController {
  @Public() @Get('health')
  health() { return { status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }; }

  @Public() @Get('version')
  version() { return { version: '1.0.0', api: 'v1', name: 'SokoOS API' }; }
}
