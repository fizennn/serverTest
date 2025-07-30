// src/webhook/webhook.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WebhookService } from './webhooks.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  constructor(private readonly webhookService: WebhookService) {}
  @Post('github')
  @HttpCode(HttpStatus.OK)
  async handleGithubWebhook(
    @Body() payload: any,
    @Headers('x-github-event') githubEvent: string,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log(`Received GitHub webhook: ${githubEvent}`);

    // Verify webhook signature
    // if (!this.webhookService.verifySignature(payload, signature)) {
    //   this.logger.error('Invalid webhook signature');
    //   return { success: false, message: 'Invalid signature' };
    // }

    // Handle push event
    if (githubEvent === 'push') {
      try {
        await this.webhookService.deployApplication();
        return { success: true, message: 'Deployment started' };
      } catch (error) {
        this.logger.error('Deployment failed:', error);
        return { success: false, message: 'Deployment failed' };
      }
    }

    return { success: true, message: 'Webhook received' };
  }
}
