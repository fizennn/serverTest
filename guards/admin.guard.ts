import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest();

    if (!request.user?.isAdmin) {
      throw new UnauthorizedException('Tài khoản của bạn không được sử dụng chức năng này ( chỉ admin )');
    }

    return true;
  }
}
