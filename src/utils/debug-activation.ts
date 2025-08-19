import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Script debug để kiểm tra quy trình kích hoạt
export async function debugActivation(userId: string, token: string) {
  const configService = new ConfigService();
  const jwtService = new JwtService({
    secret: configService.get<string>('JWT_ACCESS_SECRET'),
  });

  try {
    console.log('=== DEBUG ACTIVATION ===');
    console.log('User ID:', userId);
    console.log('Token:', token);
    console.log('JWT Secret:', configService.get<string>('JWT_ACCESS_SECRET'));

    // Verify token
    const payload = await jwtService.verifyAsync(token);
    console.log('Token payload:', payload);

    // Check if token is valid
    if (payload.sub !== userId) {
      console.log('❌ User ID mismatch');
      return false;
    }

    if (payload.type !== 'activation') {
      console.log('❌ Token type mismatch');
      return false;
    }

    console.log('✅ Token is valid');
    return true;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return false;
  }
}
