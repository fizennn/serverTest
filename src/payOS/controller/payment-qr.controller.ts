import {
  Controller,
  Put,
  Get,
  Body,
  Param,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateQRPaymentDto } from '../dtos/create-qr-payment.dto';
import { PaymentQRService } from '../services/payment-qr.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('Payment QR Code')
@Controller('payment-qr')
export class PaymentQRController {
  constructor(
    private readonly paymentQRService: PaymentQRService,
  ) {}

  @Get(':qrId')
  @ApiOperation({ summary: 'Lấy QR code theo ID' })
  @ApiParam({ name: 'qrId', description: 'ID của QR code' })
  @ApiResponse({ status: 200, description: 'QR code được tìm thấy.' })
  @ApiResponse({ status: 404, description: 'QR code không tồn tại.' })
  async getQRPaymentById(@Param('qrId') qrId: string, @Res() res: Response) {
    try {
      const qrPayment = await this.paymentQRService.getQRPaymentById(qrId);
      if (!qrPayment) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'QR code không tồn tại',
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: qrPayment,
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Lỗi lấy thông tin QR code',
      });
    }
  }

  @Put('update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Chỉnh sửa QR code thanh toán (tạo mới nếu không tồn tại)' })
  @ApiBody({ type: CreateQRPaymentDto })
  @ApiResponse({ status: 200, description: 'QR code được cập nhật thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 500, description: 'Lỗi cập nhật QR code thanh toán.' })
  async updateQRPayment(@Body() dto: CreateQRPaymentDto, @Res() res: Response) {
    try {
      const qrPayment = await this.paymentQRService.updateQRPayment(dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'QR code thanh toán được cập nhật thành công',
        data: qrPayment,
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Lỗi cập nhật QR code thanh toán',
      });
    }
  }
} 