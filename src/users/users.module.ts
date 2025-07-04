import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './controller/auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './services/users.service';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../strategies/local.strategy';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { UsersController } from './controller/users.controller';
import { MailService } from '@/mail/mail.service';
import { MailModule } from '@/mail/mail.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { AddressAccessGuard } from '../guards/address-access.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '1y' },
    }),
    MailModule,
    VouchersModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    UsersService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    MailService,
    AddressAccessGuard,
    JwtAuthGuard,
    AdminGuard,
  ],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
