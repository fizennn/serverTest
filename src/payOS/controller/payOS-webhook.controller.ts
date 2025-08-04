import { Controller, Post, Body, Headers, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PayOSWebhookService } from '../services/payOS-webhook.service';
import { PayOSWebhookDto } from '../dtos/webhook.dto';

@ApiTags('PayOS Webhook')
@Controller('webhook')
export class PayOSWebhookController {
  private readonly logger = new Logger(PayOSWebhookController.name);

  constructor(private readonly payOSWebhookService: PayOSWebhookService) {}

  @Post('payos')
  @ApiOperation({ summary: 'Webhook endpoint để nhận callback từ PayOS' })
  @ApiBody({ type: PayOSWebhookDto })
  @ApiResponse({ status: 200, description: 'Webhook được xử lý thành công.' })
  async handlePayOSWebhook(
    @Body() payload: PayOSWebhookDto,
    @Headers('x-payos-signature') signature: string,
    @Res() response: Response,
  ) {
    this.logger.log(`[WEBHOOK] Received PayOS webhook - OrderCode: ${payload.data?.orderCode}, Status: ${payload.data?.status}`);
    this.logger.log(`[WEBHOOK] Payload: ${JSON.stringify(payload)}`);
    this.logger.log(`[WEBHOOK] Signature: ${signature}`);

    // LUÔN TRẢ VỀ 200 OK NGAY LẬP TỨC ĐỂ PAYOS HOẠT ĐỘNG ĐÚNG
    this.logger.log(`[WEBHOOK] Sending 200 OK response immediately for PayOS compatibility`);
    response.status(HttpStatus.OK).json({ received: true });

    try {
      // Verify webhook signature
      const isValid = this.payOSWebhookService.verifyWebhookSignature(payload, signature);
      
      if (!isValid) {
        this.logger.error(`[WEBHOOK] Invalid webhook signature`);
        this.logger.error(`[WEBHOOK] Signature received: ${signature}`);
        this.logger.error(`[WEBHOOK] Payload preview: ${JSON.stringify(payload).substring(0, 200)}...`);
        // Không trả về error vì đã trả về 200 OK
        return;
      }

      this.logger.log(`[WEBHOOK] Webhook signature verified successfully`);
      
      // XỬ LÝ LOGIC SAU KHI ĐÃ TRẢ VỀ 200
      this.logger.log(`[WEBHOOK] Processing webhook payload asynchronously`);
      this.payOSWebhookService.handleWebhook(payload).catch(error => {
        this.logger.error(`[WEBHOOK] Error processing webhook payload: ${error.message}`);
        // Không throw error vì đã trả về 200
      });
      
    } catch (error) {
      this.logger.error(`[WEBHOOK] Error: ${error.message}`);
      this.logger.error(`[WEBHOOK] Error stack: ${error.stack}`);
      // Không trả về error vì đã trả về 200 OK
    }
  }
} 