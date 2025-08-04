import { Controller, Post, Get, Put, Body, Param, Res, HttpStatus } from '@nestjs/common';
import { PayOSService } from '../services/payOS.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreatePaymentDto, CancelPaymentDto, ConfirmWebhookDto, SimpleCreatePaymentDto } from '../dtos/create-payment.dto';

@ApiTags('PayOS')
@Controller('payos')
export class PayOSController {
  constructor(private readonly payOSService: PayOSService) {}

  @Post('create-simple-payment')
  @ApiOperation({ summary: 'Tạo thanh toán đơn giản (chỉ cần productId và quantity)' })
  @ApiBody({ type: SimpleCreatePaymentDto })
  @ApiResponse({ status: 200, description: 'Trả về thông tin thanh toán.' })
  @ApiResponse({ status: 500, description: 'Lỗi tạo thanh toán.' })
  async createSimplePayment(@Body() body: SimpleCreatePaymentDto, @Res() res: Response) {
    try {
      const paymentData = await this.payOSService.createSimplePayment(body);
      console.log('Simple payment data:', paymentData);
      if (!paymentData) {
        return res.status(HttpStatus.BAD_REQUEST).json({ 
          error: -1,
          message: 'Không tạo được thanh toán',
          data: null 
        });
      }
      return res.status(HttpStatus.OK).json({ 
        error: 0,
        message: 'Success',
        data: paymentData
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: -1,
        message: 'Lỗi tạo thanh toán',
        data: null 
      });
    }
  }

  @Post('create-payment')
  @ApiOperation({ summary: 'Tạo thanh toán PayOS (đầy đủ thông tin)' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 200, description: 'Trả về thông tin thanh toán.' })
  @ApiResponse({ status: 500, description: 'Lỗi tạo thanh toán.' })
  async createPayment(@Body() body: CreatePaymentDto, @Res() res: Response) {
    try {
      const paymentData = await this.payOSService.createPayment(body);
      console.log('paymentData:', paymentData);
      if (!paymentData) {
        return res.status(HttpStatus.BAD_REQUEST).json({ 
          error: -1,
          message: 'Không tạo được thanh toán',
          data: null 
        });
      }
      return res.status(HttpStatus.OK).json({ 
        error: 0,
        message: 'Success',
        data: paymentData
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        error: -1,
        message: 'Lỗi tạo thanh toán',
        data: null 
      });
    }
  }

  @Get(':orderCode')
  @ApiOperation({ summary: 'Lấy thông tin thanh toán theo orderCode' })
  @ApiParam({ name: 'orderCode', description: 'Mã đơn hàng (số)' })
  @ApiResponse({ status: 200, description: 'Thông tin thanh toán được tìm thấy.' })
  @ApiResponse({ status: 404, description: 'Đơn hàng không tồn tại.' })
  async getPaymentInfo(@Param('orderCode') orderCode: string, @Res() res: Response) {
    try {
      const paymentInfo = await this.payOSService.getPaymentLinkInformation(orderCode);
      if (!paymentInfo) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: -1,
          message: 'Đơn hàng không tồn tại',
          data: null
        });
      }
      return res.status(HttpStatus.OK).json({
        error: 0,
        message: 'ok',
        data: paymentInfo
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: -1,
        message: 'Lỗi lấy thông tin thanh toán',
        data: null
      });
    }
  }

  @Put(':orderCode/cancel')
  @ApiOperation({ summary: 'Hủy thanh toán' })
  @ApiParam({ name: 'orderCode', description: 'Mã đơn hàng (số)' })
  @ApiBody({ type: CancelPaymentDto })
  @ApiResponse({ status: 200, description: 'Hủy thanh toán thành công.' })
  @ApiResponse({ status: 404, description: 'Đơn hàng không tồn tại.' })
  async cancelPayment(@Param('orderCode') orderCode: string, @Body() body: CancelPaymentDto, @Res() res: Response) {
    try {
      const result = await this.payOSService.cancelPaymentLink(orderCode, body.cancellationReason);
      if (!result) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: -1,
          message: 'Đơn hàng không tồn tại',
          data: null
        });
      }
      return res.status(HttpStatus.OK).json({
        error: 0,
        message: 'ok',
        data: result
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: -1,
        message: 'Lỗi hủy thanh toán',
        data: null
      });
    }
  }

  @Post('confirm-webhook')
  @ApiOperation({ summary: 'Xác nhận webhook URL' })
  @ApiBody({ type: ConfirmWebhookDto })
  @ApiResponse({ status: 200, description: 'Xác nhận webhook thành công.' })
  @ApiResponse({ status: 500, description: 'Lỗi xác nhận webhook.' })
  async confirmWebhook(@Body() body: ConfirmWebhookDto, @Res() res: Response) {
    try {
      await this.payOSService.confirmWebhook(body.webhookUrl);
      return res.status(HttpStatus.OK).json({
        error: 0,
        message: 'ok',
        data: null
      });
    } catch (error) {
      console.error('Controller error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: -1,
        message: 'Lỗi xác nhận webhook',
        data: null
      });
    }
  }
} 