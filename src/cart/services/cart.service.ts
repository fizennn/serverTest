import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';
import { ProductsService } from '../../products/services/products.service';
import { CartItem } from '../../interfaces';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private productsService: ProductsService,
  ) {}

  async getCart(user: UserDocument): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId: user._id });

    if (!cart) {
      cart = await this.cartModel.create({
        userId: user._id,
        items: [],
      });
    }

    return cart;
  }

  async addCartItem(
    sizeId: string,
    qty: number,
    user: UserDocument,
  ): Promise<CartDocument> {
    const products = await this.productsService.findBySizeId(sizeId);
    if (!products || !products.length) {
      throw new NotFoundException('Product with this size not found');
    }
    const product = products[0] as any;
    const variant = product.variants[0];
    const size = variant.sizes[0];

    const cart = await this.getCart(user);
    const existingItem = cart.items.find(
      (item) => item.sizeId.toString() === (size as any)._id.toString(),
    );

    if (existingItem) {
      const newQty = existingItem.qty + qty;
      if (newQty > existingItem.countInStock) {
        throw new BadRequestException(
          'Adding this quantity would exceed stock limits.',
        );
      }
      existingItem.qty = newQty;
    } else {
      if (qty > size.stock) {
        throw new BadRequestException('Not enough items in stock');
      }
      const cartItem: CartItem = {
        productId: product._id.toString(),
        sizeId: (size as any)._id.toString(),
        name: product.name,
        image: variant.image || product.images[0],
        price: size.price,
        countInStock: size.stock,
        qty,
        size: size.size,
        color: variant.color,
      };
      cart.items.push(cartItem as any);
    }

    return cart.save();
  }

  async removeCartItem(
    sizeId: string,
    user: UserDocument,
  ): Promise<CartDocument> {
    const cart = await this.getCart(user);
    const initialCount = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.sizeId.toString() !== sizeId,
    );
    if(cart.items.length === initialCount) {
        throw new NotFoundException('Item with this sizeId not found in cart');
    }
    return cart.save();
  }

  async updateCartItemQty(
    sizeId: string,
    qty: number,
    user: UserDocument,
  ): Promise<CartDocument> {
    const cart = await this.getCart(user);
    const item = cart.items.find((item) => item.sizeId.toString() === sizeId);

    if (!item) throw new NotFoundException('Item not found in cart');
    
    const products = await this.productsService.findBySizeId(sizeId);
     if (!products || !products.length) {
      throw new NotFoundException('Product with this size not found, cannot check stock');
    }
    const product = products[0] as any;
    const variant = product.variants[0];
    const size = variant.sizes[0];

    if (qty > size.stock)
      throw new BadRequestException('Not enough stock');

    item.qty = qty;
    return cart.save();
  }

  async clearCart(user: UserDocument): Promise<CartDocument> {
    const cart = await this.getCart(user);
    cart.items = [];
    return cart.save();
  }
}
