import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './controller/auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { UsersService } from './services/users.service';
import { RoleService } from './services/role.service';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from '../strategies/local.strategy';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { UsersController } from './controller/users.controller';
import { RoleController } from './controller/role.controller';
import { MailService } from '@/mail/mail.service';
import { MailModule } from '@/mail/mail.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { AddressAccessGuard } from '../guards/address-access.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Role.name,
        schema: RoleSchema,
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
    ProductsModule,
  ],
  controllers: [AuthController, UsersController, RoleController],
  providers: [
    UsersService,
    RoleService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    MailService,
    AddressAccessGuard,
    JwtAuthGuard,
    AdminGuard,
  ],
  exports: [UsersService, RoleService, MongooseModule],
})
export class UsersModule {}
