import { Controller, Get, Post, Body, Param, Put, Delete, Query, NotFoundException } from '@nestjs/common';
import { ReviewsService } from '../services/reviews.service';
import { ReviewDto, CommentDto } from '../dtos/review.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminGuard } from '@/guards/admin.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm review cho sản phẩm' })
  @ApiResponse({ status: 201, description: 'Thêm review thành công' })
  async create(@Body() reviewDto: ReviewDto) {
    const review = await this.reviewsService.create(reviewDto);
    return { reviews: review.comments };
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách review theo sản phẩm, có phân trang comments' })
  @ApiResponse({ status: 200, description: 'Danh sách comments theo sản phẩm' })
  @ApiQuery({ name: 'productId', required: true, description: 'ID sản phẩm' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng comment mỗi trang', example: 10 })
  async getCommentsByProduct(
    @Query('productId') productId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewsService.getCommentsByProduct(productId, Number(page), Number(limit));
  }

  @Get('comment/:id')
  @ApiOperation({ summary: 'Lấy comment theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết comment' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy comment' })
  async getCommentById(@Param('id') id: string) {
    const comment = await this.reviewsService.getCommentById(id);
    if (!comment) {
      throw new NotFoundException('Không tìm thấy comment với ID này');
    }
    return comment;
  }

  // @Get('product/:productId')
  // @ApiOperation({ summary: 'Lấy review theo ID sản phẩm' })
  // @ApiResponse({ status: 200, description: 'Chi tiết review theo sản phẩm', type: ReviewDto })
  // @ApiResponse({ status: 404, description: 'Không tìm thấy review cho sản phẩm này' })
  // async findByProductId(@Param('productId') productId: string) {
  //   const review = await this.reviewsService.findByProductId(productId);
  //   if (!review) {
  //     throw new NotFoundException('Không tìm thấy review cho sản phẩm này');
  //   }
  //   return review;
  // }

  @Put('product/:productId')
  @ApiOperation({ summary: 'Cập nhật review theo ID sản phẩm' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: ReviewDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy review cho sản phẩm này' })
  async updateByProductId(@Param('productId') productId: string, @Body() reviewDto: Partial<ReviewDto>) {
    const review = await this.reviewsService.updateByProductId(productId, reviewDto);
    if (!review) {
      throw new NotFoundException('Không tìm thấy review cho sản phẩm này');
    }
    return review;
  }

  @Put('comment/:id')
  @ApiOperation({ summary: 'Cập nhật comment theo ID' })
  @ApiResponse({ status: 200, description: 'Cập nhật comment thành công' })
  async updateCommentById(@Param('id') id: string, @Body() commentDto: Partial<CommentDto>) {
    return this.reviewsService.updateCommentById(id, commentDto);
  }

  @Delete('product/:productId')
  @ApiOperation({ summary: 'Xóa review theo ID sản phẩm' })
  @ApiResponse({ status: 200, description: 'Xóa thành công'})
  @ApiResponse({ status: 404, description: 'Không tìm thấy review cho sản phẩm này' })
  async deleteByProductId(@Param('productId') productId: string) {
    const result = await this.reviewsService.deleteByProductId(productId);
    if (!result) {
      throw new NotFoundException('Không tìm thấy review cho sản phẩm này');
    }
    return { message: 'Xóa review thành công' };
  }

  @Delete('comment/:id')
  @ApiOperation({ summary: 'Xóa comment theo ID' })
  @ApiResponse({ status: 200, description: 'Xóa comment thành công'})
  async deleteCommentById(@Param('id') id: string) {
    return this.reviewsService.deleteCommentById(id);
  }

  @Post('sync-all-ratings')
  @UseGuards(AdminGuard)
  @ApiOperation({ 
    summary: 'Đồng bộ rating và numReviews cho tất cả products',
    description: 'Duyệt tất cả reviews và cập nhật rating, numReviews cho tất cả products. Chỉ admin mới có quyền sử dụng.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Đồng bộ thành công',
    schema: {
      type: 'object',
      properties: {
        totalProducts: { type: 'number', example: 100 },
        updatedProducts: { type: 'number', example: 25 },
        productsWithReviews: { type: 'number', example: 80 },
        productsWithoutReviews: { type: 'number', example: 20 },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              productName: { type: 'string' },
              oldRating: { type: 'number' },
              newRating: { type: 'number' },
              oldNumReviews: { type: 'number' },
              newNumReviews: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async syncAllProductRatings() {
    return this.reviewsService.syncAllProductRatings();
  }

  @Post('sync-product-rating/:productId')
  @ApiOperation({ 
    summary: 'Đồng bộ rating và numReviews cho một product cụ thể',
    description: 'Cập nhật rating và numReviews cho một product dựa trên reviews hiện có.'
  })
  @ApiParam({ 
    name: 'productId', 
    description: 'ID của product cần đồng bộ',
    example: '60d21b4967d0d8992e610c90'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Đồng bộ thành công',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        productName: { type: 'string' },
        oldRating: { type: 'number' },
        newRating: { type: 'number' },
        oldNumReviews: { type: 'number' },
        newNumReviews: { type: 'number' },
        hasReviews: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Product không tồn tại' 
  })
  async syncProductRating(@Param('productId') productId: string) {
    return this.reviewsService.syncProductRating(productId);
  }

} 