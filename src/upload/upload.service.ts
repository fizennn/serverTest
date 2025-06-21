import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}

  generateFileUrl(filename: string): string {
    const baseUrl = this.configService.get(
      'BASE_URL',
      'http://localhost:4949',
    );
    return `${baseUrl}/uploads/${filename}`;
  }

  getFileInfo(file: any) {
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: this.generateFileUrl(file.filename),
    };
  }
}
