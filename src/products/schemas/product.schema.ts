import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { HydratedDocument } from 'mongoose';
import { Variant, Size, VariantSchema, SizeSchema } from './variant.shema';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    default: null,
  })
  user!: User;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  rating!: number;

  @Prop({ required: true })
  comment!: string;
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  brand!: string;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  category!: string;

  @Prop({ required: true, type: [String], default: [] })
  images!: string[];

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  reviews!: Review[];

  @Prop({ required: true, default: 0 })
  rating!: number;

  @Prop({ required: true, default: 0 })
  numReviews!: number;

  @ApiProperty({
    description: 'Giá trung bình sản phẩm (định dạng: "giá thấp nhất - giá cao nhất")',
    example: '250000 - 350000',
    default: '0 - 0',
  })
  @IsString()
  @Prop({ required: true, default: '0 - 0' })
  averagePrice!: string;

  @Prop({ required: true, default: 0 })
  countInStock!: number;

  @Prop({ required: true, type: [VariantSchema], default: [] })
  variants!: Variant[];

  @ApiProperty({
    description: 'Trạng thái sản phẩm',
    example: true,
    default: true,
  })
  @IsNumber()
  @Prop({ required: true, default: true })
  status!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
