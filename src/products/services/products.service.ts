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

@Injectable()
export class ProductsService {
  constructor(
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
      // Tính toán giá trung bình nếu có variants hoặc sử dụng giá được gửi lên
      let averagePrice = productData.averagePrice || '0 - 0';
      if (!productData.averagePrice && productData.variants && productData.variants.length > 0) {
        averagePrice = this.calculateAveragePrice(productData.variants);
      }
      // Tính toán tổng số lượng tồn kho từ các biến thể
      let countInStock = productData.countInStock || 0;
      if (productData.variants && productData.variants.length > 0) {
        countInStock = this.calculateTotalStock(productData.variants);
      }
      return {
        ...productData,
        averagePrice,
        countInStock,
        rating: 0,
        numReviews: 0,
        reviews: [],
      };
    });
    const createdProducts = await this.productModel.insertMany(processedProducts);
    return createdProducts as unknown as ProductDocument[];
  }

  async createSample(): Promise<ProductDocument> {
    const createdProduct = await this.productModel.create(sampleProduct);

    return createdProduct;
  }

  async update(id: string, attrs: Partial<Product>): Promise<ProductDocument> {
    const { name, averagePrice, description, images, brand, category } =
      attrs;

    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product ID.');

    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('No product with given ID.');

    product.name = name ?? product.name;
    product.averagePrice = averagePrice ?? product.averagePrice;
    product.description = description ?? product.description;
    product.images = images ?? product.images;
    product.brand = brand ?? product.brand;
    product.category = category ?? product.category;
    product.variants = attrs.variants ?? product.variants;
    product.status = attrs.status ?? product.status;

    // Tính toán lại giá trung bình và tồn kho nếu có variants
    if (attrs.variants && attrs.variants.length > 0) {
      product.averagePrice = this.calculateAveragePrice(attrs.variants);
      product.countInStock = this.calculateTotalStock(attrs.variants);
    } else {
      // Nếu không có variants, có thể set mặc định hoặc giữ nguyên
      // Ở đây, ta giữ nguyên giá trị cũ nếu không có variant mới
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

    await product.deleteOne();
  }

  async deleteMany(): Promise<void> {
    await this.productModel.deleteMany({});
  }

  async create(productData: Partial<Product>): Promise<ProductDocument> {
    // Tính toán giá trung bình nếu có variants hoặc sử dụng giá được gửi lên
    let averagePrice = productData.averagePrice || '0 - 0';
    if (!productData.averagePrice && productData.variants && productData.variants.length > 0) {
      averagePrice = this.calculateAveragePrice(productData.variants);
    }
    
    // Tính toán tổng số lượng tồn kho từ các biến thể
    let countInStock = productData.countInStock || 0;
    if (productData.variants && productData.variants.length > 0) {
      countInStock = this.calculateTotalStock(productData.variants);
    }

    const product = await this.productModel.create({
      ...productData,
      averagePrice,
      countInStock,
      rating: 0,
      numReviews: 0,
      reviews: [],
    });

    return product;
  }

  async findByVariantId(variantId: string): Promise<ProductDocument[]> {
    if (!Types.ObjectId.isValid(variantId))
      throw new BadRequestException('Invalid variant ID.');

    const products = await this.productModel.find({
      'variants._id': variantId,
    });

    if (!products.length) 
      throw new NotFoundException('Không tìm thấy sản phẩm nào với variant ID này.');

    // Lọc và chỉ trả về variant có ID phù hợp
    const filteredProducts = products.map(product => {
      const productObj = product.toObject();
      productObj.variants = productObj.variants.filter(
        (variant: any) => variant._id.toString() === variantId
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
      throw new NotFoundException('Không tìm thấy sản phẩm nào với size ID này.');

    // Lọc và chỉ trả về size có ID phù hợp
    const filteredProducts = products.map(product => {
      const productObj = product.toObject();
      productObj.variants = productObj.variants.map((variant: any) => {
        const filteredVariant = { ...variant };
        filteredVariant.sizes = variant.sizes.filter(
          (size: any) => size._id.toString() === sizeId
        );
        return filteredVariant;
      }).filter((variant: any) => variant.sizes.length > 0);
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
    const allPrices = variants.flatMap(variant => variant.sizes.map(size => size.price));
    if (allPrices.length === 0) {
      return '0 - 0';
    }

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    return `${minPrice} - ${maxPrice}`;
  }

  private calculateTotalStock(variants: any[]): number {
    return variants.reduce((totalStock, variant) => {
      const variantStock = variant.sizes.reduce((acc, size) => acc + (size.stock || 0), 0);
      return totalStock + variantStock;
    }, 0);
  }

  async findByCategory(categoryId: string, page?: string, limit?: string): Promise<PaginatedResponse<Product>> {
    if (!Types.ObjectId.isValid(categoryId)) throw new BadRequestException('Category ID không hợp lệ');
    const pageSize = parseInt(limit ?? '10');
    const currentPage = parseInt(page ?? '1');
    const filter = { category: categoryId };
    const count = await this.productModel.countDocuments(filter);
    const products = await this.productModel
      .find(filter)
      .limit(pageSize)
      .skip(pageSize * (currentPage - 1));
    if (!products.length) throw new NotFoundException('Không tìm thấy sản phẩm nào với category này');
    return {
      items: products,
      total: count,
      page: currentPage,
      pages: Math.ceil(count / pageSize),
    };
  }
}
