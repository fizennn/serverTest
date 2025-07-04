import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { CreateUploadDto, UpdateUploadDto, UploadResponseDto } from './dtos/upload.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserDocument } from '@/users/schemas/user.schema';

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
        description: {
          type: 'string',
          description: 'Mô tả file (tùy chọn)',
        },
        tags: {
          type: 'string',
          description: 'Thẻ phân loại file (chuỗi, ví dụ: "product" hoặc "product,banner")',
          example: 'product,banner',
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
    @Body() createUploadDto: CreateUploadDto,
    @CurrentUser() user?: UserDocument,
  ): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh để upload!');
    }

    const uploadRecord = await this.uploadService.createUploadRecord(
      file, 
      createUploadDto, 
      user?._id.toString()
    );

    return {
      success: true,
      message: 'Upload ảnh thành công!',
      data: {
        originalName: uploadRecord.originalName,
        filename: uploadRecord.filename,
        size: uploadRecord.size,
        mimetype: uploadRecord.mimetype,
        url: uploadRecord.url,
      },
    };
  }

  @Post('link')
  @ApiBody({
    description: 'Thêm link ảnh (không upload file)',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Link ảnh', example: 'https://example.com/image.jpg' },
        description: { type: 'string', description: 'Mô tả file (tùy chọn)' },
        tags: { type: 'string', description: 'Thẻ phân loại file (chuỗi, ví dụ: "product" hoặc "product,banner")', example: 'product,banner' },
      },
      required: ['url'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thêm link ảnh thành công',
    type: UploadImageResponseDto,
  })
  async addImageLink(
    @Body() body: { url: string; description?: string; tags?: string },
    @CurrentUser() user?: UserDocument,
  ): Promise<UploadImageResponseDto> {
    if (!body.url) {
      throw new BadRequestException('Vui lòng nhập link ảnh!');
    }
    const uploadRecord = await this.uploadService.createImageLinkRecord(body, user?._id.toString());
    return {
      success: true,
      message: 'Thêm link ảnh thành công!',
      data: {
        originalName: uploadRecord.originalName,
        filename: uploadRecord.filename,
        size: uploadRecord.size,
        mimetype: uploadRecord.mimetype,
        url: uploadRecord.url,
      },
    };
  }

  @Get()
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng item mỗi trang', example: 10 })
  @ApiQuery({ name: 'tags', required: false, description: 'Lọc theo tags', example: 'product' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Lọc theo trạng thái', example: true })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tên hoặc mô tả', example: 'anh' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy danh sách upload thành công',
    type: [UploadResponseDto],
  })
  async findAll(@Query() query: any) {
    return await this.uploadService.findAll(query);
  }

  @Get('stats')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thống kê upload files',
  })
  async getStats() {
    return await this.uploadService.getStats();
  }

  @Get('tags/:tags')
  @ApiParam({ name: 'tags', description: 'Tags cần tìm (phân cách bằng dấu phẩy)', example: 'product,banner' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy files theo tags thành công',
    type: [UploadResponseDto],
  })
  async findByTags(@Param('tags') tags: string) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    return await this.uploadService.findByTags(tagArray);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID của upload record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy thông tin upload thành công',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy upload record',
  })
  async findOne(@Param('id') id: string) {
    return await this.uploadService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiParam({ name: 'id', description: 'ID của upload record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật upload thành công',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy upload record',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUploadDto: UpdateUploadDto,
  ) {
    return await this.uploadService.update(id, updateUploadDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID của upload record' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa upload thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa file upload thành công' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy upload record',
  })
  async remove(@Param('id') id: string) {
    return await this.uploadService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('test/:id')
  @ApiParam({ name: 'id', description: 'ID của upload record để test xóa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test xóa upload thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Test xóa file upload thành công' },
        fileInfo: { type: 'object' }
      }
    }
  })
  async testRemove(@Param('id') id: string) {
    const upload = await this.uploadService.findOne(id);
    
    // Log thông tin file trước khi xóa
    console.log('=== THÔNG TIN FILE TRƯỚC KHI XÓA ===');
    console.log('ID:', upload._id);
    console.log('Tên file:', upload.filename);
    console.log('Đường dẫn lưu trong DB:', upload.path);
    console.log('Thư mục hiện tại:', process.cwd());
    
    // Kiểm tra file có tồn tại không
    const fs = require('fs');
    const path = require('path');
    
    console.log('=== KIỂM TRA FILE ===');
    console.log('File tồn tại tại đường dẫn DB:', fs.existsSync(upload.path));
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const possiblePath = path.join(uploadsDir, upload.filename);
    console.log('File tồn tại tại đường dẫn uploads:', fs.existsSync(possiblePath));
    console.log('Đường dẫn uploads:', uploadsDir);
    console.log('Đường dẫn có thể:', possiblePath);
    
    // Thực hiện xóa
    const result = await this.uploadService.remove(id);
    
    return {
      message: result.message,
      fileInfo: {
        id: upload._id,
        filename: upload.filename,
        path: upload.path,
        existsAtPath: fs.existsSync(upload.path),
        existsAtUploads: fs.existsSync(possiblePath)
      }
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/check-integrity')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Kiểm tra tính toàn vẹn của files',
  })
  async checkFileIntegrity() {
    return await this.uploadService.checkFileIntegrity();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/fix-paths')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sửa chữa đường dẫn files',
    schema: {
      type: 'object',
      properties: {
        fixed: { type: 'number', example: 5 },
        total: { type: 'number', example: 10 }
      }
    }
  })
  async fixFilePaths() {
    return await this.uploadService.fixFilePaths();
  }
}
