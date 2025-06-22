import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@Injectable()
export class AddressAccessGuard implements CanActivate {
  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private adminGuard: AdminGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.params.userId;
    const user = request.user;

    // Nếu là admin, cho phép truy cập
    try {
      await this.adminGuard.canActivate(context);
      return true;
    } catch (error) {
      // Không phải admin, kiểm tra JWT
      try {
        await this.jwtAuthGuard.canActivate(context);
        
        // Kiểm tra user có quyền truy cập địa chỉ của chính mình
        if (user && user.sub === userId) {
          return true;
        }
        
        throw new ForbiddenException('Bạn chỉ có thể xem địa chỉ của chính mình');
      } catch (jwtError) {
        throw new ForbiddenException('Token không hợp lệ hoặc đã hết hạn');
      }
    }
  }
} 