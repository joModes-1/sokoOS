import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{
      user: { businessId?: string; permissions: string[]; roles: string[] };
    }>();
    if (!user) throw new ForbiddenException('UNAUTHENTICATED');
    if (!user.businessId) {
      throw new ForbiddenException({
        code: 'TENANT_REQUIRED',
        message: 'An active business is required',
      });
    }

    // `admin.*` must be a permission of the active business (scoped by TenantGuard).
    // A BUSINESS_ADMIN role in another tenant grants nothing here.
    if (user.permissions.includes('admin.*')) return true;

    const hasPermission = required.every((perm) => user.permissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action',
      });
    }
    return true;
  }
}
