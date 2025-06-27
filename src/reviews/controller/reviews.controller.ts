import { Controller, Get, Post, Body, Param, Put, Delete, Query, NotFoundException } from '@nestjs/common';
import { ReviewsService } from '../services/reviews.service';
import { ReviewDto, CommentDto } from '../dtos/review.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

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

  @Get('product/:productId')
  @ApiOperation({ summary: 'Lấy review theo ID sản phẩm' })
  @ApiResponse({ status: 200, description: 'Chi tiết review theo sản phẩm', type: ReviewDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy review cho sản phẩm này' })
  async findByProductId(@Param('productId') productId: string) {
    const review = await this.reviewsService.findByProductId(productId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy review cho sản phẩm này');
    }
    return review;
  }

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

} 