import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface PermissionMetadata {
  permission: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!permission) {
      return true; // Không có permission requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User không được xác thực');
    }

    // Kiểm tra quyền admin trước
    if (user.isAdmin) {
      return true;
    }

    // Kiểm tra quyền hạn từ role
    let hasPermission = false;
    
    if (user.roleId && typeof user.roleId === 'object') {
      // Nếu user có role và role đã được populate
      const role = user.roleId as any;
      hasPermission = role[permission] || false;
    } else if (user.roleId) {
      // Nếu user có roleId nhưng chưa được populate
      // Trong trường hợp này, chúng ta cần populate role trước
      // Tạm thời return false và log warning
      console.warn(`User ${user._id} has roleId but role not populated in PermissionGuard`);
      hasPermission = false;
    } else {
      // User không có role
      hasPermission = false;
    }
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `Không có quyền truy cập. Cần quyền: ${permission}`,
      );
    }

    return true;
  }
}

// Decorator để đánh dấu permission requirement
export const RequirePermission = (permission: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('permission', permission, descriptor.value);
    return descriptor;
  };
}; 