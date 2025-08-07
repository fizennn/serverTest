import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Upload, UploadDocument } from './schemas/upload.schema';
import { CreateUploadDto, UpdateUploadDto } from './dtos/upload.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(
    private configService: ConfigService,
    @InjectModel(Upload.name) private uploadModel: Model<UploadDocument>
  ) {}

  generateFileUrl(filename: string): string {
    const serverLink = 'https://209.38.83.181/v1';
    return `${serverLink}/uploads/${filename}`;
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

  async createUploadRecord(file: any, createUploadDto?: CreateUploadDto, uploadedBy?: string): Promise<UploadDocument> {
    const fileInfo = this.getFileInfo(file);
    
    // Chỉ lưu tags là mảng 1 phần tử nếu có, không cần tách dấu phẩy
    let tagsArr: string[] = [];
    if (createUploadDto?.tags) {
      tagsArr = [createUploadDto.tags.trim()];
    }

    // Đảm bảo đường dẫn file được lưu chính xác
    const filePath = file.path || path.join(process.cwd(), 'uploads', file.filename);
    
    const uploadData = {
      ...fileInfo,
      path: filePath,
      description: createUploadDto?.description,
      tags: tagsArr,
      uploadedBy,
      isActive: true,
    };

    console.log('Tạo upload record với đường dẫn:', filePath);
    
    const upload = new this.uploadModel(uploadData);
    return await upload.save();
  }

  async findAll(query: any = {}): Promise<UploadDocument[]> {
    const { page = 1, limit = 10, tags, isActive, search } = query;
    
    let filter: any = {};
    
    // Filter by tags
    if (tags) {
      filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Search by original name or description
    if (search) {
      filter.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    return await this.uploadModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();
  }

  async findOne(id: string): Promise<UploadDocument> {
    const upload = await this.uploadModel.findById(id).exec();
    if (!upload) {
      throw new NotFoundException('Không tìm thấy file upload');
    }
    return upload;
  }

  async update(id: string, updateUploadDto: UpdateUploadDto): Promise<UploadDocument> {
    const upload = await this.uploadModel
      .findByIdAndUpdate(id, updateUploadDto, { new: true })
      .exec();
    
    if (!upload) {
      throw new NotFoundException('Không tìm thấy file upload');
    }
    
    return upload;
  }

  async remove(id: string): Promise<{ message: string }> {
    const upload = await this.uploadModel.findById(id).exec();
    
    if (!upload) {
      throw new NotFoundException('Không tìm thấy file upload');
    }

    // Xóa file vật lý
    try {
      console.log('Đang xóa file:', upload.path);
      
      // Kiểm tra file có tồn tại không
      if (fs.existsSync(upload.path)) {
        console.log('File tồn tại, đang xóa...');
        fs.unlinkSync(upload.path);
        console.log('Đã xóa file thành công:', upload.path);
      } else {
        console.log('File không tồn tại tại đường dẫn:', upload.path);
        
        // Thử tìm file trong thư mục uploads
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const possiblePath = path.join(uploadsDir, upload.filename);
        
        if (fs.existsSync(possiblePath)) {
          console.log('Tìm thấy file tại:', possiblePath);
          fs.unlinkSync(possiblePath);
          console.log('Đã xóa file thành công:', possiblePath);
        } else {
          console.log('Không tìm thấy file tại:', possiblePath);
        }
      }
    } catch (error) {
      console.error('Lỗi khi xóa file vật lý:', error);
      console.error('Đường dẫn file:', upload.path);
      console.error('Tên file:', upload.filename);
    }

    // Xóa record từ database
    await this.uploadModel.findByIdAndDelete(id).exec();
    console.log('Đã xóa record từ database:', id);
    
    return { message: 'Xóa file upload thành công' };
  }

  async getStats(): Promise<any> {
    const totalFiles = await this.uploadModel.countDocuments();
    const totalSize = await this.uploadModel.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    
    const filesByType = await this.uploadModel.aggregate([
      { $group: { _id: '$mimetype', count: { $sum: 1 } } }
    ]);
    
    const filesByTag = await this.uploadModel.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } }
    ]);

    return {
      totalFiles,
      totalSize: totalSize[0]?.totalSize || 0,
      filesByType,
      filesByTag
    };
  }

  async findByTags(tags: string[]): Promise<UploadDocument[]> {
    return await this.uploadModel
      .find({ tags: { $in: tags }, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async fixFilePaths(): Promise<{ fixed: number; total: number }> {
    const uploads = await this.uploadModel.find().exec();
    let fixed = 0;
    
    for (const upload of uploads) {
      const correctPath = path.join(process.cwd(), 'uploads', upload.filename);
      
      if (upload.path !== correctPath) {
        console.log(`Sửa đường dẫn cho ${upload.filename}:`);
        console.log(`  Từ: ${upload.path}`);
        console.log(`  Thành: ${correctPath}`);
        
        await this.uploadModel.findByIdAndUpdate(upload._id, {
          path: correctPath
        }).exec();
        
        fixed++;
      }
    }
    
    return { fixed, total: uploads.length };
  }

  async checkFileIntegrity(): Promise<any[]> {
    const uploads = await this.uploadModel.find().exec();
    const results = [];
    
    for (const upload of uploads) {
      const exists = fs.existsSync(upload.path);
      const uploadsPath = path.join(process.cwd(), 'uploads', upload.filename);
      const existsInUploads = fs.existsSync(uploadsPath);
      
      results.push({
        id: upload._id,
        filename: upload.filename,
        path: upload.path,
        exists: exists,
        existsInUploads: existsInUploads,
        correctPath: uploadsPath,
        needsFix: !exists && existsInUploads
      });
    }
    
    return results;
  }

  async createImageLinkRecord(body: { url: string; description?: string; tags?: string }, uploadedBy?: string) {
    // Giả lập thông tin file từ url
    const url = body.url;
    const filename = url.split('/').pop() || 'image-link';
    const mimetype = this.getMimeTypeFromUrl(url);
    const fileInfo = {
      originalName: filename,
      filename: filename,
      size: 0,
      mimetype: mimetype,
      url: url,
      path: url,
    };
    let tagsArr: string[] = [];
    if (body.tags) {
      tagsArr = [body.tags.trim()];
    }
    const uploadData = {
      ...fileInfo,
      description: body.description,
      tags: tagsArr,
      uploadedBy,
      isActive: true,
    };
    const upload = new this.uploadModel(uploadData);
    return await upload.save();
  }

  getMimeTypeFromUrl(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
}
