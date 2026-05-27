import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** 有 token 则解析用户；无 token 或无效时不报错，req.user 为空 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const result = super.canActivate(context);
    if (result instanceof Promise) {
      return result.then(
        () => true,
        () => true,
      );
    }
    return true;
  }

  override handleRequest<TUser>(err: Error | null, user: TUser): TUser | undefined {
    if (err) return undefined;
    return user ?? undefined;
  }
}
