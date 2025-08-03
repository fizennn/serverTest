import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentQR, PaymentQRDocument } from '../schemas/payment-qr.schema';
import { CreateQRPaymentDto } from '../dtos/create-qr-payment.dto';

@Injectable()
export class PaymentQRService {
  constructor(
    @InjectModel(PaymentQR.name) private paymentQRModel: Model<PaymentQRDocument>,
  ) {}

  // GET - Lấy QR code theo ID
  async getQRPaymentById(qrId: string): Promise<PaymentQR | null> {
    try {
      return await this.paymentQRModel.findById(qrId);
    } catch (error) {
      console.error('Error getting QR payment:', error);
      throw new Error('Lỗi lấy thông tin QR code');
    }
  }

  // PUT - Chỉnh sửa (nếu không có _id thì tạo mới)
  async updateQRPayment(dto: CreateQRPaymentDto): Promise<PaymentQR> {
    try {
      // Kiểm tra xem đã có QR code với ID này chưa
      const existingQR = await this.paymentQRModel.findById(dto._id);

      if (existingQR) {
        // Cập nhật QR code cũ
        const updatedQR = await this.paymentQRModel.findByIdAndUpdate(
          dto._id,
          {
            qrUrl: dto.qrUrl,
            updatedAt: new Date(),
          },
          { new: true },
        );

        return updatedQR;
      } else {
        // Tạo QR code mới với ID được chỉ định
        const newQR = new this.paymentQRModel({
          _id: new Types.ObjectId(dto._id),
          qrUrl: dto.qrUrl,
          status: 'pending',
        });

        const savedQR = await newQR.save();

        return savedQR;
      }
    } catch (error) {
      console.error('Error updating QR payment:', error);
      throw new Error('Lỗi cập nhật QR code thanh toán');
    }
  }
} 