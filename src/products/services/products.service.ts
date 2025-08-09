import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from 'src/users/schemas/user.schema';
import { sampleProduct } from '../../utils/data/product';
import { Product, ProductDocument } from '../schemas/product.schema';
import { PaginatedResponse } from '../../shared/types';
import { Order } from '../../orders/schemas/order.schema';
import { NotificationService } from '@/notifications/notifications.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly notificationService: NotificationService,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async findTopRated(): Promise<ProductDocument[]> {
    const products = await this.productModel
      .find({})
      .sort({ rating: -1 })
      .limit(3);

    if (!products.length) throw new NotFoundException('No products found.');

    return products;
  }

  async findMany(
    keyword?: string,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResponse<Product>> {
    const pageSize = parseInt(limit ?? '10');
    const currentPage = parseInt(page ?? '1');

    const decodedKeyword = keyword ? decodeURIComponent(keyword) : '';

    const searchPattern = decodedKeyword
      ? decodedKeyword
          .split(' ')
          .map(term => `(?=.*${term})`)
          .join('')
      : '';

    const searchQuery = decodedKeyword
      ? {
          $or: [
            { name: { $regex: searchPattern, $options: 'i' } },
            { description: { $regex: searchPattern, $options: 'i' } },
            { brand: { $regex: searchPattern, $options: 'i' } },
            { category: { $regex: searchPattern, $options: 'i' } },
          ],
        }
      : {};

    const count = await this.productModel.countDocuments(searchQuery);
    const products = await this.productModel
      .find(searchQuery)
      .limit(pageSize)
      .skip(pageSize * (currentPage - 1));

    if (!products.length) throw new NotFoundException('No products found.');

    return {
      items: products,
      total: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize),
    };
  }

  async findManyAdvanced(searchDto: any): Promise<PaginatedResponse<Product>> {
    try {
      const {
        keyword,
        page = '1',
        limit = '10',
        brand,
        category,
        status,
        minPrice,
        maxPrice,
        minRating,
        inStock,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = searchDto;

      const pageSize = isNaN(Number(limit)) ? 10 : parseInt(limit);
      const currentPage = isNaN(Number(page)) ? 1 : parseInt(page);

      // Xây dựng query filter
      let filter: any = {};

      // Tìm kiếm theo từ khóa
      if (keyword) {
        const decodedKeyword = decodeURIComponent(keyword);
        
        // Kiểm tra xem keyword có phải là ObjectId hợp lệ không
        const isObjectId = Types.ObjectId.isValid(decodedKeyword);
        
        if (isObjectId) {
          // Nếu là ObjectId, tìm kiếm theo _id
          filter._id = new Types.ObjectId(decodedKeyword);
        } else {
          // Nếu không phải ObjectId, tìm kiếm theo text như cũ
          const searchPattern = decodedKeyword
            .split(' ')
            .map(term => `(?=.*${term})`)
            .join('');
          filter.$or = [
            { name: { $regex: searchPattern, $options: 'i' } },
            { description: { $regex: searchPattern, $options: 'i' } },
            { brand: { $regex: searchPattern, $options: 'i' } },
          ];
        }
      }

      // Filter theo brand
      if (brand) {
        filter.brand = { $regex: brand, $options: 'i' };
      }

      // Filter theo category
      if (category) {
        // Kiểm tra category có phải ObjectId không
        if (!Types.ObjectId.isValid(category)) {
          throw new BadRequestException('Category không hợp lệ');
        }
        filter.category = category;
      }

      // Filter theo status
      if (status !== undefined) {
        filter.status = status === 'true';
      }

      // Filter theo khoảng giá
      if (minPrice || maxPrice) {
        filter.averagePrice = {};
        if (minPrice && !isNaN(Number(minPrice))) {
          filter.averagePrice.$gte = Number(minPrice);
        }
        if (maxPrice && !isNaN(Number(maxPrice))) {
          filter.averagePrice.$lte = Number(maxPrice);
        }
      }

      // Filter theo rating
      if (minRating && !isNaN(Number(minRating))) {
        filter.rating = { $gte: parseFloat(minRating) };
      }

      // Filter theo tồn kho
      if (inStock !== undefined) {
        if (inStock === 'true') {
          filter.countInStock = { $gt: 0 };
        } else if (inStock === 'false') {
          filter.countInStock = 0;
        }
      }

      // Xây dựng sort
      let sort: any = {};
      const validSortFields = [
        'name',
        'averagePrice',
        'rating',
        'createdAt',
        'countInStock',
      ];
      const validSortOrders = ['asc', 'desc'];
      if (
        validSortFields.includes(sortBy) &&
        validSortOrders.includes(sortOrder)
      ) {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      } else {
        sort.createdAt = -1; // Mặc định sắp xếp theo ngày tạo mới nhất
      }

      // Thực hiện query
      const count = await this.productModel.countDocuments(filter);
      const products = await this.productModel
        .find(filter)
        .sort(sort)
        .limit(pageSize)
        .skip(pageSize * (currentPage - 1));

      // Không throw lỗi nếu không có sản phẩm, chỉ trả về mảng rỗng
      return {
        items: products,
        total: count,
        page: currentPage,
        pages: Math.ceil(count / pageSize),
      };
    } catch (error) {
      // Bắt lỗi và trả về lỗi rõ ràng hơn
      throw new BadRequestException(error.message || 'Lỗi tìm kiếm sản phẩm');
    }
  }

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    return product;
  }

  async createMany(products: Partial<Product>[]): Promise<ProductDocument[]> {
    // Xử lý từng sản phẩm để tính averagePrice và countInStock
    const processedProducts = products.map(productData => {
      // Đảm bảo variants là array hợp lệ và xử lý image
      const variants =
        productData.variants && Array.isArray(productData.variants)
          ? productData.variants.map(variant => ({
              ...variant,
              image: variant.image || '', // Đảm bảo image luôn có giá trị
              sizes:
                variant.sizes && Array.isArray(variant.sizes)
                  ? variant.sizes
                  : [],
            }))
          : [];

      // Tính toán giá trung bình nếu có variants hoặc sử dụng giá được gửi lên
      let averagePrice = productData.averagePrice || '0 - 0';
      if (!productData.averagePrice && variants.length > 0) {
        averagePrice = this.calculateAveragePrice(variants);
      }

      // Tính toán tổng số lượng tồn kho từ các biến thể
      let countInStock = productData.countInStock || 0;
      if (variants.length > 0) {
        countInStock = this.calculateTotalStock(variants);
      }

      return {
        ...productData,
        variants,
        averagePrice,
        countInStock,
        rating: 0,
        numReviews: 0,
        reviews: [],
      };
    });
    const createdProducts =
      await this.productModel.insertMany(processedProducts);
    await this.notificationService.sendNotificationToAdmins(
      'Sản phẩm mới được tạo',
      `${createdProducts.length} sản phẩm mới đã được thêm vào hệ thống`,
      'info',
      {
        action: 'bulk_create_products',
        productCount: createdProducts.length,
        productNames: createdProducts.slice(0, 3).map(p => p.name),
      },
    );
    return createdProducts as unknown as ProductDocument[];
  }

  async createSample(): Promise<ProductDocument> {
    const createdProduct = await this.productModel.create(sampleProduct);

    return createdProduct;
  }

  async update(id: string, attrs: Partial<Product>): Promise<ProductDocument> {
    const { name, averagePrice, description, images, brand, category } = attrs;

    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('No product with given ID.');

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.images = images ?? product.images;
    product.brand = brand ?? product.brand;
    product.category = category ?? product.category;
    product.status = attrs.status ?? product.status;

    // Xử lý variants và tính toán lại giá trung bình
    if (attrs.variants !== undefined) {
      // Đảm bảo variants là array hợp lệ và xử lý image
      const variants = Array.isArray(attrs.variants)
        ? attrs.variants.map(variant => ({
            ...variant,
            image: variant.image || '', // Đảm bảo image luôn có giá trị
            sizes:
              variant.sizes && Array.isArray(variant.sizes)
                ? variant.sizes
                : [],
          }))
        : [];
      product.variants = variants;

      // Tính toán lại giá trung bình và tồn kho
      if (variants.length > 0) {
        product.averagePrice = this.calculateAveragePrice(variants);
        product.countInStock = this.calculateTotalStock(variants);
      } else {
        // Nếu không có variants, set giá mặc định
        product.averagePrice = '0 - 0';
        product.countInStock = 0;
      }
    } else {
      // Nếu không có variants mới, giữ nguyên giá trị cũ
      product.averagePrice = averagePrice ?? product.averagePrice;
      product.countInStock = attrs.countInStock ?? product.countInStock;
    }

    return product.save();
  }

  async createReview(
    id: string,
    user: UserDocument,
    rating: number,
    comment: string,
  ): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');

    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === user._id.toString(),
    );

    if (alreadyReviewed)
      throw new BadRequestException('Product already reviewed!');

    const hasPurchased = await this.orderModel.findOne({
      user: user._id,
      'orderItems.productId': id,
      status: 'delivered',
    });

    if (!hasPurchased)
      throw new BadRequestException(
        'Bạn chỉ có thể đánh gía sản phẩm sau khi đơn hàng hoàn tất',
      );

    const review = {
      name: user.name,
      rating,
      comment,
      user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    product.reviews.push(review);

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    product.numReviews = product.reviews.length;

    const updatedProduct = await product.save();

    return updatedProduct;
  }

  async deleteOne(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);

    if (!product) throw new NotFoundException('No product with given ID.');
    const productName = product.name;

    // Sau khi xóa:
    await this.notificationService.sendUrgentNotificationToAdmins(
      'Sản phẩm đã bị xóa',
      `Sản phẩm "${productName}" đã bị xóa khỏi hệ thống`,
      {
        action: 'delete_product',
        productId: id,
        productName: productName,
      },
    );
    await product.deleteOne();
  }

  async deleteMany(): Promise<void> {
    await this.productModel.deleteMany({});
  }

  async create(productData: Partial<Product>): Promise<ProductDocument> {
    // Tính toán giá trung bình nếu có variants hoặc sử dụng giá được gửi lên
    let averagePrice = productData.averagePrice || '0 - 0';
    if (
      !productData.averagePrice &&
      productData.variants &&
      productData.variants.length > 0
    ) {
      averagePrice = this.calculateAveragePrice(productData.variants);
    }

    // Tính toán tổng số lượng tồn kho từ các biến thể
    let countInStock = productData.countInStock || 0;
    if (productData.variants && productData.variants.length > 0) {
      countInStock = this.calculateTotalStock(productData.variants);
    }

    // Đảm bảo variants là array hợp lệ và xử lý image
    const variants =
      productData.variants && Array.isArray(productData.variants)
        ? productData.variants.map(variant => ({
            ...variant,
            image: variant.image || '', // Đảm bảo image luôn có giá trị
            sizes:
              variant.sizes && Array.isArray(variant.sizes)
                ? variant.sizes
                : [],
          }))
        : [];

    const product = await this.productModel.create({
      ...productData,
      variants,
      averagePrice,
      countInStock,
      rating: 0,
      numReviews: 0,
      reviews: [],
    });
    await this.notificationService.sendNotificationToAdmins(
      'Sản phẩm mới được thêm',
      `Sản phẩm "${product.name}" đã được thêm vào hệ thống với ${countInStock} sản phẩm trong kho`,
      'success',
      {
        action: 'create_product',
        productId: product._id.toString(),
        productName: product.name,
        brand: product.brand,
        initialStock: countInStock,
      },
    );
    return product;
  }

  async findByVariantId(variantId: string): Promise<ProductDocument[]> {
    if (!Types.ObjectId.isValid(variantId))
      throw new BadRequestException('Invalid variant ID.');

    const products = await this.productModel.find({
      'variants._id': variantId,
    });

    if (!products.length)
      throw new NotFoundException(
        'Không tìm thấy sản phẩm nào với variant ID này.',
      );

    // Lọc và chỉ trả về variant có ID phù hợp
    const filteredProducts = products.map(product => {
      const productObj = product.toObject();
      productObj.variants = productObj.variants.filter(
        (variant: any) => variant._id.toString() === variantId,
      );
      return productObj;
    });

    return filteredProducts as ProductDocument[];
  }

  async findBySizeId(sizeId: string): Promise<ProductDocument[]> {
    if (!Types.ObjectId.isValid(sizeId))
      throw new BadRequestException('Invalid size ID.');

    const products = await this.productModel.find({
      'variants.sizes._id': sizeId,
    });

    if (!products.length)
      throw new NotFoundException(
        'Không tìm thấy sản phẩm nào với size ID này.',
      );

    // Lọc và chỉ trả về size có ID phù hợp
    const filteredProducts = products.map(product => {
      const productObj = product.toObject();
      productObj.variants = productObj.variants
        .map((variant: any) => {
          const filteredVariant = { ...variant };
          filteredVariant.sizes = variant.sizes.filter(
            (size: any) => size._id.toString() === sizeId,
          );
          return filteredVariant;
        })
        .filter((variant: any) => variant.sizes.length > 0);
      return productObj;
    });

    return filteredProducts as ProductDocument[];
  }

  /**
   * Tính toán giá trung bình từ các variants
   * @param variants Danh sách variants của sản phẩm
   * @returns Chuỗi giá theo định dạng "giá thấp nhất - giá cao nhất"
   */
  private calculateAveragePrice(variants: any[]): string {
    // Lấy tất cả giá từ tất cả sizes của tất cả variants
    const allPrices = variants.flatMap(variant =>
      variant.sizes ? variant.sizes.map(size => size.price || 0) : [],
    );

    // Kiểm tra nếu không có giá nào
    if (allPrices.length === 0) {
      return '0 - 0';
    }

    // Lọc bỏ các giá 0 hoặc undefined
    const validPrices = allPrices.filter(price => price > 0);

    if (validPrices.length === 0) {
      return '0 - 0';
    }

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    // Nếu chỉ có 1 giá duy nhất, hiển thị cùng giá cho min và max
    if (minPrice === maxPrice) {
      return `${minPrice} - ${maxPrice}`;
    }

    return `${minPrice} - ${maxPrice}`;
  }

  private calculateTotalStock(variants: any[]): number {
    return variants.reduce((totalStock, variant) => {
      // Kiểm tra nếu variant có sizes
      if (!variant.sizes || !Array.isArray(variant.sizes)) {
        return totalStock;
      }

      const variantStock = variant.sizes.reduce((acc, size) => {
        // Kiểm tra nếu size có stock và là số hợp lệ
        const stockValue = size.stock || 0;
        return (
          acc +
          (typeof stockValue === 'number' && stockValue >= 0 ? stockValue : 0)
        );
      }, 0);

      return totalStock + variantStock;
    }, 0);
  }

  async findByCategory(
    categoryId: string,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResponse<Product>> {
    if (!Types.ObjectId.isValid(categoryId))
      throw new BadRequestException('Category ID không hợp lệ');
    const pageSize = parseInt(limit ?? '10');
    const currentPage = parseInt(page ?? '1');
    const filter = { category: categoryId };
    const count = await this.productModel.countDocuments(filter);
    const products = await this.productModel
      .find(filter)
      .limit(pageSize)
      .skip(pageSize * (currentPage - 1));
    if (!products.length)
      throw new NotFoundException(
        'Không tìm thấy sản phẩm nào với category này',
      );
    return {
      items: products,
      total: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize),
    };
  }

  async returnStock(
    productId: string,
    variantName: string,
    quantity: number,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    console.log(`[RETURN_STOCK] Attempting to return stock for product: ${product.name}, variant: ${variantName}, quantity: ${quantity}`);
    console.log(`[RETURN_STOCK] Available variants:`, product.variants.map(v => ({ color: v.color, sizes: v.sizes.length })));

    // Tìm variant theo màu sắc - thử nhiều cách khác nhau
    let variant = product.variants.find(v => v.color === variantName);
    
    // Nếu không tìm thấy, thử tìm kiếm không phân biệt hoa thường
    if (!variant) {
      variant = product.variants.find(v => v.color.toLowerCase() === variantName.toLowerCase());
    }
    
    // Nếu vẫn không tìm thấy, thử tìm kiếm partial match
    if (!variant) {
      variant = product.variants.find(v => 
        v.color.toLowerCase().includes(variantName.toLowerCase()) || 
        variantName.toLowerCase().includes(v.color.toLowerCase())
      );
    }

    if (!variant) {
      console.error(`[RETURN_STOCK] Variant not found for product: ${product.name}, variant: ${variantName}`);
      console.error(`[RETURN_STOCK] Available variants:`, product.variants.map(v => v.color));
      throw new NotFoundException(`Variant '${variantName}' not found for product '${product.name}'. Available variants: ${product.variants.map(v => v.color).join(', ')}`);
    }

    console.log(`[RETURN_STOCK] Found variant: ${variant.color}, updating stock...`);

    // Cập nhật stock cho tất cả sizes trong variant
    variant.sizes.forEach(size => {
      const oldStock = size.stock;
      size.stock += quantity;
      console.log(`[RETURN_STOCK] Size ${size.size}: ${oldStock} -> ${size.stock} (+${quantity})`);
    });

    // Cập nhật tổng stock của sản phẩm
    const oldTotalStock = product.countInStock;
    product.countInStock = this.calculateTotalStock(product.variants);
    console.log(`[RETURN_STOCK] Total stock: ${oldTotalStock} -> ${product.countInStock}`);



    await product.save();
    console.log(`[RETURN_STOCK] Stock return completed successfully for product: ${product.name}`);
  }
}
