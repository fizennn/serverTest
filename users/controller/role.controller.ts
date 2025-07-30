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
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { RoleService } from '../services/role.service';
import { CreateRoleDto, UpdateRoleDto, RoleDto, RolesResponseDto } from '../dtos/role.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Vai trò')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get('test/db')
  @ApiOperation({ 
    summary: 'Test database connection',
    description: 'Test kết nối database và dữ liệu roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Test database thành công',
  })
  async testDatabase() {
    try {
      // Test trực tiếp với model
      const roles = await this.roleService['roleModel'].find({}).limit(5);
      const total = await this.roleService['roleModel'].countDocuments({});
      
      return {
        message: 'Database test',
        totalRoles: total,
        sampleRoles: roles.map(role => ({
          _id: role._id,
          name: role.name,
          description: role.description,
          isActive: role.isActive
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        message: 'Database test failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('test')
  @ApiOperation({ 
    summary: 'Test endpoint để debug',
    description: 'Endpoint test để kiểm tra dữ liệu roles (không cần auth)',
  })
  @ApiResponse({
    status: 200,
    description: 'Test thành công',
  })
  async testRoles() {
    try {
      // Test sử dụng service methods
      const result = await this.roleService.findAll(1, 1000); // Lấy tất cả roles
      
      return {
        message: 'Test endpoint',
        totalCount: result.total,
        roles: result.items,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        message: 'Error occurred',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @UseGuards(AdminGuard)
  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách vai trò',
    description: 'Lấy danh sách tất cả vai trò trong hệ thống',
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
    description: 'Lấy danh sách vai trò thành công',
    type: RolesResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem danh sách vai trò.',
  })
  async getRoles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    return this.roleService.findAll(pageNumber, limitNumber);
  }

  @Serialize(RoleDto)
  @UseGuards(AdminGuard)
  @Get('active')
  @ApiOperation({ 
    summary: 'Lấy danh sách vai trò đang hoạt động',
    description: 'Lấy danh sách các vai trò có trạng thái active',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách vai trò active thành công',
    type: [RoleDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem.',
  })
  async getActiveRoles() {
    return this.roleService.findActiveRoles();
  }

  @Serialize(RoleDto)
  @UseGuards(AdminGuard)
  @Get('statistics')
  @ApiOperation({ 
    summary: 'Thống kê vai trò',
    description: 'Lấy thống kê về vai trò trong hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê vai trò thành công',
    schema: {
      type: 'object',
      properties: {
        totalRoles: { type: 'number', example: 10 },
        activeRoles: { type: 'number', example: 8 },
        inactiveRoles: { type: 'number', example: 2 },
        rolesByPermission: {
          type: 'object',
          properties: {
            isOrder: { type: 'number', example: 5 },
            isProduct: { type: 'number', example: 8 },
            isCategory: { type: 'number', example: 6 },
            isPost: { type: 'number', example: 3 },
            isVoucher: { type: 'number', example: 4 },
            isBanner: { type: 'number', example: 2 },
            isAnalytic: { type: 'number', example: 7 },
            isReturn: { type: 'number', example: 3 },
            isUser: { type: 'number', example: 6 },
            isRole: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem thống kê.',
  })
  async getRoleStatistics() {
    return this.roleService.getRoleStatistics();
  }

  @Serialize(RoleDto)
  @UseGuards(AdminGuard)
  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy chi tiết vai trò',
    description: 'Lấy thông tin chi tiết của một vai trò theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của vai trò',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết vai trò thành công',
    type: RoleDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy vai trò',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xem.',
  })
  async getRole(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Serialize(RoleDto)
  @UseGuards(AdminGuard)
  @Post()
  @ApiOperation({ 
    summary: 'Tạo vai trò mới',
    description: 'Tạo một vai trò mới trong hệ thống',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo vai trò thành công',
    type: RoleDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên vai trò đã tồn tại',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền tạo vai trò.',
  })
  async createRole(@Body() roleData: CreateRoleDto) {
    return this.roleService.create(roleData);
  }

  @Serialize(RoleDto)
  @UseGuards(AdminGuard)
  @Put(':id')
  @ApiOperation({ 
    summary: 'Cập nhật vai trò',
    description: 'Cập nhật thông tin của một vai trò',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của vai trò cần cập nhật',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật vai trò thành công',
    type: RoleDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy vai trò',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền cập nhật.',
  })
  async updateRole(
    @Param('id') id: string,
    @Body() roleData: UpdateRoleDto,
  ) {
    const result = await this.roleService.update(id, roleData);
    console.log('Update result:', JSON.stringify(result, null, 2));
    return result;
  }

  @UseGuards(AdminGuard)
  @Put(':id/debug')
  @ApiOperation({ 
    summary: 'Debug cập nhật vai trò',
    description: 'Endpoint debug để kiểm tra dữ liệu trả về khi update role',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của vai trò cần cập nhật',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Debug cập nhật vai trò',
  })
  async updateRoleDebug(
    @Param('id') id: string,
    @Body() roleData: UpdateRoleDto,
  ) {
    try {
      const result = await this.roleService.update(id, roleData);
      console.log('Raw update result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
      
      return {
        success: true,
        message: 'Update thành công',
        data: result,
        rawData: JSON.stringify(result),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Update error:', error);
      return {
        success: false,
        message: 'Update thất bại',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @UseGuards(AdminGuard)
  @Put(':id/no-serialize')
  @ApiOperation({ 
    summary: 'Cập nhật vai trò (không serialize)',
    description: 'Cập nhật vai trò mà không sử dụng Serialize interceptor',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của vai trò cần cập nhật',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật vai trò thành công (không serialize)',
  })
  async updateRoleNoSerialize(
    @Param('id') id: string,
    @Body() roleData: UpdateRoleDto,
  ) {
    const result = await this.roleService.update(id, roleData);
    return {
      success: true,
      message: 'Update thành công (không serialize)',
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa vai trò',
    description: 'Xóa một vai trò khỏi hệ thống',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của vai trò cần xóa',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa vai trò thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'ID không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy vai trò',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền xóa vai trò.',
  })
  async deleteRole(@Param('id') id: string) {
    return this.roleService.delete(id);
  }

  @UseGuards(AdminGuard)
  @Post('seed')
  @ApiOperation({ 
    summary: 'Tạo dữ liệu vai trò mẫu',
    description: 'Tạo các vai trò mẫu cho hệ thống (chỉ chạy khi chưa có vai trò nào)',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo vai trò mẫu thành công',
    type: [RoleDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc đã có vai trò',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập. Chỉ admin mới có quyền tạo vai trò mẫu.',
  })
  async seedRoles() {
    return this.roleService.seedRoles();
  }
} 