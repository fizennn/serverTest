import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument, Comment } from './schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { 
  CreatePostDto, 
  UpdatePostDto, 
  CreateCommentDto, 
  UpdateCommentDto,
  PostQueryDto 
} from './dto/post.dto';
import { NotificationService } from '@/notifications/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private notificationService: NotificationService,
  ) {}

  // ============ POST CRUD OPERATIONS ============

  async create(createPostDto: CreatePostDto, authorId: string): Promise<PostDocument> {
    // Kiểm tra user có tồn tại và là admin không
    const author = await this.userModel.findById(authorId);
    if (!author) {
      throw new NotFoundException('Không tìm thấy user');
    }
    if (!author.isAdmin) {
      throw new ForbiddenException('Chỉ admin mới có thể tạo bài viết');
    }

    // Kiểm tra sản phẩm gắn kèm có tồn tại không
    if (createPostDto.attachedProducts && createPostDto.attachedProducts.length > 0) {
      const products = await this.productModel.find({
        _id: { $in: createPostDto.attachedProducts }
      });
      if (products.length !== createPostDto.attachedProducts.length) {
        throw new BadRequestException('Một hoặc nhiều sản phẩm không tồn tại');
      }
    }

    const post = new this.postModel({
      ...createPostDto,
      author: authorId,
      likeCount: 0,
      commentCount: 0,
      likes: [],
      comments: []
    });

    const createdPost = await post.save();

    // Gửi thông báo cho tất cả người dùng khi admin tạo bài viết mới
    await this.notificationService.sendNotificationToAllUsers(
      'Bài viết mới',
      `Có bài viết mới: ${createPostDto.title}`,
      'promotion',
      {
        type: 'post',
        postId: createdPost._id.toString(),
        action: 'created',
        title: createPostDto.title
      }
    );

    return createdPost;
  }

  async findAll(query: PostQueryDto): Promise<any> {
    const {
      page = 1,
      limit = 10,
      search,
      tag,
      featured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter
    const filter: any = { isActive: true };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    if (featured !== undefined) {
      filter.isFeatured = featured;
    }

    const [posts, totalPosts] = await Promise.all([
      this.postModel
        .find(filter)
        .populate('author', 'name email profilePicture')
        .populate('attachedProducts', 'name images averagePrice')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.postModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    return {
      posts,
      totalPosts,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async findById(id: string): Promise<PostDocument> {
    const post = await this.postModel
      .findOne({ _id: id, isActive: true })
      .populate('author', 'name email profilePicture')
      .populate('attachedProducts', 'name images averagePrice brand category')
      .populate('comments.user', 'name profilePicture')
      .populate('likes', 'name profilePicture');

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return post;
  }

  async findFeatured(): Promise<PostDocument[]> {
    return this.postModel
      .find({ isActive: true, isFeatured: true })
      .populate('author', 'name email profilePicture')
      .populate('attachedProducts', 'name images averagePrice')
      .sort({ createdAt: -1 })
      .limit(10);
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<PostDocument> {
    // Kiểm tra sản phẩm gắn kèm có tồn tại không
    if (updatePostDto.attachedProducts && updatePostDto.attachedProducts.length > 0) {
      const products = await this.productModel.find({
        _id: { $in: updatePostDto.attachedProducts }
      });
      if (products.length !== updatePostDto.attachedProducts.length) {
        throw new BadRequestException('Một hoặc nhiều sản phẩm không tồn tại');
      }
    }

    const post = await this.postModel.findByIdAndUpdate(
      id,
      updatePostDto,
      { new: true }
    ).populate('author', 'name email profilePicture')
     .populate('attachedProducts', 'name images averagePrice');

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return post;
  }

  async remove(id: string): Promise<void> {
    const result = await this.postModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
  }

  // ============ LIKE OPERATIONS ============

  async toggleLike(postId: string, userId: string): Promise<any> {
    const post = await this.postModel.findOne({ _id: postId, isActive: true });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const userLikedIndex = post.likes.findIndex(
      likeUserId => likeUserId.toString() === userId
    );

    let message: string;
    let isLiked: boolean;

    if (userLikedIndex > -1) {
      // User đã like, bỏ like
      post.likes.splice(userLikedIndex, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
      message = 'Đã bỏ thích bài viết';
      isLiked = false;
    } else {
      // User chưa like, thêm like
      post.likes.push(userId as any);
      post.likeCount += 1;
      message = 'Đã thích bài viết';
      isLiked = true;
    }

    await post.save();

    return {
      message,
      likeCount: post.likeCount,
      isLiked
    };
  }

  async getPostLikes(postId: string): Promise<any> {
    const post = await this.postModel
      .findOne({ _id: postId, isActive: true })
      .populate('likes', 'name profilePicture');

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return {
      likeCount: post.likeCount,
      likes: post.likes
    };
  }

  // ============ COMMENT OPERATIONS ============

  async addComment(postId: string, createCommentDto: CreateCommentDto, userId: string): Promise<Comment> {
    const post = await this.postModel.findOne({ _id: postId, isActive: true });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const newComment: Comment = {
      user: userId as any,
      content: createCommentDto.content,
      images: createCommentDto.images || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    post.comments.push(newComment);
    post.commentCount += 1;

    await post.save();

    // Populate user info cho comment mới
    await post.populate('comments.user', 'name profilePicture');
    
    return post.comments[post.comments.length - 1];
  }

  async getPostComments(postId: string, page: number = 1, limit: number = 20): Promise<any> {
    const post = await this.postModel
      .findOne({ _id: postId, isActive: true })
      .populate('comments.user', 'name profilePicture');

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const totalComments = post.comments.length;
    const totalPages = Math.ceil(totalComments / limit);
    const skip = (page - 1) * limit;

    // Sort comments by newest first and paginate
    const comments = post.comments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + limit);

    return {
      comments,
      totalComments,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async updateComment(
    postId: string, 
    commentId: string, 
    updateCommentDto: UpdateCommentDto, 
    userId: string, 
    isAdmin: boolean
  ): Promise<Comment> {
    const post = await this.postModel.findOne({ _id: postId, isActive: true });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const comment = post.comments.find(c => c._id?.toString() === commentId);
    if (!comment) {
      throw new NotFoundException('Không tìm thấy comment');
    }

    // Kiểm tra quyền: chỉ người tạo comment hoặc admin mới được cập nhật
    if (comment.user.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền cập nhật comment này');
    }

    // Cập nhật comment
    if (updateCommentDto.content !== undefined) {
      comment.content = updateCommentDto.content;
    }
    if (updateCommentDto.images !== undefined) {
      comment.images = updateCommentDto.images;
    }
    comment.updatedAt = new Date();

    await post.save();
    await post.populate('comments.user', 'name profilePicture');

    return comment;
  }

  async deleteComment(
    postId: string, 
    commentId: string, 
    userId: string, 
    isAdmin: boolean
  ): Promise<void> {
    const post = await this.postModel.findOne({ _id: postId, isActive: true });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const commentIndex = post.comments.findIndex(c => c._id?.toString() === commentId);
    if (commentIndex === -1) {
      throw new NotFoundException('Không tìm thấy comment');
    }

    const comment = post.comments[commentIndex];

    // Kiểm tra quyền: chỉ người tạo comment hoặc admin mới được xóa
    if (comment.user.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xóa comment này');
    }

    post.comments.splice(commentIndex, 1);
    post.commentCount = Math.max(0, post.commentCount - 1);

    await post.save();
  }

  // ============ ADMIN OPERATIONS ============

  async findAllForAdmin(query: any): Promise<any> {
    const {
      page = 1,
      limit = 10,
      status
    } = query;

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const [posts, totalPosts] = await Promise.all([
      this.postModel
        .find(filter)
        .populate('author', 'name email profilePicture')
        .populate('attachedProducts', 'name images averagePrice')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.postModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    return {
      posts,
      totalPosts,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }

  async toggleFeatured(id: string): Promise<any> {
    const post = await this.postModel.findById(id);
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    post.isFeatured = !post.isFeatured;
    await post.save();

    return {
      message: post.isFeatured ? 'Đã đánh dấu bài viết nổi bật' : 'Đã bỏ đánh dấu bài viết nổi bật',
      isFeatured: post.isFeatured
    };
  }

  async toggleStatus(id: string): Promise<any> {
    const post = await this.postModel.findById(id);
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    post.isActive = !post.isActive;
    await post.save();

    return {
      message: post.isActive ? 'Đã hiển thị bài viết' : 'Đã ẩn bài viết',
      isActive: post.isActive
    };
  }

  async getStatistics(): Promise<any> {
    const [
      totalPosts,
      activePosts,
      featuredPosts,
      topLikedPosts,
      topCommentedPosts
    ] = await Promise.all([
      this.postModel.countDocuments(),
      this.postModel.countDocuments({ isActive: true }),
      this.postModel.countDocuments({ isFeatured: true }),
      this.postModel
        .find({ isActive: true })
        .select('title likeCount')
        .sort({ likeCount: -1 })
        .limit(5),
      this.postModel
        .find({ isActive: true })
        .select('title commentCount')
        .sort({ commentCount: -1 })
        .limit(5)
    ]);

    // Tính tổng likes và comments
    const allPosts = await this.postModel.find({ isActive: true }).select('likeCount commentCount');
    const totalLikes = allPosts.reduce((sum, post) => sum + post.likeCount, 0);
    const totalComments = allPosts.reduce((sum, post) => sum + post.commentCount, 0);

    return {
      totalPosts,
      activePosts,
      inactivePosts: totalPosts - activePosts,
      featuredPosts,
      totalLikes,
      totalComments,
      avgLikesPerPost: activePosts > 0 ? Math.round((totalLikes / activePosts) * 100) / 100 : 0,
      avgCommentsPerPost: activePosts > 0 ? Math.round((totalComments / activePosts) * 100) / 100 : 0,
      topLikedPosts,
      topCommentedPosts
    };
  }
}