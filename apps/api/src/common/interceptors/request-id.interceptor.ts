import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
    req.headers['x-request-id'] = requestId;

    return next.handle().pipe(
      tap(() => {
        void res.header('X-Request-Id', requestId);
      }),
    );
  }
}
