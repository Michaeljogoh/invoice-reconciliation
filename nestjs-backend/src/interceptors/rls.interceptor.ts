import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { getDatabaseClient } from '../db/database.config';

export interface RlsContext {
  userId?: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
}

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private configService: ConfigService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Extract RLS context from the authenticated user
    const rlsContext: RlsContext = {
      userId: user?.id,
      tenantId: user?.tenantId,
      isSuperAdmin: user?.roles?.includes('super_admin') || false,
    };

    // Store RLS context in the request for use in services
    request.rlsContext = rlsContext;

    // Set PostgreSQL session variables for RLS
    await this.setRlsSessionVariables(rlsContext);

    return next.handle();
  }

  private async setRlsSessionVariables(context: RlsContext): Promise<void> {
    try {
      const client = getDatabaseClient(this.configService);
      
      // Set session variables that RLS policies will reference
      await client.unsafe(
        `SET app.current_user_id = '${context.userId || ''}'`
      );
      await client.unsafe(
        `SET app.current_org_id = '${context.tenantId || ''}'`
      );
      await client.unsafe(
        `SET app.is_super_admin = '${context.isSuperAdmin || false}'`
      );

      // For debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('RLS Context Set:', {
          userId: context.userId,
          tenantId: context.tenantId,
          isSuperAdmin: context.isSuperAdmin,
        });
      }
    } catch (error) {
      console.error('❌ Failed to set RLS session variables:', error);
    }
  }
}