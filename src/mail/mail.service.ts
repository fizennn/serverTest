import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      html,
    });
  }

  static generateActivationLink(userId: string, token: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3001/v1';
    return `${appUrl}/auth/activate?userId=${userId}&token=${token}`;
  }

  static generateResetPasswordEmail(password: string): string {
    return `
      <h1>Đặt lại mật khẩu Drezzup</h1>
      <p>Xin chào,</p>
      <p>Mật khẩu mới của bạn là: <strong>${password}</strong></p>
      <p>Vui lòng đăng nhập và thay đổi mật khẩu ngay sau khi nhận email này để đảm bảo an toàn.</p>
      <p>Trân trọng,<br>Đội ngũ Drezzup</p>
    `;
  }

  async sendActivationEmail(email: string, userId: string, token: string): Promise<void> {
    const activationLink = MailService.generateActivationLink(userId, token);
    const html = `
      <h1>Xác nhận đăng ký tài khoản Drezzup</h1>
      <p>Xin chào,</p>
      <p>Cảm ơn bạn đã đăng ký tại Drezzup! Vui lòng nhấn vào link bên dưới để kích hoạt tài khoản:</p>
      <p><a href="${activationLink}">Kích hoạt tài khoản</a></p>
      <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>
      <p>Trân trọng,<br>Đội ngũ Drezzup</p>
    `;
    await this.sendMail(email, 'Kích hoạt tài khoản Drezzup', html);
  }

  async sendResetPasswordEmail(email: string, password: string): Promise<void> {
    const html = MailService.generateResetPasswordEmail(password);
    await this.sendMail(email, 'Đặt lại mật khẩu Drezzup', html);
  }
}