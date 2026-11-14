import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

interface RequestLike {
  user?: {
    id: string;
    businessId?: string;
    branchId?: string;
    roles: string[];
    permissions: string[];
  };
  params?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  method: string;
  url?: string;
}

const BRANCH_FIELDS = ['branchId', 'originBranchId', 'destinationBranchId'] as const;

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const { user } = request;
    if (!user) throw new ForbiddenException('UNAUTHENTICATED');

    // The active business comes from the header/route, otherwise the user's first membership.
    // Never continue with `businessId: undefined`: Prisma would drop the tenant filter entirely.
    let businessId =
      headerValue(request.headers['x-business-id']) ?? request.params?.['businessId'];
    if (!businessId) {
      const membership = await this.prisma.userRole.findFirst({
        where: { userId: user.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { businessId: true },
      });
      businessId = membership?.businessId;
    }
    if (!businessId) {
      // A user with no business may only create their first business.
      const isBusinessCreation =
        request.method === 'POST' && /\/businesses\/?$/.test(request.url ?? '');
      if (isBusinessCreation) return true;
      throw new ForbiddenException({
        code: 'TENANT_REQUIRED',
        message: 'An active business is required (X-Business-Id)',
      });
    }

    // Scope roles and permissions to the active business. The JWT strategy no longer unions
    // permissions across tenants, so an admin of business A has no admin rights in business B.
    const memberships = await this.prisma.userRole.findMany({
      where: { userId: user.id, businessId, deletedAt: null },
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: 'TENANT_ACCESS_DENIED',
        message: 'No access to this business',
      });
    }

    const roles = [...new Set(memberships.map((m) => m.role.code))];
    const permissions = [
      ...new Set(
        memberships.flatMap((m) =>
          m.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];
    const isAdmin = roles.includes('BUSINESS_ADMIN') || permissions.includes('admin.*');

    user.businessId = businessId;
    user.roles = roles;
    user.permissions = permissions;
    (request as unknown as { businessId?: string }).businessId = businessId;

    const assignments = await this.prisma.userBranch.findMany({
      where: { userId: user.id, businessId, deletedAt: null },
      select: { branchId: true },
    });
    const allowedBranches = new Set(assignments.map((a) => a.branchId));

    const headerBranchId = headerValue(request.headers['x-branch-id']);
    if (headerBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: headerBranchId, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!branch) {
        throw new ForbiddenException({
          code: 'BRANCH_ACCESS_DENIED',
          message: 'Branch does not belong to this business',
        });
      }
      if (!isAdmin && (allowedBranches.size === 0 || !allowedBranches.has(headerBranchId))) {
        throw new ForbiddenException({
          code: 'BRANCH_ACCESS_DENIED',
          message: 'You are not assigned to this branch',
        });
      }
      user.branchId = headerBranchId;
    } else if (!isAdmin && allowedBranches.size === 1) {
      user.branchId = [...allowedBranches][0];
    }

    if (!isAdmin) {
      // Branch-scoped users cannot reference an unassigned branch in query or body.
      for (const source of [request.query, request.body]) {
        if (!source) continue;
        for (const field of BRANCH_FIELDS) {
          const value = source[field];
          if (typeof value !== 'string' || !value) continue;
          if (allowedBranches.size === 0 || !allowedBranches.has(value)) {
            throw new ForbiddenException({
              code: 'BRANCH_ACCESS_DENIED',
              message: `You are not assigned to the branch in ${field}`,
            });
          }
        }
      }

      // A single-branch user cannot read other branches by omitting the filter.
      if (request.query && allowedBranches.size === 1 && request.query['branchId'] === undefined) {
        request.query['branchId'] = [...allowedBranches][0];
      }
    }

    return true;
  }
}
