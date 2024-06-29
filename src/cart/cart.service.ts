/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ItemDTO } from './dtos/item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel('Cart') private readonly cartModel: Model<CartDocument>,
  ) {}

  async createCart(
    userId: string,
    itemDTO: ItemDTO,
    subTotalPrice: number,
    totalPrice: number,
  ): Promise<Cart> {
    const newCart = new this.cartModel({
      userId,
      items: [{ ...itemDTO, subTotalPrice }],
      totalPrice,
    });
    return newCart.save();
  }

  async getCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      throw new NotFoundException(`Cart for user ${userId} not found`);
    }
    return cart;
  }

  async deleteCart(userId: string): Promise<CartDocument> {
    const deletedCart = await this.cartModel.findOneAndDelete({ userId });
    if (!deletedCart) {
      throw new NotFoundException(`Cart for user ${userId} not found`);
    }
    return deletedCart;
  }

  private recalculateCart(cart: CartDocument) {
    cart.totalPrice = 0;
    cart.items.forEach((item) => {
      cart.totalPrice += item.quantity * item.price;
    });
  }

  async addItemToCart(userId: string, itemDTO: ItemDTO): Promise<CartDocument> {
    const { productId, quantity, price } = itemDTO;
    const subTotalPrice = quantity * price;

    const cart = await this.getCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === productId,
    );

    if (itemIndex > -1) {
      const item = cart.items[itemIndex];
      item.quantity = Number(item.quantity) + Number(quantity);
      item.subTotalPrice = item.quantity * item.price;
      cart.items[itemIndex] = item;
    } else {
      cart.items.push({ ...itemDTO, subTotalPrice });
    }

    this.recalculateCart(cart);
    return cart.save();
  }

  async removeItemFromCart(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.getCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === productId,
    );

    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      this.recalculateCart(cart);
      return cart.save();
    } else {
      throw new NotFoundException(`Item with productId ${productId} not found in cart`);
    }
  }
}
