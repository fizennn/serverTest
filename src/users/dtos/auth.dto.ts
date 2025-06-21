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
}

export class AuthResponseDto {
  @ApiProperty()
  tokens!: TokensDto;

  @ApiProperty()
  user!: UserResponseDto;

  
}
