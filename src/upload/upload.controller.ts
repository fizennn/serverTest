import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UploadService } from './upload.service';

// DTO cho response
export class UploadImageResponseDto {
  success?: boolean;
  message?: string;
  data?: {
    originalName: string;
    filename: string;
    size: number;
    mimetype: string;
    url: string;
  };
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload ảnh (tối đa 5MB)',
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh (jpg, jpeg, png, gif, webp)',
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload thành công',
    type: UploadImageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Lỗi upload: file không hợp lệ hoặc quá lớn',
  })
  async uploadImage(
    @UploadedFile() file: any,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để upload!');
    }

    const fileInfo = this.uploadService.getFileInfo(file);

    return {
      success: true,
      message: 'Upload ảnh thành công!',
      data: fileInfo,
    };
  }
}