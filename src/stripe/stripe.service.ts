import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { OrdersService } from '../orders/services/orders.service';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private ordersService: OrdersService) {
    // Khởi tạo Stripe với khóa bí mật
    // Trong production, nên lấy từ environment variables
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
      apiVersion: '2023-10-16',
    });
    this.logger.log('StripeService initialized with API version: 2023-10-16');
  }

  async createPaymentIntent(amount: number, currency: string = 'vnd', orderId?: string) {
    this.logger.log(`Creating payment intent - Amount: ${amount}, Currency: ${currency}, OrderId: ${orderId || 'N/A'}`);
    
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount, // Stripe tính bằng đơn vị nhỏ nhất (cent cho USD, đồng cho VND)
        currency: currency,
        payment_method_types: ['card'], // Chỉ sử dụng card payment method
        metadata: {
          orderId: orderId, // Lưu orderId vào metadata để xử lý webhook
        },
      });

      this.logger.log(`Payment intent created successfully - ID: ${paymentIntent.id}, Status: ${paymentIntent.status}`);
      this.logger.log(`Client secret: ${paymentIntent.client_secret?.substring(0, 20)}...`);
      this.logger.log(`Payment methods available: ${paymentIntent.payment_method_types?.join(', ')}`);
      this.logger.log(`Metadata: ${JSON.stringify(paymentIntent.metadata)}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentMethods: paymentIntent.payment_method_types,
      };
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error.message}`);
      throw new Error(`Lỗi tạo payment intent: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    this.logger.log(`Confirming payment - PaymentIntentId: ${paymentIntentId}`);
    
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      this.logger.log(`Payment intent retrieved - Status: ${paymentIntent.status}, Amount: ${paymentIntent.amount}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Error confirming payment: ${error.message}`);
      throw new Error(`Lỗi xác nhận thanh toán: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentIntentId: string) {
    this.logger.log(`Getting payment status - PaymentIntentId: ${paymentIntentId}`);
    
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      this.logger.log(`Payment status retrieved - Status: ${paymentIntent.status}, Amount: ${paymentIntent.amount}`);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      this.logger.error(`Error getting payment status: ${error.message}`);
      throw new Error(`Lỗi lấy trạng thái thanh toán: ${error.message}`);
    }
  }

  async handleWebhook(event: any) {
    this.logger.log(`[WEBHOOK_SERVICE] Handling webhook event - Type: ${event.type}, ID: ${event.id}`);
    
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object);
          break;

        default:
          this.logger.log(`[WEBHOOK_SERVICE] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`[WEBHOOK_SERVICE] Error handling webhook: ${error.message}`);
      this.logger.error(`[WEBHOOK_SERVICE] Error stack: ${error.stack}`);
      // Không throw error để tránh ảnh hưởng đến response 200
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    this.logger.log(`[WEBHOOK_SERVICE] PaymentIntent was successful! ID: ${paymentIntent.id}, Amount: ${paymentIntent.amount}`);
    this.logger.log(`[WEBHOOK_SERVICE] PaymentIntent metadata: ${JSON.stringify(paymentIntent.metadata)}`);
    
    // Lấy orderId từ metadata
    const orderId = paymentIntent.metadata?.orderId;
    this.logger.log(`[WEBHOOK_SERVICE] OrderId from metadata: ${orderId || 'Not found'}`);
    
    if (orderId) {
      try {
        this.logger.log(`[WEBHOOK_SERVICE] Updating payment status for order: ${orderId} to 'paid'`);
        // Cập nhật trạng thái thanh toán thành công
        await this.ordersService.updatePaymentStatus(orderId, 'paid');
        this.logger.log(`[WEBHOOK_SERVICE] Successfully updated payment status for order: ${orderId}`);
      } catch (error) {
        this.logger.error(`[WEBHOOK_SERVICE] Error updating payment status for order ${orderId}: ${error.message}`);
      }
    } else {
      this.logger.warn('[WEBHOOK_SERVICE] No orderId found in payment intent metadata');
      this.logger.warn('[WEBHOOK_SERVICE] This payment intent was created without orderId in metadata');
      this.logger.warn('[WEBHOOK_SERVICE] Please ensure orderId is passed when creating payment intent');
      
      // Có thể thêm logic khác ở đây, ví dụ:
      // - Lưu payment intent vào database để tracking
      // - Gửi notification cho admin
      // - Log để manual review
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: any) {
    this.logger.log(`[WEBHOOK_SERVICE] PaymentIntent failed! ID: ${paymentIntent.id}, Amount: ${paymentIntent.amount}`);
    
    const orderId = paymentIntent.metadata?.orderId;
    this.logger.log(`[WEBHOOK_SERVICE] Failed orderId from metadata: ${orderId || 'Not found'}`);
    
    if (orderId) {
      try {
        this.logger.log(`[WEBHOOK_SERVICE] Payment failed for order: ${orderId}`);
        // Không cập nhật payment status vì method chỉ chấp nhận 'unpaid', 'paid', 'refunded'
        // Có thể thêm logic khác ở đây như gửi notification, log, etc.
      } catch (error) {
        this.logger.error(`[WEBHOOK_SERVICE] Error handling failed payment for order ${orderId}: ${error.message}`);
      }
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: any) {
    this.logger.log(`[WEBHOOK_SERVICE] PaymentIntent canceled! ID: ${paymentIntent.id}, Amount: ${paymentIntent.amount}`);
    
    const orderId = paymentIntent.metadata?.orderId;
    this.logger.log(`[WEBHOOK_SERVICE] Canceled orderId from metadata: ${orderId || 'Not found'}`);
    
    if (orderId) {
      try {
        this.logger.log(`[WEBHOOK_SERVICE] Payment canceled for order: ${orderId}`);
        // Không cập nhật payment status vì method chỉ chấp nhận 'unpaid', 'paid', 'refunded'
        // Có thể thêm logic khác ở đây như gửi notification, log, etc.
      } catch (error) {
        this.logger.error(`[WEBHOOK_SERVICE] Error handling canceled payment for order ${orderId}: ${error.message}`);
      }
    }
  }

  verifyWebhookSignature(payload: any, signature: string, endpointSecret: string): boolean {
    this.logger.log(`Verifying webhook signature - Endpoint secret: ${endpointSecret.substring(0, 10)}...`);
    
    try {
      this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      this.logger.log('Webhook signature verification successful');
      return true;
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }
} 