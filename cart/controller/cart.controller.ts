import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { CartService } from '../services/cart.service';
import { AddToCartDto } from '../dtos/add-to-cart.dto';
import { UserDocument } from '../../users/schemas/user.schema';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Giỏ hàng')
@ApiBearerAuth('JWT-auth')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: UserDocument) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  addToCart(
    @Body() { sizeId, qty }: AddToCartDto,
    @CurrentUser() user: UserDocument,
  ) {
    if (!sizeId) {
      throw new BadRequestException('Size ID is required');
    }
    return this.cartService.addCartItem(sizeId, qty, user);
  }

  @Put('items/:sizeId')
  updateCartItem(
    @Param('sizeId') sizeId: string,
    @Body('qty') qty: number,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.updateCartItemQty(sizeId, qty, user);
  }

  @Delete('items/:sizeId')
  removeFromCart(
    @Param('sizeId') sizeId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.cartService.removeCartItem(sizeId, user);
  }

  @Delete()
  clearCart(@CurrentUser() user: UserDocument) {
    return this.cartService.clearCart(user);
  }
}
