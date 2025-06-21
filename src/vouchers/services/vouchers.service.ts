import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import { CreateVoucherDto, UpdateVoucherDto } from '../dtos/voucher.dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const voucher = new this.voucherModel(createVoucherDto);
    return await voucher.save();
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

  async findActive(): Promise<Voucher[]> {
    const now = new Date();
    return await this.voucherModel.find({
      start: { $lte: now },
      end: { $gte: now },
      stock: { $gt: 0 },
      isDisable: false
    }).exec();
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

    const voucher = await this.voucherModel
      .findByIdAndUpdate(id, updateVoucherDto, { new: true })
      .exec();
    
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }
    return voucher;
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

  async addUserToVoucher(voucherId: string, userId: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(voucherId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID');
    }

    const voucher = await this.voucherModel.findById(voucherId).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
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
} 