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
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: orderId, // Lưu orderId vào metadata để xử lý webhook
        },
      });

      this.logger.log(`Payment intent created successfully - ID: ${paymentIntent.id}, Status: ${paymentIntent.status}`);
      this.logger.log(`Client secret: ${paymentIntent.client_secret?.substring(0, 20)}...`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
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
    this.logger.log(`Handling webhook event - Type: ${event.type}, ID: ${event.id}`);
    
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          this.logger.log(`PaymentIntent was successful! ID: ${paymentIntent.id}, Amount: ${paymentIntent.amount}`);
          
          // Lấy orderId từ metadata
          const orderId = paymentIntent.metadata?.orderId;
          this.logger.log(`OrderId from metadata: ${orderId || 'Not found'}`);
          
          if (orderId) {
            this.logger.log(`Updating payment status for order: ${orderId} to 'paid'`);
            // Cập nhật trạng thái thanh toán thành công
            await this.ordersService.updatePaymentStatus(orderId, 'paid');
            this.logger.log(`Successfully updated payment status for order: ${orderId}`);
          } else {
            this.logger.warn('No orderId found in payment intent metadata');
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          this.logger.log(`PaymentIntent failed! ID: ${failedPaymentIntent.id}, Amount: ${failedPaymentIntent.amount}`);
          
          const failedOrderId = failedPaymentIntent.metadata?.orderId;
          this.logger.log(`Failed orderId from metadata: ${failedOrderId || 'Not found'}`);
          
          if (failedOrderId) {
            this.logger.log(`Payment failed for order: ${failedOrderId}`);
            // Có thể cập nhật trạng thái thanh toán thất bại nếu cần
          }
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      throw error;
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