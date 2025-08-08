import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'huylqph49142@gmail.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'ExponentPushToken[@AiHrVEHOXdZUxT6W27cDd]',
  })
  @IsOptional()
  deviceId!: string;

  @ApiProperty({
    example: '123456',
  })
  @IsString()
  password!: string;
}

export class TokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  @IsString()
  accessToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  @IsString()
  refreshToken!: string;
}

export interface TokenPayload {
  sub: string; // user id
  email: string;
  isAdmin: boolean;
  type: 'access' | 'refresh';
  jti?: string; // Add this for refresh tokens
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  deviceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty()
  profilePicture!: string;

  @ApiProperty()
  isActive?: boolean;

  @ApiProperty()
  dateOfBirth?: Date | string;

  @ApiProperty()
  lastLogin?: Date;

  @ApiProperty()
  loyaltyPoints?: number;

  @ApiProperty()
  phoneNumber?: string;

  @ApiProperty()
  address?: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
      },
    },
    description: 'Danh sách địa chỉ chi tiết của user',
    required: false,
  })
  addresses?: any[];

  @ApiProperty()
  city?: string;

  @ApiProperty()
  country?: string;

  @ApiProperty()
  postalCode?: string;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
        type: {
          type: 'string',
          example: 'item',
          enum: ['item', 'ship'],
          description:
            'Loại voucher: item (giảm giá sản phẩm) hoặc ship (giảm giá vận chuyển)',
        },
        disCount: {
          type: 'number',
          example: 10,
          description: 'Phần trăm giảm giá (%)',
        },
        condition: {
          type: 'number',
          example: 500000,
          description: 'Điều kiện tối thiểu để sử dụng voucher (VNĐ)',
        },
        limit: {
          type: 'number',
          example: 100000,
          description: 'Giới hạn số tiền giảm giá tối đa (VNĐ)',
        },
        start: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T00:00:00.000Z',
          description: 'Ngày bắt đầu hiệu lực',
        },
        end: {
          type: 'string',
          format: 'date-time',
          example: '2024-12-31T23:59:59.999Z',
          description: 'Ngày kết thúc hiệu lực',
        },
        stock: {
          type: 'number',
          example: 50,
          description: 'Số lượng voucher có sẵn',
        },
        isDisable: {
          type: 'boolean',
          example: false,
          description: 'Trạng thái vô hiệu hóa',
        },
      },
    },
    description:
      'Danh sách tất cả voucher mà user có quyền sử dụng (bao gồm cả voucher bị disable)',
    required: false,
  })
  vouchers?: any[];

  @ApiProperty({
    description: 'ID của vai trò của user',
    example: '665f1e2b2c8b2a0012a4e123',
    required: false,
  })
  roleId?: any;
}

export class AuthResponseDto {
  @ApiProperty()
  tokens!: TokensDto;

  @ApiProperty()
  user!: UserResponseDto;
}
