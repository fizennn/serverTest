import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Headers, RawBodyRequest, Req, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-payment-intent')
  async createPaymentIntent(@Body() body: CreatePaymentIntentDto) {
    this.logger.log(`[CREATE_PAYMENT_INTENT] Request received - Amount: ${body.amount}, Currency: ${body.currency}, OrderId: ${body.orderId || 'N/A'}, PaymentMethods: ${body.paymentMethods?.join(', ') || 'card'}`);
    
    try {
      const { amount, currency = 'vnd', orderId, paymentMethods = ['card'] } = body;
      
      if (!amount || amount <= 0) {
        this.logger.error(`[CREATE_PAYMENT_INTENT] Invalid amount: ${amount}`);
        throw new HttpException('Số tiền phải lớn hơn 0', HttpStatus.BAD_REQUEST);
      }

      // Kiểm tra orderId nếu cần
      if (!orderId) {
        this.logger.warn('[CREATE_PAYMENT_INTENT] No orderId provided - this may cause issues with webhook processing');
        this.logger.warn('[CREATE_PAYMENT_INTENT] Please ensure orderId is passed for proper order tracking');
      }

      this.logger.log(`[CREATE_PAYMENT_INTENT] Calling StripeService.createPaymentIntent`);
      const result = await this.stripeService.createPaymentIntent(amount, currency, orderId);
      
      this.logger.log(`[CREATE_PAYMENT_INTENT] Success - PaymentIntentId: ${result.paymentIntentId}, PaymentMethods: ${result.paymentMethods?.join(', ')}`);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`[CREATE_PAYMENT_INTENT] Error: ${error.message}`);
      throw new HttpException(
        error.message || 'Lỗi tạo payment intent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('payment-status/:paymentIntentId')
  async getPaymentStatus(@Param('paymentIntentId') paymentIntentId: string) {
    this.logger.log(`[GET_PAYMENT_STATUS] Request received - PaymentIntentId: ${paymentIntentId}`);
    
    try {
      this.logger.log(`[GET_PAYMENT_STATUS] Calling StripeService.getPaymentStatus`);
      const status = await this.stripeService.getPaymentStatus(paymentIntentId);
      
      this.logger.log(`[GET_PAYMENT_STATUS] Success - Status: ${status.status}, Amount: ${status.amount}`);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`[GET_PAYMENT_STATUS] Error: ${error.message}`);
      throw new HttpException(
        error.message || 'Lỗi lấy trạng thái thanh toán',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('confirm-payment')
  async confirmPayment(@Body() body: ConfirmPaymentDto) {
    this.logger.log(`[CONFIRM_PAYMENT] Request received - PaymentIntentId: ${body.paymentIntentId}`);
    
    try {
      const { paymentIntentId } = body;
      
      if (!paymentIntentId) {
        this.logger.error(`[CONFIRM_PAYMENT] Missing paymentIntentId`);
        throw new HttpException('Payment Intent ID là bắt buộc', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`[CONFIRM_PAYMENT] Calling StripeService.confirmPayment`);
      const result = await this.stripeService.confirmPayment(paymentIntentId);
      
      this.logger.log(`[CONFIRM_PAYMENT] Success - Status: ${result.status}, Amount: ${result.amount}`);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`[CONFIRM_PAYMENT] Error: ${error.message}`);
      throw new HttpException(
        error.message || 'Lỗi xác nhận thanh toán',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('webhook-test')
  async testWebhookConfig(@Req() request: RawBodyRequest<Request>) {
    this.logger.log(`[WEBHOOK_TEST] Testing webhook configuration`);
    this.logger.log(`[WEBHOOK_TEST] Raw body exists: ${!!request.rawBody}`);
    this.logger.log(`[WEBHOOK_TEST] Raw body length: ${request.rawBody?.length || 0}`);
    this.logger.log(`[WEBHOOK_TEST] Content-Type: ${request.headers['content-type']}`);
    this.logger.log(`[WEBHOOK_TEST] STRIPE_WEBHOOK_SECRET configured: ${!!process.env.STRIPE_WEBHOOK_SECRET}`);
    
    return {
      success: true,
      message: 'Webhook test endpoint',
      config: {
        rawBodyExists: !!request.rawBody,
        rawBodyLength: request.rawBody?.length || 0,
        contentType: request.headers['content-type'],
        webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length || 0
      }
    };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() response: Response,
  ) {
    this.logger.log(`[WEBHOOK] Request received - Signature: ${signature ? 'Present' : 'Missing'}`);
    this.logger.log(`[WEBHOOK] Raw body length: ${request.rawBody?.length || 0} bytes`);
    this.logger.log(`[WEBHOOK] Content-Type: ${request.headers['content-type']}`);
    this.logger.log(`[WEBHOOK] User-Agent: ${request.headers['user-agent']}`);
    
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!endpointSecret) {
        this.logger.error(`[WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured`);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          error: 'Webhook secret not configured' 
        });
        return;
      }
      
      this.logger.log(`[WEBHOOK] Using endpoint secret: ${endpointSecret.substring(0, 10)}...`);
      
      if (!signature) {
        this.logger.error(`[WEBHOOK] Missing stripe-signature header`);
        response.status(HttpStatus.BAD_REQUEST).json({ 
          error: 'Missing stripe-signature header' 
        });
        return;
      }

      if (!request.rawBody) {
        this.logger.error(`[WEBHOOK] No raw body found`);
        this.logger.error(`[WEBHOOK] Request body:`, request.body);
        this.logger.error(`[WEBHOOK] Request headers:`, request.headers);
        response.status(HttpStatus.BAD_REQUEST).json({ 
          error: 'No raw body found' 
        });
        return;
      }

      // Verify webhook signature
      this.logger.log(`[WEBHOOK] Verifying signature`);
      const isValid = this.stripeService.verifyWebhookSignature(
        request.rawBody,
        signature,
        endpointSecret,
      );

      if (!isValid) {
        this.logger.error(`[WEBHOOK] Invalid webhook signature`);
        this.logger.error(`[WEBHOOK] Signature received: ${signature}`);
        this.logger.error(`[WEBHOOK] Raw body preview: ${request.rawBody.toString().substring(0, 200)}...`);
        response.status(HttpStatus.BAD_REQUEST).json({ 
          error: 'Invalid webhook signature' 
        });
        return;
      }

      // Parse the event
      this.logger.log(`[WEBHOOK] Parsing event from raw body`);
      const event = JSON.parse(request.rawBody.toString());
      this.logger.log(`[WEBHOOK] Event parsed - Type: ${event.type}, ID: ${event.id}`);
      
      // TRẢ VỀ 200 NGAY LẬP TỨC SAU KHI VERIFY SIGNATURE
      this.logger.log(`[WEBHOOK] Sending 200 OK response immediately`);
      response.status(HttpStatus.OK).json({ received: true });
      
      // XỬ LÝ LOGIC SAU KHI ĐÃ TRẢ VỀ 200
      this.logger.log(`[WEBHOOK] Processing webhook event asynchronously`);
      this.stripeService.handleWebhook(event).catch(error => {
        this.logger.error(`[WEBHOOK] Error processing webhook event: ${error.message}`);
        // Không throw error vì đã trả về 200
      });
      
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error: ${error.message}`);
      this.logger.error(`[WEBHOOK] Error stack: ${error.stack}`);
      response.status(HttpStatus.BAD_REQUEST).json({ 
        error: `Webhook Error: ${error.message}` 
      });
    }
  }
} 