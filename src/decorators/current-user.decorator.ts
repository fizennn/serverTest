import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const CurrentUser = createParamDecorator(
  async (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    let user = request.user;
    
    // Debug: Log request.user để kiểm tra
    console.log('🔍 [CURRENT_USER_DECORATOR] request.user:', {
      hasUser: !!user,
      userKeys: user ? Object.keys(user) : [],
      userVouchers: user?.vouchers
    });
    
    if (!user) {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No valid authentication provided');
      }

      const token = authHeader.split(' ')[1];
      const jwtService = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });

      try {
        const payload = await jwtService.verifyAsync<any>(token);
        user = { _id: payload.sub, email: payload.email, isAdmin: payload.isAdmin };
        console.log('⚠️ [CURRENT_USER_DECORATOR] Fallback to JWT payload, user:', user);
      } catch {
        throw new UnauthorizedException('Invalid token');
      }
    }

    return user;
  }
);