import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class ProfileDto {
  @IsString()
  @MinLength(4, { message: 'Username is too short.' })
  @MaxLength(20, { message: 'Username is too long.' })
  @IsOptional()
  name?: string;

  @ValidateIf(o => o.profilePicture !== undefined)
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ValidateIf(o => o.country !== undefined)
  @IsString()
  @IsOptional()
  country?: string;

  @ValidateIf(o => o.dateOfBirth !== undefined)
  @IsString()
  @IsOptional()
  dateOfBirth?: string; // có thể chuyển sang kiểu Date nếu backend xử lý, tạm thời để string
}
