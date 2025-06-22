import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'hoangvanthanhdev@gmail.com"',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '100b22afe1cc9d82',
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
  name!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty()
  profilePicture!: string;

  @ApiProperty()
  isActive?: boolean;

  @ApiProperty()
  dateOfBirth?: Date;

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
        address: { type: 'string' }
      }
    },
    description: 'Danh sách địa chỉ chi tiết của user',
    required: false 
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
        _id: { type: 'string' },
        code: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        disCount: { type: 'number' },
        condition: { type: 'number' },
        start: { type: 'string', format: 'date-time' },
        end: { type: 'string', format: 'date-time' },
        stock: { type: 'number' },
        isDisable: { type: 'boolean' }
      }
    },
    description: 'Danh sách voucher của user',
    required: false 
  })
  vouchers?: any[];
}

export class AuthResponseDto {
  @ApiProperty()
  tokens!: TokensDto;

  @ApiProperty()
  user!: UserResponseDto;

  
}
