import {
  BadRequestException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isString } from 'class-validator';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {

    const request = context.switchToHttp().getRequest();
    const { email, password } = request.body;
    if (
      email.length === 0 ||
      password.length === 0 ||
      !isString(password) ||
      !isString(email)
    ) {
      throw new BadRequestException('Vui lòng điền email và password.');
    }
    const parentCanActivate = (await super.canActivate(context)) as boolean;
    return parentCanActivate;
  }
}
