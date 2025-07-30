import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../schemas/category.schema';
import { CategoryDto, CategorySearchDto } from '../dtos/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryDto: CategoryDto): Promise<Category> {
    const createdCategory = new this.categoryModel(createCategoryDto);
    return createdCategory.save();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find({ status: true }).exec();
  }

  async findAllAdmin(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  async findManyAdvanced(searchDto: CategorySearchDto): Promise<{
    items: Category[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      keyword,
      page = '1',
      limit = '10',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = searchDto;

    const pageSize = parseInt(limit);
    const currentPage = parseInt(page);

    // Debug: Kiểm tra tổng số category trong database
    const totalCategories = await this.categoryModel.countDocuments({});
    console.log('Tổng số category trong database:', totalCategories);

    // Xây dựng query filter
    let filter: any = {};

    // Tìm kiếm theo từ khóa
    if (keyword) {
      const decodedKeyword = decodeURIComponent(keyword);
      const searchPattern = decodedKeyword
        .split(' ')
        .map(term => `(?=.*${term})`)
        .join('');
      
      filter.$and = [
        {
          $or: [
            { name: { $regex: searchPattern, $options: 'i' } },
            { description: { $regex: searchPattern, $options: 'i' } },
          ]
        }
      ];
    }

    // Filter theo status
    if (status !== undefined) {
      if (filter.$and) {
        filter.$and.push({ status: status === 'true' });
      } else {
        filter.status = status === 'true';
      }
    } else {
      // Mặc định chỉ lấy category active nếu không có filter status
      // Xử lý trường hợp dữ liệu cũ không có trường status
      const statusFilter = {
        $or: [
          { status: true },
          { status: { $exists: false } }  // Lấy cả những record không có trường status (dữ liệu cũ)
        ]
      };
      
      if (filter.$and) {
        filter.$and.push(statusFilter);
      } else {
        filter = statusFilter;
      }
    }

    // Debug: Log filter và kiểm tra số category thỏa mãn điều kiện
    console.log('Filter được áp dụng:', JSON.stringify(filter));
    const countWithFilter = await this.categoryModel.countDocuments(filter);
    console.log('Số category thỏa mãn filter:', countWithFilter);

    // Xây dựng sort
    let sort: any = {};
    const validSortFields = ['name', 'createdAt'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1; // Mặc định sắp xếp theo ngày tạo mới nhất
    }

    // Thực hiện query
    const count = await this.categoryModel.countDocuments(filter);
    const categories = await this.categoryModel
      .find(filter)
      .sort(sort)
      .limit(pageSize)
      .skip(pageSize * (currentPage - 1));

    console.log('Kết quả trả về:', {
      itemsCount: categories.length,
      total: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize)
    });

    return {
      items: categories,
      total: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize),
    };
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, updateCategoryDto: CategoryDto): Promise<Category> {
    const category = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true }).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: string): Promise<Category> {
    const category = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async debug(): Promise<any> {
    const totalCategories = await this.categoryModel.countDocuments({});
    const activeCategories = await this.categoryModel.countDocuments({ status: true });
    const inactiveCategories = await this.categoryModel.countDocuments({ status: false });
    const categoriesWithoutStatus = await this.categoryModel.countDocuments({ status: { $exists: false } });
    const allCategories = await this.categoryModel.find({}).limit(5);
    
    return {
      total: totalCategories,
      active: activeCategories,
      inactive: inactiveCategories,
      withoutStatus: categoriesWithoutStatus,
      sample: allCategories.map(cat => ({
        id: cat._id,
        name: cat.name,
        status: cat.status,
        hasStatus: 'status' in cat
      }))
    };
  }

  async migrateStatus(): Promise<any> {
    // Cập nhật tất cả category không có trường status thành status: true
    const result = await this.categoryModel.updateMany(
      { status: { $exists: false } },
      { $set: { status: true } }
    );
    
    return {
      message: 'Cập nhật status thành công',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    };
  }
} 