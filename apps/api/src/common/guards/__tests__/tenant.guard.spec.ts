import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from '../tenant.guard.js';

interface MockRequest {
  user: { id: string; roles: string[]; permissions: string[]; businessId?: string; branchId?: string };
  params: Record<string, string>;
  headers: Record<string, string | undefined>;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  method: string;
  url: string;
}

function contextFor(request: MockRequest): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function request(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    user: { id: 'user-1', roles: [], permissions: [] },
    params: {},
    headers: {},
    query: {},
    body: {},
    method: 'GET',
    url: '/v1/sales',
    ...overrides,
  };
}

describe('TenantGuard', () => {
  let prisma: {
    userRole: { findFirst: jest.Mock; findMany: jest.Mock };
    userBranch: { findMany: jest.Mock };
    branch: { findFirst: jest.Mock };
  };
  let guard: TenantGuard;

  beforeEach(() => {
    prisma = {
      userRole: { findFirst: jest.fn(), findMany: jest.fn() },
      userBranch: { findMany: jest.fn().mockResolvedValue([]) },
      branch: { findFirst: jest.fn() },
    };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as never;
    guard = new TenantGuard(prisma as never, reflector);
  });

  it('scopes roles and permissions to the active business', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          code: 'CASHIER',
          rolePermissions: [{ permission: { code: 'sales.create' } }],
        },
      },
    ]);

    const req = request({ headers: { 'x-business-id': 'biz-A' } });
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);

    expect(req.user.businessId).toBe('biz-A');
    expect(req.user.roles).toEqual(['CASHIER']);
    expect(req.user.permissions).toEqual(['sales.create']);
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ businessId: 'biz-A' }) }),
    );
  });

  it('rejects a business the user has no role in (no cross-tenant escalation)', async () => {
    prisma.userRole.findMany.mockResolvedValue([]);

    const req = request({ headers: { 'x-business-id': 'biz-B' } });
    await expect(guard.canActivate(contextFor(req))).rejects.toMatchObject({
      response: { code: 'TENANT_ACCESS_DENIED' },
    });
  });

  it('fails closed when no business can be resolved', async () => {
    prisma.userRole.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor(request()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a branch the user is not assigned to', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      { role: { code: 'CASHIER', rolePermissions: [{ permission: { code: 'sales.create' } }] } },
    ]);
    prisma.userBranch.findMany.mockResolvedValue([{ branchId: 'branch-A1' }]);
    prisma.branch.findFirst.mockResolvedValue({ id: 'branch-A2' });

    const req = request({
      headers: { 'x-business-id': 'biz-A', 'x-branch-id': 'branch-A2' },
    });
    await expect(guard.canActivate(contextFor(req))).rejects.toMatchObject({
      response: { code: 'BRANCH_ACCESS_DENIED' },
    });
  });

  it('rejects a foreign branch in the request body', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      { role: { code: 'CASHIER', rolePermissions: [{ permission: { code: 'sales.create' } }] } },
    ]);
    prisma.userBranch.findMany.mockResolvedValue([{ branchId: 'branch-A1' }]);

    const req = request({
      method: 'POST',
      url: '/v1/sales',
      headers: { 'x-business-id': 'biz-A' },
      body: { branchId: 'branch-B1' },
    });
    await expect(guard.canActivate(contextFor(req))).rejects.toMatchObject({
      response: { code: 'BRANCH_ACCESS_DENIED' },
    });
  });

  it('allows creating the first business before any membership exists', async () => {
    prisma.userRole.findFirst.mockResolvedValue(null);

    const req = request({ method: 'POST', url: '/v1/businesses' });
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
  });
});
