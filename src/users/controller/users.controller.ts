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
} from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { AddressAccessGuard } from 'src/guards/address-access.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { AdminProfileDto } from '../dtos/admin.profile.dto';
import { UserDto } from '../dtos/user.dto';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/address.dto';
import { UsersService } from '../services/users.service';
import { PaginatedUsersDto } from '../dtos/paginated-users.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VouchersService } from '../../vouchers/services/vouchers.service';
@ApiTags('Người dùng')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private vouchersService: VouchersService) {}

  @Serialize(PaginatedUsersDto)
  @UseGuards(AdminGuard)
  @Get()
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.usersService.findAll(pageNumber, limitNumber);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteOne(id);
  }

  @Serialize(UserDto)
  @UseGuards(AdminGuard)
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Serialize(UserDto)
  @UseGuards(AdminGuard)
  @Put(':id')
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
  @ApiResponse({ status: 400, description: 'Lỗi dữ liệu hoặc voucher không hợp lệ' })
  async addVoucherToUser(
    @Param('userId') userId: string,
    @Body('voucherId') voucherId: string,
  ) {
    return this.usersService.addVoucherToUser(userId, voucherId, this.vouchersService);
  }

  // Address endpoints
  @Post(':userId/addresses')
  @ApiOperation({ 
    summary: 'Thêm địa chỉ mới cho user',
    description: 'Thêm một địa chỉ mới vào danh sách địa chỉ của user. Chỉ user đó hoặc admin mới có quyền thêm.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { 
          type: 'string', 
          example: '0123456789',
          description: 'Số điện thoại người nhận'
        },
        address: { 
          type: 'string', 
          example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
          description: 'Địa chỉ chi tiết'
        },
      },
      required: ['phone', 'address'],
    },
    examples: {
      'Địa chỉ nhà': {
        value: {
          phone: '0123456789',
          address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM'
        },
        summary: 'Địa chỉ nhà riêng'
      },
      'Địa chỉ công ty': {
        value: {
          phone: '0987654321',
          address: '456 Tòa nhà DEF, Phường UVW, Quận 3, TP.HCM'
        },
        summary: 'Địa chỉ công ty'
      }
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
              address: { type: 'string', example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền thêm địa chỉ.' })
  async addAddress(
    @Param('userId') userId: string,
    @Body() addressData: CreateAddressDto,
  ) {
    return this.usersService.addAddress(userId, addressData);
  }

  @Get(':userId/addresses')
  @UseGuards(AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Lấy danh sách địa chỉ của user',
    description: 'Lấy tất cả địa chỉ đã lưu của user. Chỉ user đó hoặc admin mới có quyền xem.'
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
          address: { type: 'string', example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM' }
        }
      },
      example: [
        {
          phone: '0123456789',
          address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM'
        },
        {
          phone: '0987654321',
          address: '456 Tòa nhà DEF, Phường UVW, Quận 3, TP.HCM'
        }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền xem địa chỉ.' })
  async getAddresses(@Param('userId') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Put(':userId/addresses/:addressId')
  @UseGuards(AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Cập nhật địa chỉ của user theo ID',
    description: 'Cập nhật địa chỉ theo ID trong danh sách địa chỉ của user. Chỉ user đó hoặc admin mới có quyền cập nhật.'
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
              address: { type: 'string', example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ hoặc dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc địa chỉ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền cập nhật địa chỉ.' })
  async updateAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() addressData: UpdateAddressDto,
  ) {
    return this.usersService.updateAddressById(userId, addressId, addressData);
  }

  @Delete(':userId/addresses/:addressId')
  @UseGuards(AddressAccessGuard)
  @ApiOperation({ 
    summary: 'Xóa địa chỉ của user theo ID',
    description: 'Xóa địa chỉ theo ID trong danh sách địa chỉ của user. Chỉ user đó hoặc admin mới có quyền xóa.'
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
              address: { type: 'string', example: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ hoặc user không có địa chỉ nào' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc địa chỉ' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập. Chỉ user đó hoặc admin mới có quyền xóa địa chỉ.' })
  async removeAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.removeAddress(userId, addressId);
  }
}
