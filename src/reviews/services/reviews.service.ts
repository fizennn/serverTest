import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from '../schemas/review.schema';
import { ReviewDto, CommentDto } from '../dtos/review.dto';
import { User } from '@/users/schemas/user.schema';
import { Product } from '@/products/schemas/product.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(reviewDto: ReviewDto): Promise<Review> {
    // Kiểm tra product tồn tại
    const product = await this.productModel.findById(reviewDto.product);
    if (!product) {
      throw new NotFoundException('Product không tồn tại');
    }
    // Kiểm tra tất cả user trong comments
    if (reviewDto.comments && reviewDto.comments.length > 0) {
      for (const c of reviewDto.comments) {
        const userExists = await this.userModel.exists({ _id: c.user });
        if (!userExists) {
          throw new NotFoundException(`User với id ${c.user} không tồn tại`);
        }
      }
    }
    // Ép kiểu ObjectId cho product và từng user trong comments, đồng thời sinh _id cho mỗi comment
    const comments = (reviewDto.comments || []).map((c: CommentDto) => ({
      _id: new Types.ObjectId(),
      user: new Types.ObjectId(c.user),
      rating: c.rating,
      comment: c.comment || '',
      imgs: c.imgs || [],
    }));
    // Kiểm tra đã có review cho product chưa (so sánh bằng ObjectId)
    let review = await this.reviewModel.findOne({ product: new Types.ObjectId(reviewDto.product) });
    if (review) {
      // Nếu đã có, push thêm các comment mới vào mảng comments
      review.comments.push(...comments);
      await review.save();
    } else {
      // Nếu chưa có, tạo mới
      review = await this.reviewModel.create({
        product: new Types.ObjectId(reviewDto.product),
        comments,
      });
      // Lấy lại document từ DB để có thể populate
      review = await this.reviewModel.findById(review._id);
    }

    // Cập nhật rating và numReviews trong product
    await this.updateProductRating(reviewDto.product);

    // Populate
    if (review && typeof review.populate === 'function') {
      await review.populate('product');
      await review.populate('comments.user');
    }
    return review;
  }

  async findAll(): Promise<Review[]> {
    return this.reviewModel.find().populate('product').populate('comments.user').exec();
  }

  async findById(id: string): Promise<Review> {
    return this.reviewModel.findById(id).populate('product').populate('comments.user').exec();
  }

  async update(id: string, reviewDto: Partial<ReviewDto>): Promise<Review> {
    return this.reviewModel.findByIdAndUpdate(id, reviewDto, { new: true }).exec();
  }

  async delete(id: string): Promise<any> {
    return this.reviewModel.findByIdAndDelete(id).exec();
  }

  async addComment(productId: string, commentDto: CommentDto): Promise<Review> {
    // Kiểm tra product tồn tại
    const productExists = await this.productModel.exists({ _id: productId });
    if (!productExists) {
      throw new NotFoundException('Product không tồn tại');
    }
    // Kiểm tra user tồn tại
    const userExists = await this.userModel.exists({ _id: commentDto.user });
    if (!userExists) {
      throw new NotFoundException('User không tồn tại');
    }
    // Ép kiểu user và sinh _id cho comment
    const comment = {
      _id: new Types.ObjectId(),
      user: new Types.ObjectId(commentDto.user),
      rating: commentDto.rating,
      comment: commentDto.comment || '',
      imgs: commentDto.imgs || [],
    };

    // Tìm review theo product
    let review = await this.reviewModel.findOne({ product: productId });
    if (review) {
      // Nếu đã có, push thêm comment
      review.comments.push(comment);
      await review.save();
    } else {
      // Nếu chưa có, tạo mới
      const created = await this.reviewModel.create({
        product: new Types.ObjectId(productId),
        comments: [comment],
      });
      // Lấy lại document từ DB để có thể populate
      review = await this.reviewModel.findById(created._id);
    }
    // Cập nhật rating và numReviews trong product
    await this.updateProductRating(productId);
    
    // Đảm bảo review là document, không phải Promise
    if (review && typeof review.populate === 'function') {
      await review.populate('product');
      await review.populate('comments.user');
    }
    return review;
  }

  async getCommentsByProduct(productId: string, page = 1, limit = 10) {
    const review = await this.reviewModel.findOne({ product: new Types.ObjectId(productId) })
      .populate('comments.user');
    if (!review) {
      return { reviews: [], total: 0, page, limit };
    }
    const total = review.comments.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    // Map lại để trả về thêm tên và ảnh user
    const reviews = review.comments.slice(start, end).map((comment: any) => ({
      _id: comment._id,
      user: comment.user?._id ? comment.user._id : comment.user, // fallback nếu user bị xóa
      userName: comment.user && comment.user.name ? comment.user.name : null,
      userAvatar: comment.user && comment.user.profilePicture ? comment.user.profilePicture : null,
      rating: comment.rating,
      comment: comment.comment,
      imgs: comment.imgs,
    }));
    return { reviews, total, page, limit };
  }

  async getCommentById(commentId: string) {
    // Tìm review chứa comment có _id = commentId
    const review = await this.reviewModel.findOne({ 'comments._id': commentId }).populate('comments.user').populate('product');
    if (!review) return null;
    const comment = review.comments.find((c: any) => c._id.toString() === commentId);
    return comment || null;
  }

  async updateCommentById(commentId: string, updateDto: Partial<CommentDto>) {
    // Tìm review chứa comment
    const review = await this.reviewModel.findOne({ 'comments._id': commentId });
    if (!review) return null;
    const comment = review.comments.find((c: any) => c._id.toString() === commentId);
    if (!comment) return null;
    if (updateDto.rating !== undefined) comment.rating = updateDto.rating;
    if (updateDto.comment !== undefined) comment.comment = updateDto.comment;
    if (updateDto.imgs !== undefined) comment.imgs = updateDto.imgs;
    await review.save();
    
    // Cập nhật rating và numReviews trong product
    await this.updateProductRating(review.product.toString());
    
    return comment;
  }

  async deleteCommentById(commentId: string) {
    // Tìm review chứa comment
    const review = await this.reviewModel.findOne({ 'comments._id': commentId });
    if (!review) return null;
    const idx = review.comments.findIndex((c: any) => c._id.toString() === commentId);
    if (idx === -1) return null;
    const deleted = review.comments[idx];
    review.comments.splice(idx, 1);
    await review.save();
    
    // Cập nhật rating và numReviews trong product
    await this.updateProductRating(review.product.toString());
    
    return deleted;
  }

  async findByProductId(productId: string): Promise<Review> {
    return this.reviewModel.findOne({ product: new Types.ObjectId(productId) })
      .populate('product')
      .populate('comments.user')
      .exec();
  }

  async updateByProductId(productId: string, reviewDto: Partial<ReviewDto>): Promise<Review> {
    const review = await this.reviewModel.findOne({ product: new Types.ObjectId(productId) });
    if (!review) return null;
    
    // Cập nhật các trường có thể thay đổi
    if (reviewDto.comments) {
      // Nếu có comments mới, thêm vào mảng comments hiện tại
      const newComments = reviewDto.comments.map((c: CommentDto) => ({
        _id: new Types.ObjectId(),
        user: new Types.ObjectId(c.user),
        rating: c.rating,
        comment: c.comment || '',
        imgs: c.imgs || [],
      }));
      review.comments.push(...newComments);
    }
    
    await review.save();
    
    // Cập nhật rating và numReviews trong product
    await this.updateProductRating(productId);
    
    return this.reviewModel.findById(review._id)
      .populate('product')
      .populate('comments.user')
      .exec();
  }

  async deleteByProductId(productId: string): Promise<boolean> {
    const result = await this.reviewModel.deleteOne({ product: new Types.ObjectId(productId) });
    
    // Cập nhật rating và numReviews trong product về 0 khi xóa tất cả reviews
    if (result.deletedCount > 0) {
      await this.productModel.findByIdAndUpdate(productId, {
        rating: 0,
        numReviews: 0
      });
    }
    
    return result.deletedCount > 0;
  }

  /**
   * Cập nhật rating và numReviews cho product dựa trên tất cả reviews
   */
  private async updateProductRating(productId: string): Promise<void> {
    // Lấy tất cả reviews của product
    const review = await this.reviewModel.findOne({ product: new Types.ObjectId(productId) });
    
    if (!review || review.comments.length === 0) {
      // Nếu không có review, set rating = 0 và numReviews = 0
      await this.productModel.findByIdAndUpdate(productId, {
        rating: 0,
        numReviews: 0
      });
      return;
    }

    // Tính tổng rating và số lượng reviews
    const totalRating = review.comments.reduce((acc, comment) => acc + comment.rating, 0);
    const averageRating = totalRating / review.comments.length;
    const numReviews = review.comments.length;

    // Cập nhật product
    await this.productModel.findByIdAndUpdate(productId, {
      rating: Math.round(averageRating * 10) / 10, // Làm tròn đến 1 chữ số thập phân
      numReviews: numReviews
    });
  }

  /**
   * Duyệt tất cả reviews và cập nhật rating, numReviews cho tất cả products
   */
  async syncAllProductRatings(): Promise<{ 
    totalProducts: number; 
    updatedProducts: number; 
    productsWithReviews: number;
    productsWithoutReviews: number;
    details: Array<{ productId: string; productName: string; oldRating: number; newRating: number; oldNumReviews: number; newNumReviews: number; }>
  }> {
    const result = {
      totalProducts: 0,
      updatedProducts: 0,
      productsWithReviews: 0,
      productsWithoutReviews: 0,
      details: []
    };

    // Lấy tất cả products
    const allProducts = await this.productModel.find({});
    result.totalProducts = allProducts.length;

    for (const product of allProducts) {
      const productId = product._id.toString();
      const oldRating = product.rating;
      const oldNumReviews = product.numReviews;

      // Lấy review của product này
      const review = await this.reviewModel.findOne({ product: product._id });
      
      if (!review || review.comments.length === 0) {
        // Product không có review
        if (oldRating !== 0 || oldNumReviews !== 0) {
          await this.productModel.findByIdAndUpdate(productId, {
            rating: 0,
            numReviews: 0
          });
          result.updatedProducts++;
        }
        result.productsWithoutReviews++;
        
        result.details.push({
          productId,
          productName: product.name,
          oldRating,
          newRating: 0,
          oldNumReviews,
          newNumReviews: 0
        });
      } else {
        // Product có review
        const totalRating = review.comments.reduce((acc, comment) => acc + comment.rating, 0);
        const averageRating = totalRating / review.comments.length;
        const newRating = Math.round(averageRating * 10) / 10;
        const newNumReviews = review.comments.length;

        // Chỉ cập nhật nếu có thay đổi
        if (oldRating !== newRating || oldNumReviews !== newNumReviews) {
          await this.productModel.findByIdAndUpdate(productId, {
            rating: newRating,
            numReviews: newNumReviews
          });
          result.updatedProducts++;
        }
        
        result.productsWithReviews++;
        
        result.details.push({
          productId,
          productName: product.name,
          oldRating,
          newRating,
          oldNumReviews,
          newNumReviews
        });
      }
    }

    return result;
  }

  /**
   * Cập nhật rating cho một product cụ thể
   */
  async syncProductRating(productId: string): Promise<{
    productId: string;
    productName: string;
    oldRating: number;
    newRating: number;
    oldNumReviews: number;
    newNumReviews: number;
    hasReviews: boolean;
  }> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product không tồn tại');
    }

    const oldRating = product.rating;
    const oldNumReviews = product.numReviews;

    // Lấy review của product
    const review = await this.reviewModel.findOne({ product: product._id });
    
    if (!review || review.comments.length === 0) {
      // Product không có review
      await this.productModel.findByIdAndUpdate(productId, {
        rating: 0,
        numReviews: 0
      });
      
      return {
        productId,
        productName: product.name,
        oldRating,
        newRating: 0,
        oldNumReviews,
        newNumReviews: 0,
        hasReviews: false
      };
    } else {
      // Product có review
      const totalRating = review.comments.reduce((acc, comment) => acc + comment.rating, 0);
      const averageRating = totalRating / review.comments.length;
      const newRating = Math.round(averageRating * 10) / 10;
      const newNumReviews = review.comments.length;

      await this.productModel.findByIdAndUpdate(productId, {
        rating: newRating,
        numReviews: newNumReviews
      });
      
      return {
        productId,
        productName: product.name,
        oldRating,
        newRating,
        oldNumReviews,
        newNumReviews,
        hasReviews: true
      };
    }
  }
} 