import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { Notification, NotificationSchema } from './schema/Notification.schema';
import { User, UserSchema } from '@/users/schemas/user.schema';
import { Role, RoleSchema } from '@/users/schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Notification.name, // ← Thêm Notification schema
        schema: NotificationSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Role.name,
        schema: RoleSchema,
      },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
