import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Số điện thoại người nhận',
    example: '0123456789',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    description: 'Địa chỉ chi tiết',
    example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  address!: string;


  @ApiProperty({
    description: 'Tên địa chỉ',
    example: 'Nhà riêng',
    type: String
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateAddressDto {
  @ApiProperty({
    description: 'Số điện thoại người nhận',
    example: '0987654321',
    type: String,
    required: false
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Địa chỉ chi tiết',
    example: '456 Tòa nhà DEF, Phường UVW, Quận 3, TP.HCM',
    type: String,
    required: false
  })
  @IsString()
  @IsOptional()
  address?: string;
} 