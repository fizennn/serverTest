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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VariantIdDto, SizeIdDto, ProductSearchDto } from '../dtos/product.dto';
@ApiTags('Quản lý sản phẩm')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private appService: AppService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Tìm kiếm sản phẩm nâng cao',
    description: 'Tìm kiếm sản phẩm với nhiều tiêu chí: từ khóa (tên, mô tả, brand, ID sản phẩm), brand, category, giá, rating, tồn kho, sắp xếp...'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách sản phẩm tìm thấy (có phân trang)',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        pages: { type: 'number', example: 10 }
      }
    }
  })
  getProducts(@Query() searchDto: ProductSearchDto) {
    return this.productsService.findManyAdvanced(searchDto);
  }

  @Get('topRated')
  getTopRatedProducts() {
    return this.productsService.findTopRated();
  }

  @Get('variant/:variantId')
  @ApiOperation({ 
    summary: 'Lấy tất cả sản phẩm theo ID của biến thể màu sắc',
    description: 'Tìm kiếm tất cả sản phẩm có chứa biến thể với ID được chỉ định'
  })
  @ApiParam({ 
    name: 'variantId', 
    description: 'ID của biến thể màu sắc',
    example: '68551b6f0bc19e44a4ae1920'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách sản phẩm tìm thấy' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'ID biến thể không hợp lệ' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Không tìm thấy sản phẩm nào với variant ID này' 
  })
  getProductsByVariantId(@Param() params: VariantIdDto) {
    return this.productsService.findByVariantId(params.variantId);
  }

  @Get('size/:sizeId')
  @ApiOperation({ 
    summary: 'Lấy tất cả sản phẩm theo ID của size',
    description: 'Tìm kiếm tất cả sản phẩm có chứa size với ID được chỉ định'
  })
  @ApiParam({ 
    name: 'sizeId', 
    description: 'ID của size',
    example: '68551b6f0bc19e44a4ae1921'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách sản phẩm tìm thấy' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'ID size không hợp lệ' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Không tìm thấy sản phẩm nào với size ID này' 
  })
  getProductsBySizeId(@Param() params: SizeIdDto) {
    return this.productsService.findBySizeId(params.sizeId);
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

  @Get('category/:categoryId')
  @ApiOperation({
    summary: 'Lấy tất cả sản phẩm theo category id',
    description: 'Trả về danh sách sản phẩm thuộc về một category id cụ thể, có phân trang.'
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID của category',
    example: '66551b6f0bc19e44a4ae1920'
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sản phẩm theo category id (có phân trang)'
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sản phẩm nào với category id này'
  })
  getProductsByCategory(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findByCategory(categoryId, page, limit);
  }

  @UseGuards(AdminGuard)
  @Post('many')
  @ApiOperation({ summary: 'Thêm nhiều sản phẩm cùng lúc (bulk)', description: 'Tạo nhiều sản phẩm, truyền vào một mảng ProductDto.' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: [ProductDto] })
  async createManyProducts(@Body() products: ProductDto[]) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException('Cần truyền vào một mảng sản phẩm hợp lệ!');
    }
    return this.productsService.createMany(products);
  }

  @UseGuards(AdminGuard)
  @Put(':id/update-count-in-stock')
  @ApiOperation({ 
    summary: 'Cập nhật countInStock cho một sản phẩm', 
    description: 'Tính toán lại thuộc tính countInStock dựa trên stock của các biến thể' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID của sản phẩm cần cập nhật',
    example: '686bd9a9b25d1e23015d4287'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cập nhật thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        countInStock: { type: 'number' },
        variants: { type: 'array' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'ID sản phẩm không hợp lệ' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Không tìm thấy sản phẩm' 
  })
  async updateCountInStock(@Param('id') id: string) {
    return this.productsService.updateCountInStock(id);
  }

  @UseGuards(AdminGuard)
  @Put('update-all-count-in-stock')
  @ApiOperation({ 
    summary: 'Cập nhật countInStock cho tất cả sản phẩm', 
    description: 'Tính toán lại thuộc tính countInStock cho tất cả sản phẩm trong hệ thống dựa trên stock của các biến thể' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cập nhật thành công',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', description: 'Số lượng sản phẩm đã được cập nhật' },
        products: { 
          type: 'array', 
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              countInStock: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async updateAllCountInStock() {
    return this.productsService.updateAllCountInStock();
  }
}
