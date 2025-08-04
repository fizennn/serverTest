import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../../orders/services/orders.service';
import * as crypto from 'crypto';

@Injectable()
export class PayOSWebhookService {
  private readonly logger = new Logger(PayOSWebhookService.name);
  private readonly PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Verify webhook signature từ PayOS
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      if (!this.PAYOS_CHECKSUM_KEY || !signature) {
        this.logger.warn('[WEBHOOK] Missing checksum key or signature');
        return false;
      }

      // Tạo signature từ payload
      const rawString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.PAYOS_CHECKSUM_KEY)
        .update(rawString)
        .digest('hex');

      this.logger.log(`[WEBHOOK] Expected signature: ${expectedSignature}`);
      this.logger.log(`[WEBHOOK] Received signature: ${signature}`);

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error verifying signature: ${error.message}`);
      return false;
    }
  }

  /**
   * Xử lý webhook từ PayOS
   */
  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`[WEBHOOK] Handling PayOS webhook - Error: ${payload.error}, Message: ${payload.message}`);
    
    try {
      // Kiểm tra lỗi từ PayOS
      if (payload.error !== 0) {
        this.logger.error(`[WEBHOOK] PayOS returned error: ${payload.error} - ${payload.message}`);
        return;
      }

      const { data } = payload;
      if (!data) {
        this.logger.error('[WEBHOOK] No data in webhook payload');
        return;
      }

      this.logger.log(`[WEBHOOK] Processing payment - OrderCode: ${data.orderCode}, Status: ${data.status}, Amount: ${data.amount}`);

      // Xử lý theo trạng thái
      switch (data.status) {
        case 'PAID':
          await this.handlePaymentSuccess(data);
          break;
        case 'CANCELLED':
          await this.handlePaymentCancelled(data);
          break;
        case 'EXPIRED':
          await this.handlePaymentExpired(data);
          break;
        case 'FAILED':
          await this.handlePaymentFailed(data);
          break;
        case 'PENDING':
          await this.handlePaymentPending(data);
          break;
        default:
          this.logger.warn(`[WEBHOOK] Unknown payment status: ${data.status}`);
      }
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error handling webhook: ${error.message}`);
      this.logger.error(`[WEBHOOK] Error stack: ${error.stack}`);
    }
  }

  /**
   * Xử lý thanh toán thành công
   */
  private async handlePaymentSuccess(data: any): Promise<void> {
    this.logger.log(`[WEBHOOK] Payment successful for order: ${data.orderCode}`);
    
    try {
      // Cập nhật trạng thái thanh toán thành công
      await this.ordersService.updatePaymentStatus(data.orderCode, 'paid');
      this.logger.log(`[WEBHOOK] Successfully updated payment status for order: ${data.orderCode}`);
      
      // Có thể thêm logic khác như:
      // - Gửi email xác nhận
      // - Cập nhật inventory
      // - Gửi notification
      
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error updating payment status for order ${data.orderCode}: ${error.message}`);
    }
  }

  /**
   * Xử lý thanh toán bị hủy
   */
  private async handlePaymentCancelled(data: any): Promise<void> {
    this.logger.log(`[WEBHOOK] Payment cancelled for order: ${data.orderCode}`);
    
    try {
      await this.ordersService.updatePaymentStatus(data.orderCode, 'cancelled');
      this.logger.log(`[WEBHOOK] Successfully updated payment status to cancelled for order: ${data.orderCode}`);
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error updating payment status for order ${data.orderCode}: ${error.message}`);
    }
  }

  /**
   * Xử lý thanh toán hết hạn
   */
  private async handlePaymentExpired(data: any): Promise<void> {
    this.logger.log(`[WEBHOOK] Payment expired for order: ${data.orderCode}`);
    
    try {
      await this.ordersService.updatePaymentStatus(data.orderCode, 'expired');
      this.logger.log(`[WEBHOOK] Successfully updated payment status to expired for order: ${data.orderCode}`);
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error updating payment status for order ${data.orderCode}: ${error.message}`);
    }
  }

  /**
   * Xử lý thanh toán thất bại
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    this.logger.log(`[WEBHOOK] Payment failed for order: ${data.orderCode}`);
    
    try {
      await this.ordersService.updatePaymentStatus(data.orderCode, 'failed');
      this.logger.log(`[WEBHOOK] Successfully updated payment status to failed for order: ${data.orderCode}`);
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error updating payment status for order ${data.orderCode}: ${error.message}`);
    }
  }

  /**
   * Xử lý thanh toán đang chờ
   */
  private async handlePaymentPending(data: any): Promise<void> {
    this.logger.log(`[WEBHOOK] Payment pending for order: ${data.orderCode}`);
    
    try {
      await this.ordersService.updatePaymentStatus(data.orderCode, 'pending');
      this.logger.log(`[WEBHOOK] Successfully updated payment status to pending for order: ${data.orderCode}`);
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error updating payment status for order ${data.orderCode}: ${error.message}`);
    }
  }
} 