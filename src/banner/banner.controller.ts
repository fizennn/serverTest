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
  Req,
  Ip
} from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
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
  CreateBannerDto, 
  UpdateBannerDto, 
  BannerQueryDto,
  BannerClickDto 
} from './dto/banner.dto';
import { BannerType, BannerPosition } from './schema/banner.schema';
import { Request } from 'express';
import { BannersService } from './banner.service';

@ApiTags('Quản lý Banner (chỉ admin) ')
@Controller('banners')
export class BannersController {
  constructor(private bannersService: BannersService) {}

  // ============ ADMIN BANNER MANAGEMENT ============

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ 
    summary: 'Tạo banner mới (Admin only)',
    description: 'Chỉ admin mới có thể tạo banner. Banner hỗ trợ web link, deep link và internal link.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Banner được tạo thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        title: { type: 'string', example: 'Khuyến mãi Black Friday - Giảm đến 50%' },
        description: { type: 'string', example: 'Cơ hội duy nhất trong năm!' },
        imageUrl: { type: 'string', example: 'https://example.com/banner.jpg' },
        mobileImageUrl: { type: 'string', example: 'https://example.com/banner-mobile.jpg' },
        linkType: { type: 'string', example: 'web', enum: ['web', 'deeplink', 'internal'] },
        targetUrl: { type: 'string', example: 'https://example.com/promotion' },
        type: { type: 'string', example: 'promotion' },
        position: { type: 'string', example: 'top' },
        order: { type: 'number', example: 1 },
        isActive: { type: 'boolean', example: true },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        clickCount: { type: 'number', example: 0 },
        viewCount: { type: 'number', example: 0 },
        tags: { type: 'array', items: { type: 'string' } },
        openInNewTab: { type: 'boolean', example: false },
        createdBy: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có thể tạo banner' })
  async createBanner(@Body() createBannerDto: CreateBannerDto, @CurrentUser() user: UserDocument) {
    return this.bannersService.create(createBannerDto, user._id.toString());
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({ 
    summary: 'Lấy tất cả banner (Admin)',
    description: 'Admin có thể xem tất cả banner bao gồm cả những banner không active'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng banner mỗi trang', example: 10 })
  @ApiQuery({ name: 'isActive', required: false, description: 'Lọc theo trạng thái' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách banner',
    schema: {
      type: 'object',
      properties: {
        banners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              imageUrl: { type: 'string' },
              type: { type: 'string' },
              position: { type: 'string' },
              order: { type: 'number' },
              isActive: { type: 'boolean' },
              clickCount: { type: 'number' },
              viewCount: { type: 'number' },
              createdAt: { type: 'string' }
            }
          }
        },
        totalBanners: { type: 'number', example: 50 },
        totalPages: { type: 'number', example: 5 },
        currentPage: { type: 'number', example: 1 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false }
      }
    }
  })
  async getAllBannersAdmin(@Query() query: BannerQueryDto) {
    return this.bannersService.findAllForAdmin(query);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ 
    summary: 'Cập nhật banner (Admin only)',
    description: 'Chỉ admin mới có thể cập nhật banner. Có thể cập nhật một hoặc nhiều trường.'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiResponse({ 
    status: 200, 
    description: 'Cập nhật banner thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        title: { type: 'string', example: 'Khuyến mãi Black Friday - Giảm đến 50%' },
        description: { type: 'string', example: 'Cơ hội duy nhất trong năm!' },
        imageUrl: { type: 'string', example: 'https://example.com/banner.jpg' },
        mobileImageUrl: { type: 'string', example: 'https://example.com/banner-mobile.jpg' },
        linkType: { type: 'string', example: 'web', enum: ['web', 'deeplink', 'internal'] },
        targetUrl: { type: 'string', example: 'https://example.com/promotion' },
        type: { type: 'string', example: 'promotion' },
        position: { type: 'string', example: 'top' },
        order: { type: 'number', example: 1 },
        isActive: { type: 'boolean', example: true },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        clickCount: { type: 'number', example: 0 },
        viewCount: { type: 'number', example: 0 },
        tags: { type: 'array', items: { type: 'string' } },
        openInNewTab: { type: 'boolean', example: false },
        createdBy: { type: 'object' },
        lastUpdatedBy: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có thể cập nhật banner' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy banner' })
  async updateBanner(
    @Param('id') id: string, 
    @Body() updateBannerDto: UpdateBannerDto,
    @CurrentUser() user: UserDocument,
    @Req() req: Request
  ) {
    console.log('=== RAW REQUEST DEBUG ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Raw body type:', typeof req.body);
    console.log('Raw body:', req.body);
    console.log('Raw body stringified:', JSON.stringify(req.body));
    console.log('Has rawBody:', !!(req as any).rawBody);
    console.log('RawBody:', (req as any).rawBody);
    console.log('Parsed DTO:', updateBannerDto);
    console.log('DTO keys:', Object.keys(updateBannerDto));
    console.log('=== END RAW REQUEST DEBUG ===');
    
    return this.bannersService.update(id, updateBannerDto, user._id.toString());
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa banner (Admin only)',
    description: 'Chỉ admin mới có thể xóa banner'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiResponse({ status: 200, description: 'Xóa banner thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có thể xóa banner' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy banner' })
  async deleteBanner(@Param('id') id: string) {
    await this.bannersService.remove(id);
    return { message: 'Banner đã được xóa thành công' };
  }

  // ============ PUBLIC BANNER ENDPOINTS ============

  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách banner public',
    description: 'Lấy danh sách banner đang active và trong thời gian hiển thị. Tự động tăng view count.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách banner public',
    schema: {
      type: 'object',
      properties: {
        banners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              imageUrl: { type: 'string' },
              mobileImageUrl: { type: 'string' },
              linkType: { type: 'string' },
              targetUrl: { type: 'string' },
              type: { type: 'string' },
              position: { type: 'string' },
              order: { type: 'number' },
              openInNewTab: { type: 'boolean' },
              tags: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  })
  async getPublicBanners(
    @Query('type') type?: BannerType,
    @Query('position') position?: BannerPosition,
    @Req() req?: Request
  ) {
    return this.bannersService.findPublicBanners(type, position, req?.headers['user-agent']);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy chi tiết banner theo ID',
    description: 'Lấy thông tin chi tiết của một banner (chỉ banner đang active)'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiResponse({ 
    status: 200, 
    description: 'Chi tiết banner',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        imageUrl: { type: 'string' },
        mobileImageUrl: { type: 'string' },
        linkType: { type: 'string' },
        targetUrl: { type: 'string' },
        type: { type: 'string' },
        position: { type: 'string' },
        order: { type: 'number' },
        openInNewTab: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy banner' })
  async getBanner(@Param('id') id: string) {
    return this.bannersService.findById(id);
  }

  @Post(':id/click')
  @ApiOperation({ 
    summary: 'Ghi nhận click vào banner',
    description: 'Tăng click count cho banner khi user click vào. Có thể gửi thông tin tracking.'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiResponse({ 
    status: 200, 
    description: 'Click được ghi nhận thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Click đã được ghi nhận' },
        clickCount: { type: 'number', example: 126 },
        targetUrl: { type: 'string', example: 'https://example.com/promotion' },
        openInNewTab: { type: 'boolean', example: false }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy banner' })
  async trackBannerClick(
    @Param('id') id: string,
    @Body() bannerClickDto: BannerClickDto,
    @Ip() ipAddress: string,
    @Req() req: Request
  ) {
    const trackingData = {
      userAgent: req.headers['user-agent'],
      ipAddress,
      referrer: req.headers.referer,
      ...bannerClickDto
    };
    return this.bannersService.trackClick(id, trackingData);
  }

  // ============ ADMIN MANAGEMENT ENDPOINTS ============

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Put(':id/toggle-status')
  @ApiOperation({ 
    summary: 'Bật/tắt trạng thái banner (Admin)',
    description: 'Admin có thể bật/tắt hiển thị banner'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Đã ẩn banner' },
        isActive: { type: 'boolean', example: false }
      }
    }
  })
  async toggleBannerStatus(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.bannersService.toggleStatus(id, user._id.toString());
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Put(':id/reorder')
  @ApiOperation({ 
    summary: 'Thay đổi thứ tự banner (Admin)',
    description: 'Thay đổi thứ tự hiển thị của banner'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiResponse({ status: 200, description: 'Cập nhật thứ tự thành công' })
  async reorderBanner(
    @Param('id') id: string, 
    @Body('order') order: number,
    @CurrentUser() user: UserDocument
  ) {
    return this.bannersService.updateOrder(id, order, user._id.toString());
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Post('bulk-update-order')
  @ApiOperation({ 
    summary: 'Cập nhật thứ tự nhiều banner (Admin)',
    description: 'Cập nhật thứ tự cho nhiều banner cùng lúc'
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thứ tự thành công' })
  async bulkUpdateOrder(
    @Body() updates: Array<{ id: string; order: number }>,
    @CurrentUser() user: UserDocument
  ) {
    return this.bannersService.bulkUpdateOrder(updates, user._id.toString());
  }

  // ============ ANALYTICS ENDPOINTS ============

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get('admin/analytics')
  @ApiOperation({ 
    summary: 'Thống kê banner (Admin)',
    description: 'Lấy thống kê tổng quan về banner và hiệu suất'
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Ngày bắt đầu thống kê' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Ngày kết thúc thống kê' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thống kê banner',
    schema: {
      type: 'object',
      properties: {
        totalBanners: { type: 'number', example: 25 },
        activeBanners: { type: 'number', example: 20 },
        inactiveBanners: { type: 'number', example: 5 },
        totalClicks: { type: 'number', example: 15000 },
        totalViews: { type: 'number', example: 500000 },
        avgClickRate: { type: 'number', example: 3.0 },
        topPerformingBanners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              title: { type: 'string' },
              clickCount: { type: 'number' },
              viewCount: { type: 'number' },
              clickRate: { type: 'number' }
            }
          }
        },
        bannersByType: {
          type: 'object',
          properties: {
            home: { type: 'number' },
            promotion: { type: 'number' },
            category: { type: 'number' }
          }
        },
        bannersByPosition: {
          type: 'object',
          properties: {
            top: { type: 'number' },
            middle: { type: 'number' },
            bottom: { type: 'number' }
          }
        }
      }
    }
  })
  async getBannerAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.bannersService.getAnalytics(startDate, endDate);
  }

  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @Get(':id/analytics')
  @ApiOperation({ 
    summary: 'Thống kê chi tiết banner (Admin)',
    description: 'Lấy thống kê chi tiết của một banner cụ thể'
  })
  @ApiParam({ name: 'id', description: 'ID banner' })
  @ApiQuery({ name: 'period', required: false, description: 'Khoảng thời gian (7d, 30d, 90d)', example: '30d' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thống kê chi tiết banner',
    schema: {
      type: 'object',
      properties: {
        banner: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            type: { type: 'string' },
            position: { type: 'string' }
          }
        },
        totalClicks: { type: 'number', example: 1250 },
        totalViews: { type: 'number', example: 25000 },
        clickRate: { type: 'number', example: 5.0 },
        dailyStats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2024-11-01' },
              clicks: { type: 'number', example: 45 },
              views: { type: 'number', example: 890 },
              clickRate: { type: 'number', example: 5.06 }
            }
          }
        }
      }
    }
  })
  async getBannerDetailAnalytics(
    @Param('id') id: string,
    @Query('period') period: string = '30d'
  ) {
    return this.bannersService.getBannerAnalytics(id, period);
  }

  // ============ UTILITY ENDPOINTS ============

  @Get('types/list')
  @ApiOperation({ 
    summary: 'Lấy danh sách loại banner',
    description: 'Lấy tất cả loại banner có thể sử dụng'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách loại banner',
    schema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: { type: 'string', enum: Object.values(BannerType) }
        }
      }
    }
  })
  getBannerTypes() {
    return { types: Object.values(BannerType) };
  }

  @Get('positions/list')
  @ApiOperation({ 
    summary: 'Lấy danh sách vị trí banner',
    description: 'Lấy tất cả vị trí banner có thể sử dụng'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách vị trí banner',
    schema: {
      type: 'object',
      properties: {
        positions: {
          type: 'array',
          items: { type: 'string', enum: Object.values(BannerPosition) }
        }
      }
    }
  })
  getBannerPositions() {
    return { positions: Object.values(BannerPosition) };
  }
}