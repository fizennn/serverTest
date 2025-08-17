import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { CreateVoucherDto, UpdateVoucherDto } from '../dtos/voucher.dto';
import { NotificationService } from '@/notifications/notifications.service';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    private notificationService: NotificationService,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const now = new Date();
    if (createVoucherDto.end <= now) {
      throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày hiện tại');
    }
    
    // Set default value cho isDisable nếu không được cung cấp
    const voucherData = {
      ...createVoucherDto,
      isDisable: createVoucherDto.isDisable ?? false
    };
    
    const voucher = new this.voucherModel(voucherData);
    const createdVoucher = await voucher.save();

    // Gửi thông báo cho tất cả người dùng khi admin tạo voucher mới
    await this.notificationService.sendNotificationToAllUsers(
      'Voucher mới',
      `Có voucher mới: Giảm ${createVoucherDto.disCount}% cho ${createVoucherDto.type === 'item' ? 'sản phẩm' : 'vận chuyển'}`,
      'promotion',
      {
        type: 'voucher',
        voucherId: createdVoucher._id.toString(),
        action: 'created',
        voucherType: createVoucherDto.type,
        discount: createVoucherDto.disCount
      }
    );

    return createdVoucher;
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: Voucher[], total: number, pages: number }> {
    const skip = (page - 1) * limit;
    const findQuery = { isDisable: false };
    const [data, total] = await Promise.all([
      this.voucherModel.find(findQuery).skip(skip).limit(limit).exec(),
      this.voucherModel.countDocuments(findQuery).exec()
    ]);
    const pages = Math.ceil(total / limit);
    return { data, total, pages };
  }

  async findManyAdvanced(searchDto: any): Promise<{ data: Voucher[], total: number, pages: number }> {
    try {
      const {
        keyword,
        page = '1',
        limit = '10',
        type,
        isDisable,
        startDate,
        endDate,
        isActive,
        isExpired,
        minDiscount,
        maxDiscount,
        minCondition,
        maxCondition,
        minLimit,
        maxLimit,
        minStock,
        maxStock,
        hasStock,
        userId,
        hasUsers,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeExpired,
        includeDisabled,
      } = searchDto;

      const pageSize = isNaN(Number(limit)) ? 10 : parseInt(limit);
      const currentPage = isNaN(Number(page)) ? 1 : parseInt(page);

      // Xây dựng query filter
      let filter: any = {};

      // Tìm kiếm theo từ khóa
      if (keyword) {
        const decodedKeyword = decodeURIComponent(keyword);
        
        // Kiểm tra xem keyword có phải là ObjectId hợp lệ không
        const isObjectId = Types.ObjectId.isValid(decodedKeyword);
        
        if (isObjectId) {
          // Nếu là ObjectId, tìm kiếm theo _id
          filter._id = new Types.ObjectId(decodedKeyword);
        } else {
          // Nếu không phải ObjectId, tìm kiếm theo text (có thể mở rộng sau)
          // Hiện tại voucher không có field text để search, nên chỉ search theo ID
          filter._id = new Types.ObjectId(decodedKeyword);
        }
      }

      // Filter theo loại voucher
      if (type && ['item', 'ship'].includes(type)) {
        filter.type = type;
      }

      // Filter theo trạng thái disable
      if (isDisable !== undefined) {
        filter.isDisable = isDisable === 'true';
      } else if (includeDisabled !== 'true') {
        // Mặc định không bao gồm voucher đã disable trừ khi có yêu cầu
        filter.isDisable = false;
      }

      // Filter theo thời gian
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.start = { $gte: start };
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          filter.end = { $lte: end };
        }
      }

      // Filter theo trạng thái active/expired
      const now = new Date();
      if (isActive === 'true') {
        filter.start = { $lte: now };
        filter.end = { $gte: now };
      } else if (isExpired === 'true') {
        filter.end = { $lt: now };
      } else if (includeExpired !== 'true') {
        // Mặc định chỉ lấy voucher chưa hết hạn trừ khi có yêu cầu
        filter.end = { $gte: now };
      }

      // Filter theo % giảm giá
      if (minDiscount && !isNaN(Number(minDiscount))) {
        filter.disCount = { ...filter.disCount, $gte: Number(minDiscount) };
      }
      if (maxDiscount && !isNaN(Number(maxDiscount))) {
        filter.disCount = { ...filter.disCount, $lte: Number(maxDiscount) };
      }

      // Filter theo điều kiện
      if (minCondition && !isNaN(Number(minCondition))) {
        filter.condition = { ...filter.condition, $gte: Number(minCondition) };
      }
      if (maxCondition && !isNaN(Number(maxCondition))) {
        filter.condition = { ...filter.condition, $lte: Number(maxCondition) };
      }

      // Filter theo giới hạn giảm giá
      if (minLimit && !isNaN(Number(minLimit))) {
        filter.limit = { ...filter.limit, $gte: Number(minLimit) };
      }
      if (maxLimit && !isNaN(Number(maxLimit))) {
        filter.limit = { ...filter.limit, $lte: Number(maxLimit) };
      }

      // Filter theo stock
      if (minStock && !isNaN(Number(minStock))) {
        filter.stock = { ...filter.stock, $gte: Number(minStock) };
      }
      if (maxStock && !isNaN(Number(maxStock))) {
        filter.stock = { ...filter.stock, $lte: Number(maxStock) };
      }
      if (hasStock === 'true') {
        filter.stock = { ...filter.stock, $gt: 0 };
      } else if (hasStock === 'false') {
        filter.stock = 0;
      }

      // Filter theo user
      if (userId) {
        if (!Types.ObjectId.isValid(userId)) {
          throw new BadRequestException('User ID không hợp lệ');
        }
        const userObjectId = new Types.ObjectId(userId);
        filter.userId = { $in: [userObjectId] };
      }

      if (hasUsers === 'true') {
        filter.userId = { $exists: true, $ne: [] };
      } else if (hasUsers === 'false') {
        filter.$or = [
          { userId: { $exists: false } },
          { userId: [] }
        ];
      }

      // Xây dựng sort
      let sort: any = {};
      const validSortFields = [
        'disCount',
        'condition',
        'limit',
        'stock',
        'start',
        'end',
        'createdAt',
        'updatedAt'
      ];
      const validSortOrders = ['asc', 'desc'];
      
      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      } else {
        sort.createdAt = -1; // Mặc định sắp xếp theo ngày tạo mới nhất
      }

      // Thực hiện query
      const skip = (currentPage - 1) * pageSize;
      const [data, total] = await Promise.all([
        this.voucherModel.find(filter).sort(sort).skip(skip).limit(pageSize).exec(),
        this.voucherModel.countDocuments(filter).exec()
      ]);

      const pages = Math.ceil(total / pageSize);
      return { data, total, pages };
    } catch (error) {
      throw new BadRequestException(`Lỗi tìm kiếm voucher: ${error.message}`);
    }
  }

  async findActive(): Promise<Voucher[]> {
    const now = new Date();
    return await this.voucherModel.find({
      start: { $lte: now },
      end: { $gte: now },
      isDisable: false
    }).exec();
  }

  async findAllVouchers(): Promise<Voucher[]> {
    return await this.voucherModel.find({}).exec();
  }

  async findVouchersByUserId(userId: string): Promise<Voucher[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    
    const userObjectId = new Types.ObjectId(userId);
    
    // Debug: Lấy tất cả voucher để kiểm tra
    const allVouchers = await this.voucherModel.find({}).exec();
    console.log(`Total vouchers in database: ${allVouchers.length}`);
    
    // Debug: Kiểm tra từng voucher
    allVouchers.forEach((voucher, index) => {
      console.log(`Voucher ${index + 1}:`, {
        id: voucher._id,
        type: voucher.type,
        isDisable: voucher.isDisable,
        userIdCount: voucher.userId?.length || 0,
        userIds: voucher.userId?.map(id => id.toString()) || [],
        hasUserAccess: voucher.userId?.some(id => id.equals(userObjectId)) || false
      });
    });
    
    // Lấy tất cả voucher có user ID (không filter isDisable)
    const userVouchers = await this.voucherModel.find({
      userId: { $in: [userObjectId] }
    }).exec();
    
    console.log(`Found ${userVouchers.length} vouchers for user ${userId}`);
    userVouchers.forEach((voucher, index) => {
      console.log(`User voucher ${index + 1}:`, {
        id: voucher._id,
        type: voucher.type,
        isDisable: voucher.isDisable
      });
    });
    
    return userVouchers;
  }

  async findOne(id: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }
    
    const voucher = await this.voucherModel.findById(id).exec();
    if (!voucher || voucher.isDisable) {
      throw new NotFoundException('Voucher not found');
    }
    return voucher;
  }

  async update(id: string, updateVoucherDto: UpdateVoucherDto): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }

    // Kiểm tra voucher có tồn tại không
    const existingVoucher = await this.voucherModel.findById(id).exec();
    if (!existingVoucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Kiểm tra voucher có bị disable không
    if (existingVoucher.isDisable) {
      throw new BadRequestException('Không thể cập nhật voucher đã bị vô hiệu hóa');
    }

    // Validation cho ngày tháng
    if (updateVoucherDto.end) {
      const now = new Date();
      if (updateVoucherDto.end <= now) {
        throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày hiện tại');
      }
    }

    if (updateVoucherDto.start && updateVoucherDto.end) {
      if (updateVoucherDto.start >= updateVoucherDto.end) {
        throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
      }
    }

    // Validation cho type
    if (updateVoucherDto.type && !['item', 'ship'].includes(updateVoucherDto.type)) {
      throw new BadRequestException('Loại voucher phải là "item" hoặc "ship"');
    }

    // Validation cho discount
    if (updateVoucherDto.disCount !== undefined) {
      if (updateVoucherDto.disCount <= 0 || updateVoucherDto.disCount > 100) {
        throw new BadRequestException('Phần trăm giảm giá phải từ 1 đến 100');
      }
    }

    // Validation cho condition và limit
    if (updateVoucherDto.condition !== undefined && updateVoucherDto.condition < 0) {
      throw new BadRequestException('Điều kiện tối thiểu không được âm');
    }

    if (updateVoucherDto.limit !== undefined && updateVoucherDto.limit < 0) {
      throw new BadRequestException('Giới hạn giảm giá không được âm');
    }

    if (updateVoucherDto.stock !== undefined && updateVoucherDto.stock < 0) {
      throw new BadRequestException('Stock không được âm');
    }

    // Xử lý userId array nếu có
    let updateData: any = { ...updateVoucherDto };
    if (updateVoucherDto.userId) {
      // Validate userId array
      for (const userId of updateVoucherDto.userId) {
        if (!Types.ObjectId.isValid(userId)) {
          throw new BadRequestException(`Invalid user ID: ${userId}`);
        }
      }
      // Convert string array to ObjectId array
      updateData.userId = updateVoucherDto.userId.map(id => new Types.ObjectId(id));
    }

    const voucher = await this.voucherModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    
    return voucher;
  }

  async bulkUpdate(voucherIds: string[], updateData: UpdateVoucherDto): Promise<any> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const voucherId of voucherIds) {
      try {
        await this.update(voucherId, updateData);
        results.push({
          voucherId,
          success: true,
          message: 'Updated successfully'
        });
        successCount++;
      } catch (error) {
        results.push({
          voucherId,
          success: false,
          message: error.message
        });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results
    };
  }

  async duplicateVoucher(id: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }

    const originalVoucher = await this.voucherModel.findById(id).exec();
    if (!originalVoucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Tạo voucher mới với thông tin từ voucher gốc
    const voucherData = {
      type: originalVoucher.type,
      disCount: originalVoucher.disCount,
      condition: originalVoucher.condition,
      limit: originalVoucher.limit,
      stock: originalVoucher.stock,
      start: originalVoucher.start,
      end: originalVoucher.end,
      isDisable: false, // Voucher mới luôn được enable
      userId: [] // Reset danh sách user
    };

    const newVoucher = new this.voucherModel(voucherData);
    const createdVoucher = await newVoucher.save();

    return createdVoucher;
  }

  async getVoucherDetail(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }

    const voucher = await this.voucherModel.findById(id).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Tính toán thống kê
    const now = new Date();
    const isActive = voucher.start <= now && voucher.end >= now && !voucher.isDisable;
    const isExpired = voucher.end < now;
    const isNotStarted = voucher.start > now;
    const usedCount = voucher.userId.length;
    const remainingStock = voucher.stock;

    return {
      ...voucher.toObject(),
      statistics: {
        isActive,
        isExpired,
        isNotStarted,
        usedCount,
        remainingStock,
        totalUsers: voucher.userId.length
      }
    };
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }

    const result = await this.voucherModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Voucher not found');
    }
  }

  async disable(id: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }

    const voucher = await this.voucherModel
      .findByIdAndUpdate(id, { isDisable: true }, { new: true })
      .exec();
    
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }
    return voucher;
  }

  async enable(id: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID');
    }

    const existingVoucher = await this.voucherModel.findById(id).exec();
    if (!existingVoucher) {
      throw new NotFoundException('Voucher not found');
    }

    // Kiểm tra xem voucher có hết hạn chưa
    const now = new Date();
    if (existingVoucher.end < now) {
      throw new BadRequestException('Không thể kích hoạt voucher đã hết hạn');
    }

    const voucher = await this.voucherModel
      .findByIdAndUpdate(id, { isDisable: false }, { new: true })
      .exec();
    
    return voucher;
  }

  async addUserToVoucher(voucherId: string, userId: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    const now = new Date();
    if (voucher.start > now) {
      throw new BadRequestException('Voucher chưa đến ngày bắt đầu');
    }
    if (voucher.end < now) {
      throw new BadRequestException('Voucher đã hết hạn');
    }

    if (voucher.isDisable) {
      throw new BadRequestException('Voucher is disabled');
    }

    // Kiểm tra xem user đã có trong danh sách chưa
    if (voucher.userId.includes(new Types.ObjectId(userId))) {
      throw new BadRequestException('User already has access to this voucher');
    }

    // Kiểm tra stock
    if (voucher.stock <= 0) {
      throw new BadRequestException('Voucher is out of stock');
    }

    // Thêm user và giảm stock
    voucher.userId.push(new Types.ObjectId(userId));
    voucher.stock -= 1;

    return await voucher.save();
  }

  async removeUserFromVoucher(voucherId: string, userId: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const userIndex = voucher.userId.findIndex(id => id.equals(userObjectId));
    
    if (userIndex === -1) {
      throw new BadRequestException('User does not have access to this voucher');
    }

    // Xóa user và tăng stock
    voucher.userId.splice(userIndex, 1);
    voucher.stock += 1;

    return await voucher.save();
  }

  async removeVoucherFromUser(voucherId: string, userId: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid voucher ID or user ID');
    }

    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const userIndex = voucher.userId.findIndex(id => id.equals(userObjectId));
    
    if (userIndex === -1) {
      throw new BadRequestException('User does not have access to this voucher');
    }

    // Xóa user khỏi voucher và tăng stock
    voucher.userId.splice(userIndex, 1);
    voucher.stock += 1;

    return await voucher.save();
  }

  async returnVoucherUsage(voucherId: string, userId: string): Promise<Voucher> {
    // Alias cho removeUserFromVoucher để hoàn trả voucher khi hủy đơn hàng
    return this.removeUserFromVoucher(voucherId, userId);
  }

  async checkVoucherValidity(voucherId: string, userId: string, amount: number): Promise<{ valid: boolean; discount: number; message?: string }> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      return { valid: false, discount: 0, message: 'Invalid voucher or user ID' };
    }

    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      return { valid: false, discount: 0, message: 'Voucher not found' };
    }

    if (voucher.isDisable) {
      return { valid: false, discount: 0, message: 'Voucher is disabled' };
    }

    const now = new Date();
    if (voucher.start > now || voucher.end < now) {
      return { valid: false, discount: 0, message: 'Voucher is not active' };
    }

    if (voucher.stock <= 0) {
      return { valid: false, discount: 0, message: 'Voucher is out of stock' };
    }

    if (amount < voucher.condition) {
      return { valid: false, discount: 0, message: `Minimum order amount is ${voucher.condition}` };
    }

    const userObjectId = new Types.ObjectId(userId);
    const hasAccess = voucher.userId.some(id => id.equals(userObjectId));
    if (!hasAccess) {
      return { valid: false, discount: 0, message: 'User does not have access to this voucher' };
    }

    const discount = (amount * voucher.disCount) / 100;
    return { valid: true, discount };
  }

  async calculateVoucherDiscount(
    voucherId: string, 
    userId: string, 
    subtotal: number, 
    shipCost: number
  ): Promise<{ 
    valid: boolean; 
    itemDiscount: number; 
    shipDiscount: number; 
    message?: string;
    voucher?: Voucher;
  }> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: 'Invalid voucher or user ID' 
      };
    }

    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: 'Voucher not found' 
      };
    }

    if (voucher.isDisable) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: 'Voucher is disabled' 
      };
    }

    const now = new Date();
    if (voucher.start > now || voucher.end < now) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: 'Voucher is not active' 
      };
    }

    if (voucher.stock <= 0) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: 'Voucher is out of stock' 
      };
    }

    // Kiểm tra điều kiện tối thiểu
    if (subtotal < voucher.condition) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: `Minimum order amount is ${voucher.condition}` 
      };
    }

    const userObjectId = new Types.ObjectId(userId);
    const hasAccess = voucher.userId.some(id => id.equals(userObjectId));
    if (!hasAccess) {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: 'User does not have access to this voucher' 
      };
    }

    let itemDiscount = 0;
    let shipDiscount = 0;

    // Tính toán discount theo type
    if (voucher.type === 'item') {
      const calculatedItemDiscount = (subtotal * voucher.disCount) / 100;
      itemDiscount = Math.min(calculatedItemDiscount, voucher.limit);
    } else if (voucher.type === 'ship') {
      const calculatedShipDiscount = (shipCost * voucher.disCount) / 100;
      shipDiscount = Math.min(calculatedShipDiscount, voucher.limit);
    } else {
      return { 
        valid: false, 
        itemDiscount: 0, 
        shipDiscount: 0, 
        message: `Invalid voucher type: ${voucher.type}` 
      };
    }

    return { 
      valid: true, 
      itemDiscount, 
      shipDiscount, 
      voucher 
    };
  }
} 