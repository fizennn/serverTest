import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { CategoryDto } from '../dtos/category.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Lấy danh sách tất cả category' })
  @ApiResponse({ status: 200, description: 'Danh sách category.' })
  findAll() {
    return this.categoryService.findAll();
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
} 