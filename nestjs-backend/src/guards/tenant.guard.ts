import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth.guard';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin bypasses tenant checks
    if (user.roles.includes('super_admin')) {
      return true;
    }

    // Extract tenant ID from request
    const requestedTenantId = this.extractTenantId(request);

    if (!requestedTenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    // Check if user belongs to the requested tenant
    if (user.tenantId !== requestedTenantId) {
      throw new ForbiddenException(
        'You do not have access to this tenant\'s resources',
      );
    }

    return true;
  }

  private extractTenantId(request: AuthenticatedRequest): string | null {
    // Try to get tenant ID from various sources
    // 1. From route params (e.g., /tenants/:tenantId/...)
    const tenantId = request.params.tenantId;
    if (tenantId) {
      return tenantId;
    }

    // 2. From GraphQL variables
    if (request.body && request.body.variables) {
      return request.body.variables.tenantId || request.body.variables.tenant_id;
    }

    // 3. From headers (alternative approach)
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId) {
      return Array.isArray(headerTenantId) ? headerTenantId[0] : headerTenantId;
    }

    return null;
  }
}