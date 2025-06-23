import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { CartItem } from '../../interfaces';

export type CartDocument = Cart & Document;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: User;

  @Prop([
    {
      productId: {
        type: MongooseSchema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      sizeId: {
        type: MongooseSchema.Types.ObjectId,
        required: true,
      },
      size: { type: String, required: true },
      color: { type: String, required: true },
      name: { type: String, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      countInStock: { type: Number, required: true },
      qty: { type: Number, required: true },
    },
  ])
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
