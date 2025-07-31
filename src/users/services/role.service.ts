import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, RoleDocument } from '../schemas/role.schema';
import { User } from '../schemas/user.schema';
import { CreateRoleDto, UpdateRoleDto } from '../dtos/role.dto';
import { PaginatedResponse } from '../../shared/types';
import { generateRoles } from '../../utils/seed-roles';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(roleData: CreateRoleDto): Promise<RoleDocument> {
    try {
      const newRole = await this.roleModel.create(roleData);
      this.logger.log(`Role created: ${newRole.name}`);
      return newRole;
    } catch (error: any) {
      this.logger.error(`Failed to create role: ${error.message}`);

      if (error.code === 11000) {
        throw new BadRequestException('Tên vai trò đã tồn tại');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Failed to create role');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<RoleDocument>> {
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      this.roleModel
        .find({})
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.roleModel.countDocuments({}),
    ]);

    return {
      items: roles,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<RoleDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid role ID');
    }

    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel.findOne({ name });
  }

  async update(id: string, roleData: UpdateRoleDto): Promise<RoleDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid role ID');
    }

    try {
      this.logger.log(`Updating role ${id} with data:`, JSON.stringify(roleData, null, 2));
      
      const updatedRole = await this.roleModel.findByIdAndUpdate(
        id,
        roleData,
        { new: true, runValidators: true },
      );

      if (!updatedRole) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      this.logger.log(`Role ${id} updated successfully:`, JSON.stringify(updatedRole.toObject(), null, 2));
      return updatedRole;
    } catch (error: any) {
      this.logger.error(`Failed to update role ${id}: ${error.message}`);
      
      if (error.code === 11000) {
        throw new BadRequestException('Tên vai trò đã tồn tại');
      }

      throw new BadRequestException('Failed to update role');
    }
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid role ID');
    }

    // Kiểm tra role tồn tại
    const role = await this.roleModel.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Kiểm tra xem có user nào đang sử dụng role này không
    const usersWithRole = await this.userModel.countDocuments({ roleId: id });
    if (usersWithRole > 0) {
      throw new BadRequestException(`Không thể xóa vai trò đang được sử dụng bởi ${usersWithRole} user(s)`);
    }

    const result = await this.roleModel.findOneAndDelete({ _id: id });
    this.logger.log(`Role ${id} deleted successfully`);
  }

  async findActiveRoles(): Promise<RoleDocument[]> {
    return this.roleModel
      .find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .exec();
  }

  async getRoleStatistics(): Promise<{
    totalRoles: number;
    activeRoles: number;
    inactiveRoles: number;
    rolesByPermission: {
      isOrder: number;
      isProduct: number;
      isCategory: number;
      isPost: number;
      isVoucher: number;
      isBanner: number;
      isAnalytic: number;
      isReturn: number;
      isUser: number;
      isRole: number;
    };
  }> {
    const [totalRoles, activeRoles, inactiveRoles, permissionStats] = await Promise.all([
      this.roleModel.countDocuments({}),
      this.roleModel.countDocuments({ isActive: true }),
      this.roleModel.countDocuments({ isActive: false }),
      this.roleModel.aggregate([
        {
          $group: {
            _id: null,
            isOrder: { $sum: { $cond: ['$isOrder', 1, 0] } },
            isProduct: { $sum: { $cond: ['$isProduct', 1, 0] } },
            isCategory: { $sum: { $cond: ['$isCategory', 1, 0] } },
            isPost: { $sum: { $cond: ['$isPost', 1, 0] } },
            isVoucher: { $sum: { $cond: ['$isVoucher', 1, 0] } },
            isBanner: { $sum: { $cond: ['$isBanner', 1, 0] } },
            isAnalytic: { $sum: { $cond: ['$isAnalytic', 1, 0] } },
            isReturn: { $sum: { $cond: ['$isReturn', 1, 0] } },
            isUser: { $sum: { $cond: ['$isUser', 1, 0] } },
            isRole: { $sum: { $cond: ['$isRole', 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = permissionStats[0] || {
      isOrder: 0, isProduct: 0, isCategory: 0, isPost: 0,
      isVoucher: 0, isBanner: 0, isAnalytic: 0, isReturn: 0,
      isUser: 0, isRole: 0,
    };

    return {
      totalRoles,
      activeRoles,
      inactiveRoles,
      rolesByPermission: {
        isOrder: stats.isOrder,
        isProduct: stats.isProduct,
        isCategory: stats.isCategory,
        isPost: stats.isPost,
        isVoucher: stats.isVoucher,
        isBanner: stats.isBanner,
        isAnalytic: stats.isAnalytic,
        isReturn: stats.isReturn,
        isUser: stats.isUser,
        isRole: stats.isRole,
      },
    };
  }

  async seedRoles(): Promise<RoleDocument[]> {
    try {
      const existingRoles = await this.roleModel.countDocuments({});
      if (existingRoles > 0) {
        this.logger.log('Roles already exist, skipping seed');
        return [];
      }

      const rolesData = generateRoles();
      const createdRoles = await this.roleModel.insertMany(rolesData) as RoleDocument[];
      
      this.logger.log(`Seeded ${createdRoles.length} roles successfully`);
      return createdRoles;
    } catch (error: any) {
      this.logger.error(`Failed to seed roles: ${error.message}`);
      throw new BadRequestException('Failed to seed roles');
    }
  }
} 