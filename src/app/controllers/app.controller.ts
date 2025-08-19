import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from '../services/app.service';
import { Response } from 'express';
import { join } from 'path';

@Controller('')
export class AppController {
  constructor(private appService: AppService) {}

  @Get('activation.html')
  serveActivationPage(@Res() res: Response) {
    // Sử dụng đường dẫn tuyệt đối từ thư mục gốc của project
    const filePath = join(process.cwd(), 'src', 'public', 'activation.html');
    res.sendFile(filePath);
  }

  @Get('activation.js')
  serveActivationJS(@Res() res: Response) {
    // Sử dụng đường dẫn tuyệt đối từ thư mục gốc của project
    const filePath = join(process.cwd(), 'src', 'public', 'activation.js');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  }
}
