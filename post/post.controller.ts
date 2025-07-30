import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { PostsService } from './post.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { 
  CreatePostDto, 
  UpdatePostDto, 
  CreateCommentDto, 
  UpdateCommentDto,
  PostQueryDto 
} from './dto/post.dto';

@ApiTags('Bài viết')
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  // ============ POST ENDPOINTS ============

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ 
    summary: 'Tạo bài viết mới (Admin only)',
    description: 'Chỉ admin mới có thể tạo bài viết. Bài viết có thể kèm theo nhiều ảnh và gắn sản phẩm liên quan.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Bài viết được tạo thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        title: { type: 'string', example: 'Khuyến mãi đặc biệt cho sản phẩm mới' },
        content: { type: 'string', example: 'Nội dung bài viết...' },
        author: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Admin' },
            email: { type: 'string', example: 'admin@example.com' }
          }
        },
        images: { type: 'array', items: { type: 'string' } },
        attachedProducts: { type: 'array', items: { type: 'string' } },
        likes: { type: 'array', items: { type: 'string' } },
        likeCount: { type: 'number', example: 0 },
        comments: { type: 'array', items: { type: 'object' } },
        commentCount: { type: 'number', example: 0 },
        tags: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean', example: true },
        isFeatured: { type: 'boolean', example: false },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có thể tạo bài viết' })
  async createPost(@Body() createPostDto: CreatePostDto, @CurrentUser() user: UserDocument) {
    return this.postsService.create(createPostDto, user._id.toString());
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách bài viết',
    description: 'Lấy danh sách bài viết với phân trang, tìm kiếm và lọc. Chỉ hiển thị bài viết đang active.'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng bài viết mỗi trang', example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tiêu đề hoặc nội dung' })
  @ApiQuery({ name: 'tag', required: false, description: 'Lọc theo tag' })
  @ApiQuery({ name: 'featured', required: false, description: 'Chỉ lấy bài viết nổi bật' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sắp xếp theo', enum: ['createdAt', 'likeCount', 'commentCount'] })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Thứ tự sắp xếp', enum: ['asc', 'desc'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách bài viết',
    schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              author: { type: 'object' },
              images: { type: 'array', items: { type: 'string' } },
              attachedProducts: { type: 'array' },
              likeCount: { type: 'number' },
              commentCount: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' } },
              isFeatured: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        },
        totalPosts: { type: 'number', example: 50 },
        totalPages: { type: 'number', example: 5 },
        currentPage: { type: 'number', example: 1 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false }
      }
    }
  })
  async getPosts(@Query() query: PostQueryDto) {
    return this.postsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({ 
    summary: 'Lấy bài viết nổi bật',
    description: 'Lấy danh sách bài viết được đánh dấu là nổi bật'
  })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết nổi bật' })
  async getFeaturedPosts() {
    return this.postsService.findFeatured();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy chi tiết bài viết theo ID',
    description: 'Lấy thông tin chi tiết của một bài viết bao gồm comments và thông tin sản phẩm gắn kèm'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ 
    status: 200, 
    description: 'Chi tiết bài viết',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        author: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' }
          }
        },
        images: { type: 'array', items: { type: 'string' } },
        attachedProducts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
              averagePrice: { type: 'string' }
            }
          }
        },
        likes: { type: 'array', items: { type: 'string' } },
        likeCount: { type: 'number' },
        comments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              user: { type: 'object' },
              content: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        },
        commentCount: { type: 'number' },
        tags: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async getPost(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ 
    summary: 'Cập nhật bài viết (Admin only)',
    description: 'Chỉ admin mới có thể cập nhật bài viết'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ status: 200, description: 'Cập nhật bài viết thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có thể cập nhật bài viết' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa bài viết (Admin only)',
    description: 'Chỉ admin mới có thể xóa bài viết'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ status: 200, description: 'Xóa bài viết thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có thể xóa bài viết' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async deletePost(@Param('id') id: string) {
    await this.postsService.remove(id);
    return { message: 'Bài viết đã được xóa thành công' };
  }

  // ============ LIKE ENDPOINTS ============

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/like')
  @ApiOperation({ 
    summary: 'Like/Unlike bài viết',
    description: 'Thích hoặc bỏ thích bài viết. Nếu đã like thì sẽ unlike và ngược lại.'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã thích bài viết' },
        likeCount: { type: 'number', example: 26 },
        isLiked: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async toggleLike(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.postsService.toggleLike(id, user._id.toString());
  }

  @Get(':id/likes')
  @ApiOperation({ 
    summary: 'Lấy danh sách người like bài viết',
    description: 'Lấy thông tin những người đã like bài viết'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách người like',
    schema: {
      type: 'object',
      properties: {
        likeCount: { type: 'number', example: 25 },
        likes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              profilePicture: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getPostLikes(@Param('id') id: string) {
    return this.postsService.getPostLikes(id);
  }

  // ============ COMMENT ENDPOINTS ============

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/comments')
  @ApiOperation({ 
    summary: 'Thêm comment vào bài viết',
    description: 'Người dùng đã đăng nhập có thể comment vào bài viết với text và ảnh'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ 
    status: 201, 
    description: 'Comment được tạo thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            profilePicture: { type: 'string' }
          }
        },
        content: { type: 'string' },
        images: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async addComment(
    @Param('id') id: string, 
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: UserDocument
  ) {
    return this.postsService.addComment(id, createCommentDto, user._id.toString());
  }

  @Get(':id/comments')
  @ApiOperation({ 
    summary: 'Lấy danh sách comment của bài viết',
    description: 'Lấy tất cả comment của một bài viết với phân trang'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng comment mỗi trang', example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách comment',
    schema: {
      type: 'object',
      properties: {
        comments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  profilePicture: { type: 'string' }
                }
              },
              content: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        },
        totalComments: { type: 'number', example: 50 },
        totalPages: { type: 'number', example: 3 },
        currentPage: { type: 'number', example: 1 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false }
      }
    }
  })
  async getPostComments(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return this.postsService.getPostComments(id, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':postId/comments/:commentId')
  @ApiOperation({ 
    summary: 'Cập nhật comment',
    description: 'Người dùng có thể cập nhật comment của chính mình. Admin có thể cập nhật bất kỳ comment nào.'
  })
  @ApiParam({ name: 'postId', description: 'ID bài viết' })
  @ApiParam({ name: 'commentId', description: 'ID comment' })
  @ApiResponse({ status: 200, description: 'Cập nhật comment thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật comment này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết hoặc comment' })
  async updateComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: UserDocument
  ) {
    return this.postsService.updateComment(postId, commentId, updateCommentDto, user._id.toString(), user.isAdmin);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':postId/comments/:commentId')
  @ApiOperation({ 
    summary: 'Xóa comment',
    description: 'Người dùng có thể xóa comment của chính mình. Admin có thể xóa bất kỳ comment nào.'
  })
  @ApiParam({ name: 'postId', description: 'ID bài viết' })
  @ApiParam({ name: 'commentId', description: 'ID comment' })
  @ApiResponse({ status: 200, description: 'Xóa comment thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa comment này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết hoặc comment' })
  async deleteComment(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: UserDocument
  ) {
    await this.postsService.deleteComment(postId, commentId, user._id.toString(), user.isAdmin);
    return { message: 'Comment đã được xóa thành công' };
  }

  // ============ ADMIN ENDPOINTS ============

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({ 
    summary: 'Lấy tất cả bài viết (Admin)',
    description: 'Admin có thể xem tất cả bài viết bao gồm cả những bài đã bị ẩn'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng bài viết mỗi trang', example: 10 })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái (active/inactive)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả bài viết' })
  async getAllPostsAdmin(@Query() query: any) {
    return this.postsService.findAllForAdmin(query);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Put(':id/toggle-featured')
  @ApiOperation({ 
    summary: 'Bật/tắt trạng thái nổi bật (Admin)',
    description: 'Admin có thể đánh dấu hoặc bỏ đánh dấu bài viết nổi bật'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã đánh dấu bài viết nổi bật' },
        isFeatured: { type: 'boolean', example: true }
      }
    }
  })
  async toggleFeatured(@Param('id') id: string) {
    return this.postsService.toggleFeatured(id);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Put(':id/toggle-status')
  @ApiOperation({ 
    summary: 'Bật/tắt trạng thái hiển thị (Admin)',
    description: 'Admin có thể ẩn hoặc hiện bài viết'
  })
  @ApiParam({ name: 'id', description: 'ID bài viết' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã ẩn bài viết' },
        isActive: { type: 'boolean', example: false }
      }
    }
  })
  async toggleStatus(@Param('id') id: string) {
    return this.postsService.toggleStatus(id);
  }

  // ============ STATISTICS ENDPOINTS ============

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('admin/statistics')
  @ApiOperation({ 
    summary: 'Thống kê bài viết (Admin)',
    description: 'Lấy thống kê tổng quan về bài viết'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thống kê bài viết',
    schema: {
      type: 'object',
      properties: {
        totalPosts: { type: 'number', example: 150 },
        activePosts: { type: 'number', example: 130 },
        inactivePosts: { type: 'number', example: 20 },
        featuredPosts: { type: 'number', example: 10 },
        totalLikes: { type: 'number', example: 2500 },
        totalComments: { type: 'number', example: 800 },
        avgLikesPerPost: { type: 'number', example: 16.67 },
        avgCommentsPerPost: { type: 'number', example: 5.33 },
        topLikedPosts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              likeCount: { type: 'number' }
            }
          }
        },
        topCommentedPosts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              commentCount: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getPostStatistics() {
    return this.postsService.getStatistics();
  }
}