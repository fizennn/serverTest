import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AddressAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.params.userId;
    const user = request.user;

    console.log(user);
    console.log(userId);

    // Nếu chưa đăng nhập hoặc không có user trên request
    if (!user) {
      throw new ForbiddenException('Token không hợp lệ hoặc đã hết hạn');
    }

    console.log(user._id.toString());

    // Nếu là admin thì cho phép
    if (user.isAdmin) {
      return true;
    }

    // Nếu là chính user đó thì cho phép
    if (user._id.toString() === userId) {
      return true;
    }

    // Ngược lại cấm truy cập
    throw new ForbiddenException('Bạn chỉ có thể thao tác với địa chỉ của chính mình');
  }
} 