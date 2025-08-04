import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import * as crypto from 'crypto';

@Injectable()
export class PayOSService {
  private readonly PAYOS_API = 'https://api-merchant.payos.vn/v2/payment-requests';
  private readonly PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
  private readonly PAYOS_API_KEY = process.env.PAYOS_API_KEY;
  private readonly PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

  private createSignature(data: CreatePaymentDto): string {
    const rawString = `amount=${data.amount}&cancelUrl=${data.cancelUrl}&description=${data.description}&orderCode=${data.orderCode}&returnUrl=${data.returnUrl}`;
    return crypto.createHmac('sha256', this.PAYOS_CHECKSUM_KEY).update(rawString).digest('hex');
  }

  async createPayment(dto: CreatePaymentDto): Promise<any> {
    // Tự động set expiredAt là 1 ngày kể từ thời điểm tạo nếu chưa hợp lệ
    const now = Math.floor(Date.now() / 1000);
    let expiredAt = dto.expiredAt;
    if (!expiredAt || expiredAt <= now) {
      expiredAt = now + 24 * 60 * 60; // 1 ngày = 86400 giây
    }
    // Tạo signature tự động
    const signature = this.createSignature({ ...dto, expiredAt });
    const body = {
      ...dto,
      expiredAt,
      signature,
    };
    console.log('PAYOS_CLIENT_ID:', this.PAYOS_CLIENT_ID);
    console.log('PAYOS_API_KEY:', this.PAYOS_API_KEY);
    console.log('PAYOS_CHECKSUM_KEY:', this.PAYOS_CHECKSUM_KEY);
    console.log('Body gửi lên PayOS:', body);
    try {
      const response = await axios.post(this.PAYOS_API, body, {
        headers: {
          'x-client-id': this.PAYOS_CLIENT_ID,
          'x-api-key': this.PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
      });
      console.log('PayOS response:', response.data);
      return response.data?.data;
    } catch (err) {
      console.error('PayOS error:', err.response?.data || err.message);
      throw new Error('Lỗi tạo mã QR thanh toán');
    }
  }

  async getPaymentLinkInformation(orderCode: string): Promise<any> {
    try {
      const response = await axios.get(`${this.PAYOS_API}/${orderCode}`, {
        headers: {
          'x-client-id': this.PAYOS_CLIENT_ID,
          'x-api-key': this.PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
      });
      return response.data?.data;
    } catch (err) {
      console.error('PayOS get payment info error:', err.response?.data || err.message);
      throw new Error('Lỗi lấy thông tin thanh toán');
    }
  }

  async cancelPaymentLink(orderCode: string, cancellationReason?: string): Promise<any> {
    try {
      const body = cancellationReason ? { cancellationReason } : {};
      const response = await axios.put(`${this.PAYOS_API}/${orderCode}/cancel`, body, {
        headers: {
          'x-client-id': this.PAYOS_CLIENT_ID,
          'x-api-key': this.PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
      });
      return response.data?.data;
    } catch (err) {
      console.error('PayOS cancel payment error:', err.response?.data || err.message);
      throw new Error('Lỗi hủy thanh toán');
    }
  }

  async confirmWebhook(webhookUrl: string): Promise<any> {
    try {
      const response = await axios.post(`${this.PAYOS_API}/webhook`, {
        webhookUrl
      }, {
        headers: {
          'x-client-id': this.PAYOS_CLIENT_ID,
          'x-api-key': this.PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
      });
      return response.data?.data;
    } catch (err) {
      console.error('PayOS confirm webhook error:', err.response?.data || err.message);
      throw new Error('Lỗi xác nhận webhook');
    }
  }
} 