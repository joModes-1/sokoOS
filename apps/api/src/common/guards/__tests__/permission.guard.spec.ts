import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from '../permission.guard.js';

function contextFor(user: {
  businessId?: string;
  roles: string[];
  permissions: string[];
}): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(required: string[]): PermissionGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as never;
  return new PermissionGuard(reflector);
}

describe('PermissionGuard', () => {
  it('does not grant access from a BUSINESS_ADMIN role alone', () => {
    const guard = guardRequiring(['admin.settings']);
    const user = {
      businessId: 'biz-A',
      roles: ['BUSINESS_ADMIN'],
      permissions: ['sales.view'],
    };

    expect(() => guard.canActivate(contextFor(user))).toThrow(ForbiddenException);
  });

  it('grants admin.* only when it belongs to the active business', () => {
    const guard = guardRequiring(['admin.settings']);
    const user = {
      businessId: 'biz-A',
      roles: ['BUSINESS_ADMIN'],
      permissions: ['admin.*'],
    };

    expect(guard.canActivate(contextFor(user))).toBe(true);
  });

  it('requires all requested permissions', () => {
    const guard = guardRequiring(['sales.view', 'sales.refund']);
    const user = {
      businessId: 'biz-A',
      roles: ['CASHIER'],
      permissions: ['sales.view'],
    };

    expect(() => guard.canActivate(contextFor(user))).toThrow(ForbiddenException);
  });

  it('fails closed without an active business', () => {
    const guard = guardRequiring(['sales.view']);
    const user = { roles: [], permissions: ['sales.view'] };

    expect(() => guard.canActivate(contextFor(user))).toThrow(ForbiddenException);
  });
});
