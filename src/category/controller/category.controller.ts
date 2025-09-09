import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { CategoryDto, CategorySearchDto } from '../dtos/category.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminGuard } from 'src/guards/admin.guard';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Tạo mới category' })
  @ApiBody({ type: CategoryDto })
  @ApiResponse({ status: 201, description: 'Category đã được tạo.' })
  create(@Body() createCategoryDto: CategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Tìm kiếm danh sách category nâng cao',
    description: 'Tìm kiếm category với từ khóa, phân trang và sắp xếp. Mặc định chỉ lấy category active.'
  })
  @ApiQuery({ name: 'keyword', required: false, description: 'Từ khóa tìm kiếm (tên, mô tả)' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng item mỗi trang', example: 10 })
  @ApiQuery({ name: 'status', required: false, description: 'Trạng thái danh mục (true/false)', example: true })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sắp xếp theo (name, createdAt)', example: 'name' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Thứ tự sắp xếp (asc, desc)', example: 'asc' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách category với phân trang',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        pages: { type: 'number', example: 10 }
      }
    }
  })
  findAll(@Query() searchDto: CategorySearchDto) {
    return this.categoryService.findManyAdvanced(searchDto);
  }

  @Get('all')
  @ApiOperation({ summary: 'Lấy tất cả category active (không phân trang)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả category active.' })
  findAllSimple() {
    return this.categoryService.findAll();
  }

  @Get('admin/all')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Lấy tất cả category (bao gồm inactive) - Admin only' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả category (admin view).' })
  findAllAdmin() {
    return this.categoryService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin category theo id' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Thông tin category.' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cập nhật category theo id' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: CategoryDto })
  @ApiResponse({ status: 200, description: 'Category đã được cập nhật.' })
  update(@Param('id') id: string, @Body() updateCategoryDto: CategoryDto) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Xoá category theo id' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Category đã được xoá.' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  @Get('debug')
  @ApiOperation({ summary: 'Debug - Kiểm tra database category' })
  @ApiResponse({ status: 200, description: 'Thông tin debug database.' })
  async debug() {
    const totalCategories = await this.categoryService.debug();
    return {
      message: 'Debug category database',
      totalCategories,
      timestamp: new Date().toISOString()
    };
  }

  @Post('migrate-status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Cập nhật status cho category cũ - Admin only' })
  @ApiResponse({ status: 200, description: 'Cập nhật status thành công.' })
  async migrateStatus() {
    return this.categoryService.migrateStatus();
  }

  @Get(':id/products')
  @UseGuards(AdminGuard)
  @ApiOperation({ 
    summary: 'Kiểm tra sản phẩm đang sử dụng category - Admin only',
    description: 'Lấy danh sách sản phẩm đang sử dụng category trước khi xóa'
  })
  @ApiParam({ name: 'id', required: true, description: 'ID của category' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách sản phẩm đang sử dụng category',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              brand: { type: 'string' },
              status: { type: 'boolean' }
            }
          }
        },
        total: { type: 'number', description: 'Tổng số sản phẩm' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category không tồn tại' })
  async getProductsUsingCategory(@Param('id') id: string) {
    return this.categoryService.getProductsUsingCategory(id);
  }
} 