import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getBaseUrl } from '../utils/config';

@Injectable()
export class MailService {
  constructor(private configService: ConfigService) {}

  private async sendMail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    try {
      console.log(`Sending email to: ${to}`);
      console.log(`Subject: ${subject}`);

      // Gửi qua Google Apps Script
      const response = await fetch(
        this.configService.get<string>('GOOGLE_SCRIPT_URL'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, html, text }),
        },
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log('Email sent successfully via Google Apps Script');
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  static generateActivationLink(userId: string, token: string): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/activation.html?userId=${userId}&token=${token}`;
  }

  static generateResetPasswordEmail(password: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Đặt lại mật khẩu Drezzup</h1>
        <p>Xin chào,</p>
        <p>Mật khẩu mới của bạn là: <strong style="color: #007bff; font-size: 18px;">${password}</strong></p>
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>⚠️ Quan trọng:</strong> Vui lòng đăng nhập và thay đổi mật khẩu ngay sau khi nhận email này để đảm bảo an toàn.
          </p>
        </div>
        <p>Trân trọng,<br><strong>Đội ngũ Drezzup</strong></p>
      </div>
    `;
  }

  static generateActivationEmailHtml(activationLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Xác nhận đăng ký tài khoản Drezzup</h1>
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký tại Drezzup! Vui lòng nhấn vào nút bên dưới để kích hoạt tài khoản:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activationLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Kích hoạt tài khoản
          </a>
        </div>
        <p>Hoặc copy và paste link sau vào trình duyệt:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">
          ${activationLink}
        </p>
        <p style="color: #666; font-size: 14px;">
          Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
        </p>
        <p>Trân trọng,<br><strong>Đội ngũ Drezzup</strong></p>
      </div>
    `;
  }

  async sendActivationEmail(
    email: string,
    userId: string,
    token: string,
  ): Promise<void> {
    const activationLink = MailService.generateActivationLink(userId, token);
    const html = MailService.generateActivationEmailHtml(activationLink);
    const text = `
Xác nhận đăng ký tài khoản Drezzup

Xin chào,

Cảm ơn bạn đã đăng ký tại Drezzup! Vui lòng truy cập link sau để kích hoạt tài khoản:

${activationLink}

Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Drezzup
    `;

    return await this.sendMail(
      email,
      'Kích hoạt tài khoản Drezzup',
      html,
      text,
    );
  }

  async sendResetPasswordEmail(email: string, password: string): Promise<void> {
    const html = MailService.generateResetPasswordEmail(password);
    const text = `
Đặt lại mật khẩu Drezzup

Xin chào,

Mật khẩu mới của bạn là: ${password}

Vui lòng đăng nhập và thay đổi mật khẩu ngay sau khi nhận email này để đảm bảo an toàn.

Trân trọng,
Đội ngũ Drezzup
    `;

    await this.sendMail(email, 'Đặt lại mật khẩu Drezzup', html, text);
  }

  async sendCustomEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    return await this.sendMail(to, subject, html, text);
  }
}
