import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { ProductDto } from '../dtos/product.dto';
import { ReviewDto } from '../dtos/review.dto';
import { ProductsService } from '../services/products.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AppService } from '@/app/services/app.service';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
@ApiTags('Quản lý sản phẩm')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private appService: AppService,
  ) {}

  @Get()
  getProducts(
    @Query('keyword') keyword: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.productsService.findMany(keyword, page, limit);
  }

  @Get('topRated')
  getTopRatedProducts() {
    return this.productsService.findTopRated();
  }

  @Get(':id')
  getProduct(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.productsService.deleteOne(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
          cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async createProduct(
    @Body() productData:ProductDto,
  ) {
    if (!productData.images) {
      throw new BadRequestException('Cần ít nhất 1 ảnh');
    }

    try {
   

      return this.productsService.create({
        ...productData,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Không thể tạo sản phẩn',
      );
    }
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  updateProduct(@Param('id') id: string, @Body() product: ProductDto) {
    return this.productsService.update(id, product);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/review')
  createReview(
    @Param('id') id: string,
    @Body() { rating, comment }: ReviewDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.productsService.createReview(id, user, rating, comment);
  }
}
