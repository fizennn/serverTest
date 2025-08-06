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
  BadRequestException,
} from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { AddressAccessGuard } from 'src/guards/address-access.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { UserDto } from '../dtos/user.dto';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/address.dto';
import { UsersService } from '../services/users.service';
import { PaginatedUsersDto } from '../dtos/paginated-users.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VouchersService } from '../../vouchers/services/vouchers.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { AddFavoriteProductDto } from '../dtos/add-favorite-product.dto';
@ApiTags('Người dùng')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private vouchersService: VouchersService,
  ) {}

  @Serialize(PaginatedUsersDto)
  @UseGuards(AdminGuard)
  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách tất cả người dùng',
    description: 'Lấy danh sách tất cả người dùng trong hệ thống với phân trang',
  })
  @ApiQuery({
    name: 'page',
    description: 'Số trang',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng item mỗi trang',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách users thành công',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'john@example.com' },
              isAdmin: { type: 'boolean', example: false },
              isActive: { type: 'boolean', example: true },
              roleId: { 
                type: 'object', 
                example: { 
                  _id: '665f1e2b2c8b2a0012a4e123', 
                  name: 'Customer',
                  description: 'Khách hàng thông thường'
                } 
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        pages: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem danh sách users.',
  })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAll(pageNumber, limitNumber);
  }

  @Serialize(PaginatedUsersDto)
  @UseGuards(AdminGuard)
  @Get('admins')
  @ApiOperation({ 
    summary: 'Lấy tất cả admin',
    description: 'Lấy danh sách tất cả người dùng có quyền admin (isAdmin = true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách admin thành công',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
              name: { type: 'string', example: 'Admin User' },
              email: { type: 'string', example: 'admin@example.com' },
              isAdmin: { type: 'boolean', example: true },
              isActive: { type: 'boolean', example: true },
              roleId: { 
                type: 'object', 
                example: { 
                  _id: '665f1e2b2c8b2a0012a4e123', 
                  name: 'Super Admin',
                  description: 'Quản trị viên cấp cao',
                  isOrder: true,
                  isProduct: true,
                  isCategory: true,
                  isPost: true,
                  isVoucher: true,
                  isBanner: true,
                  isAnalytic: true,
                  isReturn: true,
                  isUser: true
                } 
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 5 },
        page: { type: 'number', example: 1 },
        pages: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem danh sách admin.',
  })
  async getAdmins(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAllAdmins(pageNumber, limitNumber);
  }

  @Serialize(PaginatedUsersDto)
  @UseGuards(AdminGuard)
  @Get('by-permission/:permission')
  @ApiOperation({ 
    summary: 'Lấy users theo quyền hạn',
    description: 'Lấy danh sách người dùng có quyền hạn cụ thể (isProduct, isOrder, etc.)',
  })
  @ApiParam({
    name: 'permission',
    description: 'Tên quyền hạn cần tìm',
    example: 'isProduct',
    schema: {
      type: 'string',
      enum: ['isOrder', 'isProduct', 'isCategory', 'isPost', 'isVoucher', 'isBanner', 'isAnalytic', 'isReturn', 'isUser'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách users theo quyền hạn thành công',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
              name: { type: 'string', example: 'Product Manager' },
              email: { type: 'string', example: 'manager@example.com' },
              isActive: { type: 'boolean', example: true },
              roleId: { 
                type: 'object', 
                example: { 
                  _id: '665f1e2b2c8b2a0012a4e123', 
                  name: 'Product Manager',
                  description: 'Quản lý sản phẩm và danh mục',
                  isProduct: true,
                  isCategory: true,
                  isAnalytic: true
                } 
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        pages: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Tên quyền hạn không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem danh sách users.',
  })
  async getUsersByPermission(
    @Param('permission') permission: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    // Validate permission name
    const validPermissions = [
      'isOrder', 'isProduct', 'isCategory', 'isPost', 
      'isVoucher', 'isBanner', 'isAnalytic', 'isReturn', 'isUser'
    ];
    
    if (!validPermissions.includes(permission)) {
      throw new BadRequestException(`Quyền hạn không hợp lệ. Các quyền hợp lệ: ${validPermissions.join(', ')}`);
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAllByPermission(permission, pageNumber, limitNumber);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteOne(id);
  }

  @Serialize(UserDto)
  @UseGuards(AdminGuard)
  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy thông tin chi tiết user',
    description: 'Lấy thông tin chi tiết của một user theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của user',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin user thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        isAdmin: { type: 'boolean', example: false },
        isActive: { type: 'boolean', example: true },
        roleId: { 
          type: 'object', 
          example: { 
            _id: '665f1e2b2c8b2a0012a4e123', 
            name: 'Customer',
            description: 'Khách hàng thông thường'
          } 
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy user',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem thông tin user.',
  })
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Serialize(UserDto)
  @UseGuards(AdminGuard)
  @Put(':id')
  @ApiOperation({ 
    summary: 'Cập nhật thông tin user',
    description: 'Cập nhật thông tin của một user theo ID (chỉ admin). Có thể cập nhật status (isActive) và roleId.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của user',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe', description: 'Tên user' },
        email: { type: 'string', example: 'john@example.com', description: 'Email user' },
        isAdmin: { type: 'boolean', example: false, description: 'Quyền admin' },
        isActive: { type: 'boolean', example: true, description: 'Trạng thái hoạt động' },
        roleId: { type: 'string', example: '665f1e2b2c8b2a0012a4e123', description: 'ID của role' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật user thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        isAdmin: { type: 'boolean', example: false },
        isActive: { type: 'boolean', example: true },
        roleId: { 
          type: 'object', 
          example: { 
            _id: '665f1e2b2c8b2a0012a4e123', 
            name: 'Customer',
            description: 'Khách hàng thông thường'
          } 
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy user',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền cập nhật user.',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() credentials: AdminProfileDto,
  ) {
    return this.usersService.adminUpdate(id, credentials);
  }

  @Serialize(UserDto)
  @Post('seed')
  @UseGuards(AdminGuard)
  async generateUsers() {
    return this.usersService.generateUsers(500);
  }

  @Post(':userId/add-voucher')
  @ApiOperation({ summary: 'Thêm voucher cho user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        voucherId: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
      },
      required: ['voucherId'],
    },
    examples: {
      'Thêm voucher cho user': {
        value: {
          voucherId: '665f1e2b2c8b2a0012a4e123',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Thêm voucher cho user thành công' })
  @ApiResponse({
    status: 400,
    description: 'Lỗi dữ liệu hoặc voucher không hợp lệ',
  })
  async addVoucherToUser(
    @Param('userId') userId: string,
    @Body('voucherId') voucherId: string,
  ) {
    return this.usersService.addVoucherToUser(
      userId,
      voucherId,
      this.vouchersService,
    );
  }

  @Delete(':userId/remove-voucher/:voucherId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'User tự xóa voucher khỏi danh sách voucher của mình',
    description: 'User tự xóa voucher đã nhận khỏi danh sách voucher của mình. Voucher sẽ được trả lại stock và user không thể sử dụng voucher này nữa.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Xóa voucher khỏi user thành công'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Voucher ID hoặc User ID không hợp lệ, hoặc user không có quyền sử dụng voucher này' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Voucher không tồn tại' 
  })
  async removeVoucherFromUser(
    @Param('userId') userId: string,
    @Param('voucherId') voucherId: string,
  ) {
    return this.usersService.removeVoucherFromUser(
      userId,
      voucherId,
      this.vouchersService,
    );
  }

  @Post(':userId/favorite-products')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Thêm sản phẩm yêu thích cho user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
      },
      required: ['productId'],
    },
    examples: {
      'Thêm sản phẩm yêu thích': {
        value: {
          productId: '665f1e2b2c8b2a0012a4e123',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Thêm sản phẩm yêu thích thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi dữ liệu hoặc sản phẩm đã có trong danh sách yêu thích' })
  async addFavoriteProduct(
    @Param('userId') userId: string,
    @Body() body: AddFavoriteProductDto,
  ) {
    return this.usersService.addFavoriteProduct(userId, body.productId);
  }

  @Delete(':userId/favorite-products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xoá sản phẩm khỏi danh sách yêu thích' })
  @ApiResponse({ status: 200, description: 'Xoá sản phẩm khỏi danh sách yêu thích thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi dữ liệu hoặc sản phẩm không có trong danh sách yêu thích' })
  async removeFavoriteProduct(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.usersService.removeFavoriteProduct(userId, productId);
  }

  @Get(':userId/favorite-products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kiểm tra sản phẩm có được yêu thích không' })
  @ApiResponse({ status: 200, description: 'Trả về true/false' })
  async isProductFavorited(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return { favorited: await this.usersService.isProductFavorited(userId, productId) };
  }

  @Get(':userId/favorite-products')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm yêu thích của user' })
  @ApiResponse({ status: 200, description: 'Danh sách id sản phẩm yêu thích' })
  async getFavoriteProducts(
    @Param('userId') userId: string,
  ) {
    return { favoriteProducts: await this.usersService.getFavoriteProducts(userId) };
  }

  // Address endpoints
  @Post(':userId/addresses')
  @UseGuards(JwtAuthGuard, AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Thêm địa chỉ mới cho user',
    description:
      'Thêm một địa chỉ mới vào danh sách địa chỉ của user. Chỉ user đó hoặc admin mới có quyền thêm.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          example: '0123456789',
          description: 'Số điện thoại người nhận',
        },
        address: {
          type: 'string',
          example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
          description: 'Địa chỉ chi tiết',
        },
      },
      required: ['phone', 'address'],
    },
    examples: {
      'Địa chỉ nhà': {
        value: {
          phone: '0123456789',
          address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
        },
        summary: 'Địa chỉ nhà riêng',
      },
      'Địa chỉ công ty': {
        value: {
          phone: '0987654321',
          address: '456 Tòa nhà DEF, Phường UVW, Quận 3, TP.HCM',
        },
        summary: 'Địa chỉ công ty',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm địa chỉ thành công',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'user@example.com' },
        addresses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '0123456789' },
              address: {
                type: 'string',
                example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({
    status: 403,
    description:
      'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền thêm địa chỉ.',
  })
  async addAddress(
    @Param('userId') userId: string,
    @Body() addressData: CreateAddressDto,
  ) {
    return this.usersService.addAddress(userId, addressData);
  }

  @Get(':userId/addresses')
  @UseGuards(JwtAuthGuard, AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Lấy danh sách địa chỉ của user',
    description:
      'Lấy tất cả địa chỉ đã lưu của user. Chỉ user đó hoặc admin mới có quyền xem.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách địa chỉ thành công',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '0123456789' },
          address: {
            type: 'string',
            example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
          },
        },
      },
      example: [
        {
          phone: '0123456789',
          address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
        },
        {
          phone: '0987654321',
          address: '456 Tòa nhà DEF, Phường UVW, Quận 3, TP.HCM',
        },
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({
    status: 403,
    description:
      'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền xem địa chỉ.',
  })
  async getAddresses(@Param('userId') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Put(':userId/addresses/:addressId')
  @UseGuards(JwtAuthGuard, AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Cập nhật địa chỉ của user theo ID',
    description:
      'Cập nhật địa chỉ theo ID trong danh sách địa chỉ của user. Chỉ user đó hoặc admin mới có quyền cập nhật.',
  })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật địa chỉ thành công',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'user@example.com' },
        addresses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '0123456789' },
              address: {
                type: 'string',
                example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc địa chỉ' })
  @ApiResponse({
    status: 403,
    description:
      'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền cập nhật địa chỉ.',
  })
  async updateAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() addressData: UpdateAddressDto,
  ) {
    return this.usersService.updateAddressById(userId, addressId, addressData);
  }

  @Delete(':userId/addresses/:addressId')
  @UseGuards(JwtAuthGuard, AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Xóa địa chỉ của user theo ID',
    description:
      'Xóa địa chỉ theo ID trong danh sách địa chỉ của user. Chỉ user đó hoặc admin mới có quyền xóa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa địa chỉ thành công',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'user@example.com' },
        addresses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              phone: { type: 'string', example: '0123456789' },
              address: {
                type: 'string',
                example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ hoặc user không có địa chỉ nào',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc địa chỉ' })
  @ApiResponse({
    status: 403,
    description:
      'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền xóa địa chỉ.',
  })
  async removeAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.removeAddress(userId, addressId);
  }

  // Quản lý quyền hạn
  @Put(':userId/permissions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ 
    summary: 'Cập nhật quyền hạn của user',
    description: 'Cập nhật các quyền hạn của user. Chỉ admin mới có quyền cập nhật.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isOrder: { type: 'boolean', example: true },
        isProduct: { type: 'boolean', example: true },
        isCategory: { type: 'boolean', example: true },
        isPost: { type: 'boolean', example: true },
        isVoucher: { type: 'boolean', example: true },
        isBanner: { type: 'boolean', example: true },
        isAnalytic: { type: 'boolean', example: true },
        isReturn: { type: 'boolean', example: true },
        isUser: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật quyền hạn thành công',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'user@example.com' },
        isOrder: { type: 'boolean', example: true },
        isProduct: { type: 'boolean', example: true },
        isCategory: { type: 'boolean', example: true },
        isPost: { type: 'boolean', example: true },
        isVoucher: { type: 'boolean', example: true },
        isBanner: { type: 'boolean', example: true },
        isAnalytic: { type: 'boolean', example: true },
        isReturn: { type: 'boolean', example: true },
        isUser: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền cập nhật quyền hạn.',
  })
  async updatePermissions(
    @Param('userId') userId: string,
    @Body() permissions: {
      isOrder?: boolean;
      isProduct?: boolean;
      isCategory?: boolean;
      isPost?: boolean;
      isVoucher?: boolean;
      isBanner?: boolean;
      isAnalytic?: boolean;
      isReturn?: boolean;
      isUser?: boolean;
    },
  ) {
    return this.usersService.updatePermissions(userId, permissions);
  }

  @Get(':userId/permissions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ 
    summary: 'Lấy quyền hạn của user',
    description: 'Lấy danh sách quyền hạn của user. Chỉ admin mới có quyền xem.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy quyền hạn thành công',
    schema: {
      type: 'object',
      properties: {
        isOrder: { type: 'boolean', example: true },
        isProduct: { type: 'boolean', example: true },
        isCategory: { type: 'boolean', example: false },
        isPost: { type: 'boolean', example: false },
        isVoucher: { type: 'boolean', example: true },
        isBanner: { type: 'boolean', example: false },
        isAnalytic: { type: 'boolean', example: true },
        isReturn: { type: 'boolean', example: false },
        isUser: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem quyền hạn.',
  })
  async getPermissions(@Param('userId') userId: string) {
    return this.usersService.getPermissions(userId);
  }

  // Quản lý vai trò cho user
  @Put(':userId/role')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ 
    summary: 'Gán vai trò cho user',
    description: 'Gán vai trò cho user. Chỉ admin mới có quyền thực hiện.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID của user',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleId: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
      },
      required: ['roleId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gán vai trò thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        isAdmin: { type: 'boolean', example: false },
        isActive: { type: 'boolean', example: true },
        roleId: { 
          type: 'object', 
          example: { 
            _id: '665f1e2b2c8b2a0012a4e123', 
            name: 'Product Manager',
            description: 'Quản lý sản phẩm và danh mục',
            isProduct: true,
            isCategory: true,
            isAnalytic: true
          } 
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc role' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền gán vai trò.',
  })
  async assignRole(
    @Param('userId') userId: string,
    @Body('roleId') roleId: string,
  ) {
    return this.usersService.assignRole(userId, roleId);
  }

  @Delete(':userId/role')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ 
    summary: 'Xóa vai trò của user',
    description: 'Xóa vai trò hiện tại của user. Chỉ admin mới có quyền thực hiện.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID của user',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa vai trò thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        isAdmin: { type: 'boolean', example: false },
        isActive: { type: 'boolean', example: true },
        roleId: { type: 'null', example: null },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xóa vai trò.',
  })
  async removeRole(@Param('userId') userId: string) {
    return this.usersService.removeRole(userId);
  }

  // Lấy users theo vai trò
  @Get('by-role/:roleId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ 
    summary: 'Lấy users theo vai trò',
    description: 'Lấy danh sách users có vai trò cụ thể',
  })
  @ApiParam({
    name: 'roleId',
    description: 'ID của vai trò',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiQuery({
    name: 'page',
    description: 'Số trang',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng item mỗi trang',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách users theo vai trò thành công',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'john@example.com' },
              roleId: { type: 'object', example: { _id: '665f1e2b2c8b2a0012a4e123', name: 'Product Manager' } },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 10 },
        page: { type: 'number', example: 1 },
        pages: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem.',
  })
  async getUsersByRole(
    @Param('roleId') roleId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAllByRole(roleId, pageNumber, limitNumber);
  }

  // Thống kê nhân viên
  @Get('statistics/employees')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ 
    summary: 'Thống kê nhân viên',
    description: 'Lấy thống kê chi tiết về nhân viên trong hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê nhân viên thành công',
    schema: {
      type: 'object',
      properties: {
        totalEmployees: { type: 'number', example: 25 },
        activeEmployees: { type: 'number', example: 20 },
        inactiveEmployees: { type: 'number', example: 5 },
        employeesByRole: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
              count: { type: 'number', example: 8 },
              roleName: { type: 'string', example: 'Product Manager' },
            },
          },
        },
        employeesByPermission: {
          type: 'object',
          properties: {
            isOrder: { type: 'number', example: 15 },
            isProduct: { type: 'number', example: 20 },
            isCategory: { type: 'number', example: 12 },
            isPost: { type: 'number', example: 8 },
            isVoucher: { type: 'number', example: 10 },
            isBanner: { type: 'number', example: 5 },
            isAnalytic: { type: 'number', example: 18 },
            isReturn: { type: 'number', example: 6 },
            isUser: { type: 'number', example: 14 },
          },
        },
        recentEmployees: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '665f1e2b2c8b2a0012a4e123' },
              name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', example: 'john@example.com' },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time' },
              roleId: { type: 'object', example: { _id: '665f1e2b2c8b2a0012a4e123', name: 'Product Manager' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem thống kê.',
  })
  async getEmployeeStatistics() {
    return this.usersService.getEmployeeStatistics();
  }

  @Get('statistics/employee-activity')
  @UseGuards(AdminGuard)
  @ApiOperation({ 
    summary: 'Thống kê hoạt động nhân viên',
    description: 'Lấy thống kê hoạt động đăng nhập của nhân viên',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    required: false,
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    required: false,
    type: String,
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê hoạt động nhân viên thành công',
  })
  async getEmployeeActivityStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
    return this.usersService.getEmployeeActivityStatistics(dateRange);
  }

}
