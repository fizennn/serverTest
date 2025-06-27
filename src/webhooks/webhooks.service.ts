// src/webhook/webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private configService: ConfigService) {}

  verifySignature(payload: any, signature: string): boolean {
    const secret = `Tuantuan123`;

    if (!secret || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const receivedSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex'),
    );
  }

  async deployApplication(): Promise<void> {
    const projectPath = '/root/server-Drezzup';
    const appName = 'drezzup-server';

    try {
      this.logger.log('Bat dau qua trinh deploy...');

      // 1. Pull latest code
      await this.executeCommand(`cd ${projectPath} && git pull`);

      // 2. Install dependencies
      await this.executeCommand(`cd ${projectPath} && yarn install`);

      // 3. Build application
      await this.executeCommand(`cd ${projectPath} && yarn build`);

      // 4. Restart PM2 process
      await this.executeCommand(`pm2 restart ${appName}`);

      this.logger.log('Deployment completed successfully');
    } catch (error) {
      this.logger.error('Deployment error:', error);
      throw error;
    }
  }

  private async executeCommand(command: string): Promise<string> {
    this.logger.log(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        this.logger.warn('Command stderr:', stderr);
      }

      this.logger.log('Command output:', stdout);
      return stdout;
    } catch (error) {
      this.logger.error('Command failed:', error);
      throw error;
    }
  }
}
