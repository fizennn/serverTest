import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Banner,
  BannerDocument,
  BannerType,
  BannerPosition,
} from './schema/banner.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  CreateBannerDto,
  UpdateBannerDto,
  BannerQueryDto,
} from './dto/banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ============ BANNER CRUD OPERATIONS ============

  async create(
    createBannerDto: CreateBannerDto,
    createdById: string,
  ): Promise<BannerDocument> {
    // Kiểm tra user có tồn tại và là admin không
    const creator = await this.userModel.findById(createdById);
    if (!creator) {
      throw new NotFoundException('Không tìm thấy user');
    }
    if (!creator.isAdmin) {
      throw new ForbiddenException('Chỉ admin mới có thể tạo banner');
    }

    // Validate dates
    if (createBannerDto.startDate && createBannerDto.endDate) {
      const startDate = new Date(createBannerDto.startDate);
      const endDate = new Date(createBannerDto.endDate);
      if (startDate >= endDate) {
        throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    // Validate target URL based on link type
    this.validateTargetUrl(createBannerDto.linkType, createBannerDto.targetUrl);

    const banner = new this.bannerModel({
      ...createBannerDto,
      createdBy: createdById,
      clickCount: 0,
      viewCount: 0,
      startDate: createBannerDto.startDate
        ? new Date(createBannerDto.startDate)
        : undefined,
      endDate: createBannerDto.endDate
        ? new Date(createBannerDto.endDate)
        : undefined,
    });

    return banner.save();
  }

  async findAllForAdmin(query: BannerQueryDto): Promise<any> {
    const {
      page = 1,
      limit = 10,
      type,
      position,
      isActive,
      search,
      tag,
      sortBy = 'order',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const filter: any = {};

    if (type) filter.type = type;
    if (position) filter.position = position;
    if (isActive !== undefined) filter.isActive = isActive;
    if (tag) filter.tags = { $in: [tag] };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('Filter:', filter);
    console.log('Query params:', query);
    
    const [banners, totalBanners] = await Promise.all([
      this.bannerModel
        .find(filter)
        .populate('createdBy', 'name email')
        .populate('lastUpdatedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.bannerModel.countDocuments(filter),
    ]);

    console.log('Found banners:', banners.length);
    console.log('Total banners:', totalBanners);

    const totalPages = Math.ceil(totalBanners / limit);

    return {
      banners,
      totalBanners,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findPublicBanners(
    type?: BannerType,
    position?: BannerPosition,
    userAgent?: string,
  ): Promise<any> {
    const now = new Date();

    // Build filter for active banners
    const filter: any = {
      isActive: true,
    };

    // Add start date filter - banner phải đã bắt đầu hoặc chưa có start date
    const startDateFilter = {
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } },
      ],
    };

    // Add end date filter - banner chưa kết thúc hoặc chưa có end date
    const endDateFilter = {
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    };

    // Combine filters
    filter.$and = [startDateFilter, endDateFilter];

    if (type) filter.type = type;
    if (position) filter.position = position;

    console.log('Public filter:', filter);
    console.log('Current time:', now);

    const banners = await this.bannerModel
      .find(filter)
      .select('-createdBy -lastUpdatedBy -clickCount -viewCount -notes')
      .sort({ position: 1, order: 1 })
      .lean();

    console.log('Found banners:', banners.length);

    // Track views (async, không chờ kết quả)
    if (banners.length > 0) {
      this.trackViews(
        banners.map(b => b._id),
        userAgent,
      );
    }

    return { banners };
  }

  async findById(id: string): Promise<BannerDocument> {
    const now = new Date();

    const banner = await this.bannerModel
      .findOne({
        _id: id,
        isActive: true,
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: { $lte: now } },
        ],
        $and: [
          {
            $or: [
              { endDate: { $exists: false } },
              { endDate: null },
              { endDate: { $gte: now } },
            ],
          },
        ],
      })
      .select('-createdBy -lastUpdatedBy -notes');

    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }

    return banner;
  }

  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
    updatedById: string,
  ): Promise<BannerDocument> {
    // Validate dates if provided
    if (updateBannerDto.startDate && updateBannerDto.endDate) {
      const startDate = new Date(updateBannerDto.startDate);
      const endDate = new Date(updateBannerDto.endDate);
      if (startDate >= endDate) {
        throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    // Validate target URL if provided
    if (updateBannerDto.linkType && updateBannerDto.targetUrl) {
      this.validateTargetUrl(
        updateBannerDto.linkType,
        updateBannerDto.targetUrl,
      );
    }

    const updateData: any = {
      ...updateBannerDto,
      lastUpdatedBy: updatedById,
    };

    if (updateBannerDto.startDate) {
      updateData.startDate = new Date(updateBannerDto.startDate);
    }
    if (updateBannerDto.endDate) {
      updateData.endDate = new Date(updateBannerDto.endDate);
    }

    const banner = await this.bannerModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email');

    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }

    return banner;
  }

  async remove(id: string): Promise<void> {
    const result = await this.bannerModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Không tìm thấy banner');
    }
  }

  // ============ TRACKING OPERATIONS ============

  async trackClick(bannerId: string, trackingData: any): Promise<any> {
    const banner = await this.bannerModel.findById(bannerId);
    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }

    // Tăng click count
    banner.clickCount += 1;
    await banner.save();

    // TODO: Có thể lưu tracking data vào collection riêng để phân tích chi tiết
    // await this.saveClickTracking(bannerId, trackingData);

    return {
      message: 'Click đã được ghi nhận',
      clickCount: banner.clickCount,
      targetUrl: banner.targetUrl,
      openInNewTab: banner.openInNewTab,
    };
  }

  private async trackViews(
    bannerIds: string[],
    userAgent?: string,
  ): Promise<void> {
    try {
      // Bulk update view count
      await this.bannerModel.updateMany(
        { _id: { $in: bannerIds } },
        { $inc: { viewCount: 1 } },
      );

      // TODO: Có thể lưu view tracking data để phân tích chi tiết
      // await this.saveViewTracking(bannerIds, userAgent);
    } catch (error) {
      // Log error but don't throw to avoid affecting main flow
      console.error('Error tracking views:', error);
    }
  }

  // ============ ADMIN MANAGEMENT ============

  async toggleStatus(id: string, updatedById: string): Promise<any> {
    const banner = await this.bannerModel.findById(id);
    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }

    banner.isActive = !banner.isActive;
    banner.lastUpdatedBy = updatedById as any;
    await banner.save();

    return {
      message: banner.isActive
        ? 'Đã bật hiển thị banner'
        : 'Đã tắt hiển thị banner',
      isActive: banner.isActive,
    };
  }

  async updateOrder(
    id: string,
    order: number,
    updatedById: string,
  ): Promise<BannerDocument> {
    const banner = await this.bannerModel.findByIdAndUpdate(
      id,
      {
        order,
        lastUpdatedBy: updatedById,
      },
      { new: true },
    );

    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }

    return banner;
  }

  async bulkUpdateOrder(
    updates: Array<{ id: string; order: number }>,
    updatedById: string,
  ): Promise<any> {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: {
          order: update.order,
          lastUpdatedBy: updatedById,
        },
      },
    }));

    const result = await this.bannerModel.bulkWrite(bulkOps);

    return {
      message: 'Cập nhật thứ tự thành công',
      modifiedCount: result.modifiedCount,
    };
  }

  // ============ ANALYTICS ============

  async getAnalytics(startDate?: string, endDate?: string): Promise<any> {
    const dateFilter: any = {};

    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = {
        ...dateFilter.createdAt,
        $lte: new Date(endDate),
      };
    }

    const [totalBanners, activeBanners, bannerStats, topPerformingBanners] =
      await Promise.all([
        this.bannerModel.countDocuments(dateFilter),
        this.bannerModel.countDocuments({ ...dateFilter, isActive: true }),
        this.bannerModel.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: null,
              totalClicks: { $sum: '$clickCount' },
              totalViews: { $sum: '$viewCount' },
            },
          },
        ]),
        this.bannerModel
          .find({ ...dateFilter, isActive: true })
          .select('title clickCount viewCount')
          .sort({ clickCount: -1 })
          .limit(10)
          .lean(),
      ]);

    // Group by type and position
    const [bannersByType, bannersByPosition] = await Promise.all([
      this.bannerModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.bannerModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$position', count: { $sum: 1 } } },
      ]),
    ]);

    const stats = bannerStats[0] || { totalClicks: 0, totalViews: 0 };
    const avgClickRate =
      stats.totalViews > 0
        ? Math.round((stats.totalClicks / stats.totalViews) * 10000) / 100
        : 0;

    // Add click rate to top performing banners
    const topPerformingWithRate = topPerformingBanners.map(banner => ({
      ...banner,
      clickRate:
        banner.viewCount > 0
          ? Math.round((banner.clickCount / banner.viewCount) * 10000) / 100
          : 0,
    }));

    return {
      totalBanners,
      activeBanners,
      inactiveBanners: totalBanners - activeBanners,
      totalClicks: stats.totalClicks,
      totalViews: stats.totalViews,
      avgClickRate,
      topPerformingBanners: topPerformingWithRate,
      bannersByType: bannersByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      bannersByPosition: bannersByPosition.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  async getBannerAnalytics(
    bannerId: string,
    period: string = '30d',
  ): Promise<any> {
    const banner = await this.bannerModel
      .findById(bannerId)
      .select('title type position clickCount viewCount');
    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }

    // Calculate period
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const clickRate =
      banner.viewCount > 0
        ? Math.round((banner.clickCount / banner.viewCount) * 10000) / 100
        : 0;

    // TODO: Implement daily stats if you have tracking collection
    // For now, return mock daily data
    const dailyStats = this.generateMockDailyStats(
      days,
      banner.clickCount,
      banner.viewCount,
    );

    return {
      banner: {
        _id: banner._id,
        title: banner.title,
        type: banner.type,
        position: banner.position,
      },
      totalClicks: banner.clickCount,
      totalViews: banner.viewCount,
      clickRate,
      dailyStats,
    };
  }

  // ============ UTILITY METHODS ============

  private validateTargetUrl(linkType: string, targetUrl: string): void {
    switch (linkType) {
      case 'web':
        if (!targetUrl.match(/^https?:\/\/.+/)) {
          throw new BadRequestException(
            'Web link phải bắt đầu bằng http:// hoặc https://',
          );
        }
        break;
      case 'deeplink':
        if (!targetUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/)) {
          throw new BadRequestException(
            'Deep link không đúng định dạng (vd: myapp://...)',
          );
        }
        break;
      case 'internal':
        if (!targetUrl.startsWith('/')) {
          throw new BadRequestException('Internal link phải bắt đầu bằng /');
        }
        break;
      default:
        throw new BadRequestException('Loại link không hợp lệ');
    }
  }

  private generateMockDailyStats(
    days: number,
    totalClicks: number,
    totalViews: number,
  ): any[] {
    const stats = [];
    const avgDailyClicks = Math.round(totalClicks / days);
    const avgDailyViews = Math.round(totalViews / days);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Add some randomness to make it look realistic
      const clicks = Math.max(
        0,
        avgDailyClicks +
          Math.round((Math.random() - 0.5) * avgDailyClicks * 0.5),
      );
      const views = Math.max(
        0,
        avgDailyViews + Math.round((Math.random() - 0.5) * avgDailyViews * 0.3),
      );
      const clickRate =
        views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0;

      stats.push({
        date: date.toISOString().split('T')[0],
        clicks,
        views,
        clickRate,
      });
    }

    return stats;
  }
}
