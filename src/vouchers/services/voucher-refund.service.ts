import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { NotificationService } from '@/notifications/notifications.service';
import { User } from '@/users/schemas/user.schema';

export interface CreateRefundVoucherDto {
  userId: string;
  refundAmount: number;
  orderId?: string;
  returnOrderId?: string;
  reason?: string;
  voucherType?: 'item' | 'ship';
  condition?: number;
  validDays?: number;
  description?: string;
}

export interface RefundVoucherResult {
  voucher: VoucherDocument;
  message: string;
  refundAmount: number;
  voucherValue: number;
}

@Injectable()
export class VoucherRefundService {
  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Tạo voucher cho việc hoàn tiền
   * @param createRefundVoucherDto Thông tin tạo voucher refund
   * @returns Kết quả tạo voucher
   */
  async createRefundVoucher(
    createRefundVoucherDto: CreateRefundVoucherDto,
  ): Promise<RefundVoucherResult> {
    console.log('=== BẮT ĐẦU TẠO VOUCHER REFUND ===');
    console.log('Input data:', JSON.stringify(createRefundVoucherDto, null, 2));
    
    const {
      userId,
      refundAmount,
      orderId,
      returnOrderId,
      reason = 'Hoàn tiền từ yêu cầu trả hàng',
      voucherType = 'item',
      condition,
      validDays = 30,
      description,
    } = createRefundVoucherDto;

    // Validate input
    console.log('=== BƯỚC 1: VALIDATE INPUT ===');
    if (!userId || !Types.ObjectId.isValid(userId)) {
      console.log('❌ Lỗi: ID người dùng không hợp lệ:', userId);
      throw new BadRequestException('ID người dùng không hợp lệ');
    }
    console.log('✅ User ID hợp lệ:', userId);

    if (!refundAmount || refundAmount <= 0) {
      console.log('❌ Lỗi: Số tiền hoàn không hợp lệ:', refundAmount);
      throw new BadRequestException('Số tiền hoàn phải lớn hơn 0');
    }
    console.log('✅ Số tiền hoàn hợp lệ:', refundAmount);

    // Kiểm tra user tồn tại
    console.log('=== BƯỚC 2: KIỂM TRA USER ===');
    const user = await this.userModel.findById(userId);
    if (!user) {
      console.log('❌ Lỗi: Không tìm thấy user với ID:', userId);
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    console.log('✅ Tìm thấy user:', user.name || user.email);

    // Tính toán giá trị voucher
    console.log('=== BƯỚC 3: TÍNH TOÁN VOUCHER ===');
    const voucherValue = this.calculateVoucherValue(refundAmount);
    console.log('💰 Giá trị voucher được tính:', voucherValue, 'VND');
    
    // Tính toán điều kiện sử dụng voucher
    const voucherCondition = condition || this.calculateVoucherCondition(voucherValue);
    console.log('📋 Điều kiện sử dụng voucher:', voucherCondition, 'VND');
    
    // Tính toán thời gian hiệu lực
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);
    console.log('📅 Thời gian hiệu lực:', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      validDays: validDays
    });

    // Tạo voucher data
    console.log('=== BƯỚC 4: TẠO VOUCHER DATA ===');
    const voucherData = {
      type: voucherType,
      disCount: 100, // Giảm 100% tương đương với giá trị voucher
      condition: voucherCondition,
      limit: voucherValue, // Giới hạn giảm giá bằng giá trị voucher
      stock: 0, // Voucher hoàn trả không cần stock vì chỉ dành riêng cho 1 user
      start: startDate,
      end: endDate,
      userId: [new Types.ObjectId(userId)],
      isDisable: false,
    };
    console.log('📝 Voucher data:', JSON.stringify(voucherData, null, 2));

    // Tạo voucher
    console.log('=== BƯỚC 5: LƯU VOUCHER VÀO DATABASE ===');
    const voucher = new this.voucherModel(voucherData);
    console.log('🔄 Đang lưu voucher...');
    const createdVoucher = await voucher.save();
    console.log('✅ Voucher đã được tạo thành công!');
    console.log('🆔 Voucher ID:', createdVoucher._id.toString());
    console.log('📊 Voucher details:', {
      type: createdVoucher.type,
      disCount: createdVoucher.disCount,
      condition: createdVoucher.condition,
      limit: createdVoucher.limit,
      stock: createdVoucher.stock,
      userId: createdVoucher.userId
    });

    // Tạo message thông báo
    console.log('=== BƯỚC 6: TẠO MESSAGE THÔNG BÁO ===');
    const message = this.createNotificationMessage(
      refundAmount,
      voucherValue,
      reason,
      validDays,
      orderId,
      returnOrderId,
    );
    console.log('📨 Message thông báo:', message);

    // Gửi thông báo cho user
    console.log('=== BƯỚC 7: GỬI THÔNG BÁO CHO USER ===');
    try {
      await this.sendRefundNotification(
        userId,
        message,
        createdVoucher._id.toString(),
        refundAmount,
        voucherValue,
        orderId,
        returnOrderId,
      );
      console.log('✅ Đã gửi thông báo cho user thành công');
    } catch (error) {
      console.log('❌ Lỗi gửi thông báo cho user:', error.message);
    }

    // Gửi thông báo cho admin
    console.log('=== BƯỚC 8: GỬI THÔNG BÁO CHO ADMIN ===');
    try {
      await this.sendAdminNotification(
        userId,
        refundAmount,
        voucherValue,
        orderId,
        returnOrderId,
        reason,
      );
      console.log('✅ Đã gửi thông báo cho admin thành công');
    } catch (error) {
      console.log('❌ Lỗi gửi thông báo cho admin:', error.message);
    }

    console.log('=== BƯỚC 9: HOÀN THÀNH ===');
    const result = {
      voucher: createdVoucher,
      message: 'Voucher hoàn tiền đã được tạo thành công',
      refundAmount,
      voucherValue,
    };
    console.log('🎉 Kết quả cuối cùng:', JSON.stringify(result, null, 2));
    console.log('=== KẾT THÚC TẠO VOUCHER REFUND ===');
    
    return result;
  }

  /**
   * Tính toán giá trị voucher dựa trên số tiền hoàn
   * Có thể tăng giá trị để khuyến khích mua hàng
   */
  private calculateVoucherValue(refundAmount: number): number {
    // Logic: Tăng 10% giá trị để khuyến khích mua hàng
    const bonusPercentage = 0.1; // 10%
    const result = Math.round(refundAmount * (1 + bonusPercentage));
    console.log(`🧮 Tính toán voucher: ${refundAmount} × 1.1 = ${result} VND`);
    return result;
  }

  /**
   * Tính toán điều kiện sử dụng voucher
   * Điều kiện thường bằng 50-80% giá trị voucher
   */
  private calculateVoucherCondition(voucherValue: number): number {
    const conditionPercentage = 0.6; // 60% giá trị voucher
    const result = Math.round(voucherValue * conditionPercentage);
    console.log(`📋 Tính toán điều kiện: ${voucherValue} × 0.6 = ${result} VND`);
    return result;
  }

  /**
   * Tạo message thông báo cho user
   */
  private createNotificationMessage(
    refundAmount: number,
    voucherValue: number,
    reason: string,
    validDays: number,
    orderId?: string,
    returnOrderId?: string,
  ): string {
    // Xử lý ID để hiển thị ngắn gọn
    const shortOrderId = orderId ? this.getShortId(orderId) : '';
    const shortReturnId = returnOrderId ? this.getShortId(returnOrderId) : '';
    
    const orderInfo = shortOrderId ? ` cho đơn hàng #${shortOrderId}` : '';
    const returnInfo = shortReturnId ? ` (Yêu cầu trả hàng: #${shortReturnId})` : '';
    
    return `Bạn đã nhận được voucher hoàn tiền${orderInfo}${returnInfo}. 
    
Lý do: ${reason}
Số tiền hoàn: ${this.formatCurrency(refundAmount)}
Giá trị voucher: ${this.formatCurrency(voucherValue)}
Thời hạn sử dụng: ${validDays} ngày

Voucher có thể sử dụng cho đơn hàng tiếp theo với điều kiện tối thiểu ${this.formatCurrency(voucherValue * 0.6)}.`;
  }

  /**
   * Gửi thông báo cho user
   */
  private async sendRefundNotification(
    userId: string,
    message: string,
    voucherId: string,
    refundAmount: number,
    voucherValue: number,
    orderId?: string,
    returnOrderId?: string,
  ): Promise<void> {
    try {
      await this.notificationService.sendAndSaveNotification(
        userId,
        null, // pushToken sẽ được lấy từ user trong service
        'Voucher hoàn tiền đã được tạo',
        message,
        'refund',
        {
          type: 'refund-voucher',
          voucherId,
          refundAmount,
          voucherValue,
          orderId,
          returnOrderId,
          action: 'voucher-created',
        },
      );
    } catch (error) {
      console.error('Lỗi gửi thông báo voucher refund:', error);
    }
  }

  /**
   * Gửi thông báo cho admin
   */
  private async sendAdminNotification(
    userId: string,
    refundAmount: number,
    voucherValue: number,
    orderId?: string,
    returnOrderId?: string,
    reason?: string,
  ): Promise<void> {
    try {
      // Xử lý ID để hiển thị ngắn gọn
      const shortUserId = this.getShortId(userId);
      const shortOrderId = orderId ? this.getShortId(orderId) : '';
      const shortReturnId = returnOrderId ? this.getShortId(returnOrderId) : '';
      
      const adminMessage = `Đã tạo voucher hoàn tiền cho user #${shortUserId}
Số tiền hoàn: ${this.formatCurrency(refundAmount)}
Giá trị voucher: ${this.formatCurrency(voucherValue)}
Lý do: ${reason || 'Không có'}
${shortOrderId ? `Đơn hàng: #${shortOrderId}` : ''}
${shortReturnId ? `Yêu cầu trả hàng: #${shortReturnId}` : ''}`;

      await this.notificationService.sendNotificationToAdmins(
        'Voucher hoàn tiền đã được tạo',
        adminMessage,
        'refund',
        {
          type: 'refund-voucher-admin',
          userId,
          refundAmount,
          voucherValue,
          orderId,
          returnOrderId,
          reason,
          action: 'voucher-created',
        },
      );
    } catch (error) {
      console.error('Lỗi gửi thông báo admin voucher refund:', error);
    }
  }

  /**
   * Format tiền tệ
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Lấy ID ngắn gọn từ ObjectId hoặc string
   */
  private getShortId(id: string): string {
    if (!id) return '';
    
    // Nếu là ObjectId, lấy 8 ký tự cuối
    if (id.length === 24) {
      return id.slice(-8);
    }
    
    // Nếu là string ngắn, trả về nguyên bản
    if (id.length <= 8) {
      return id;
    }
    
    // Nếu là string dài, lấy 8 ký tự cuối
    return id.slice(-8);
  }

  /**
   * Lấy thông tin voucher refund của user
   */
  async getUserRefundVouchers(userId: string): Promise<VoucherDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }

    const now = new Date();
    return this.voucherModel.find({
      userId: new Types.ObjectId(userId),
      isDisable: false,
      start: { $lte: now },
      end: { $gte: now },
      // Bỏ filter stock vì stock chỉ giảm khi user nhận voucher, không phải khi sử dụng
      // stock: { $gt: 0 },
    }).sort({ createdAt: -1 });
  }

  /**
   * Kiểm tra voucher có hợp lệ cho user không
   */
  async validateVoucherForUser(
    voucherId: string,
    userId: string,
    orderAmount: number,
  ): Promise<{ isValid: boolean; message: string; voucher?: VoucherDocument }> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      return { isValid: false, message: 'ID không hợp lệ' };
    }

    const voucher = await this.voucherModel.findById(voucherId);
    if (!voucher) {
      return { isValid: false, message: 'Voucher không tồn tại' };
    }

    // Kiểm tra user có được phép sử dụng voucher không
    const userCanUse = voucher.userId.some(
      (id) => id.toString() === userId,
    );
    if (!userCanUse) {
      return { isValid: false, message: 'Bạn không có quyền sử dụng voucher này' };
    }

    // Kiểm tra voucher có bị vô hiệu hóa không
    if (voucher.isDisable) {
      return { isValid: false, message: 'Voucher đã bị vô hiệu hóa' };
    }

    // Kiểm tra thời gian hiệu lực
    const now = new Date();
    if (now < voucher.start || now > voucher.end) {
      return { isValid: false, message: 'Voucher không trong thời gian hiệu lực' };
    }

    // Bỏ kiểm tra stock vì stock chỉ giảm khi user nhận voucher, không phải khi sử dụng
    // if (voucher.stock <= 0) {
    //   return { isValid: false, message: 'Voucher đã hết' };
    // }

    // Kiểm tra điều kiện sử dụng
    if (orderAmount < voucher.condition) {
      return {
        isValid: false,
        message: `Đơn hàng phải có giá trị tối thiểu ${this.formatCurrency(voucher.condition)}`,
      };
    }

    return { isValid: true, message: 'Voucher hợp lệ', voucher };
  }

  /**
   * Sử dụng voucher (không cần giảm stock vì voucher hoàn trả)
   */
  async useVoucher(voucherId: string): Promise<void> {
    const voucher = await this.voucherModel.findById(voucherId);
    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại');
    }

    // Voucher hoàn trả không cần giảm stock vì chỉ dành riêng cho 1 user
    // voucher.stock -= 1;
    // await voucher.save();
    
    console.log('Voucher hoàn trả đã được sử dụng:', voucherId);
  }
}
