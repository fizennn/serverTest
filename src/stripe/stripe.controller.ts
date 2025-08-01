import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Headers, RawBodyRequest, Req, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-payment-intent')
  async createPaymentIntent(@Body() body: CreatePaymentIntentDto) {
    this.logger.log(`[CREATE_PAYMENT_INTENT] Request received - Amount: ${body.amount}, Currency: ${body.currency}, OrderId: ${body.orderId || 'N/A'}`);
    
    try {
      const { amount, currency = 'vnd', orderId } = body;
      
      if (!amount || amount <= 0) {
        this.logger.error(`[CREATE_PAYMENT_INTENT] Invalid amount: ${amount}`);
        throw new HttpException('Số tiền phải lớn hơn 0', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`[CREATE_PAYMENT_INTENT] Calling StripeService.createPaymentIntent`);
      const result = await this.stripeService.createPaymentIntent(amount, currency, orderId);
      
      this.logger.log(`[CREATE_PAYMENT_INTENT] Success - PaymentIntentId: ${result.paymentIntentId}`);
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

  @Post('webhook')
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log(`[WEBHOOK] Request received - Signature: ${signature ? 'Present' : 'Missing'}`);
    this.logger.log(`[WEBHOOK] Raw body length: ${request.rawBody?.length || 0} bytes`);
    
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...'; // Webhook secret từ Stripe Dashboard
      this.logger.log(`[WEBHOOK] Using endpoint secret: ${endpointSecret.substring(0, 10)}...`);
      
      if (!signature) {
        this.logger.error(`[WEBHOOK] Missing stripe-signature header`);
        throw new HttpException('Missing stripe-signature header', HttpStatus.BAD_REQUEST);
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
        throw new HttpException('Invalid webhook signature', HttpStatus.BAD_REQUEST);
      }

      // Parse the event
      this.logger.log(`[WEBHOOK] Parsing event from raw body`);
      const event = JSON.parse(request.rawBody.toString());
      this.logger.log(`[WEBHOOK] Event parsed - Type: ${event.type}, ID: ${event.id}`);
      
      // Handle the webhook event
      this.logger.log(`[WEBHOOK] Calling StripeService.handleWebhook`);
      await this.stripeService.handleWebhook(event);

      this.logger.log(`[WEBHOOK] Success - Event processed`);
      return { received: true };
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error: ${error.message}`);
      throw new HttpException(
        `Webhook Error: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
} 