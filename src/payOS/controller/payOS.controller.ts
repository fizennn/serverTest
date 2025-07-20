import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { PayOSService } from '../services/payOS.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreatePaymentDto } from '../dtos/create-payment.dto';

@ApiTags('PayOS')
@Controller('payos')
export class PayOSController {
  constructor(private readonly payOSService: PayOSService) {}

  @Post('create-payment')
  @ApiOperation({ summary: 'Tạo thanh toán PayOS' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 200, description: 'Trả về URL thanh toán.' })
  @ApiResponse({ status: 500, description: 'Lỗi tạo mã QR thanh toán.' })
  async createPayment(@Body() body: CreatePaymentDto, @Res() res: Response) {
    try {
      const paymentUrl = await this.payOSService.createPayment(body);
      console.log('paymentUrl:', paymentUrl);
      if (!paymentUrl) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Không tạo được paymentUrl' });
      }
      return res.status(HttpStatus.OK).json({ paymentUrl });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Lỗi tạo mã QR thanh toán' });
    }
  }
} 