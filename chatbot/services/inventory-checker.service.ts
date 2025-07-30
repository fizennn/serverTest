import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';

export interface InventoryQuery {
  productName: string;
  color?: string;
  size?: string;
}

export interface InventoryResult {
  found: boolean;
  productName: string;
  color?: string;
  size?: string;
  stock?: number;
  price?: number;
  message: string;
}

@Injectable()
export class InventoryCheckerService {
  constructor(
    @InjectModel(Product.name) public productModel: Model<Product>,
  ) {}

  // Hàm loại bỏ dấu tiếng Việt
  public removeVietnameseTones(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  // Hàm tính khoảng cách Levenshtein
  public levenshtein(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // thay thế
            matrix[i][j - 1] + 1,     // chèn
            matrix[i - 1][j] + 1      // xóa
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  /**
   * Kiểm tra tồn kho sản phẩm
   */
  async checkInventory(query: InventoryQuery): Promise<InventoryResult> {
    try {
      // Tìm tất cả sản phẩm còn hoạt động
      const products = await this.productModel.find({ status: true });
      // Chuẩn hóa tên sản phẩm cần tìm
      const searchName = this.removeVietnameseTones(query.productName).toLowerCase();
      // Lọc sản phẩm phù hợp (khớp một phần, không dấu, không phân biệt hoa thường)
      let matchedProducts = products.filter(p =>
        this.removeVietnameseTones(p.name).toLowerCase().includes(searchName)
      );

      // Nếu không tìm thấy, dùng fuzzy search (Levenshtein)
      if (matchedProducts.length === 0) {
        let minDistance = Infinity;
        let bestProduct = null;
        for (const p of products) {
          const dist = this.levenshtein(this.removeVietnameseTones(p.name).toLowerCase(), searchName);
          if (dist < minDistance) {
            minDistance = dist;
            bestProduct = p;
          }
        }
        // Nếu khoảng cách nhỏ hơn hoặc bằng 2, coi là khớp
        if (bestProduct && minDistance <= 2) {
          matchedProducts.push(bestProduct);
        }
      }

      if (matchedProducts.length === 0) {
        return {
          found: false,
          productName: query.productName,
          message: `❌ Không tìm thấy sản phẩm "${query.productName}" trong hệ thống.`,
        };
      }

      // Nếu có nhiều sản phẩm, lấy sản phẩm đầu tiên phù hợp
      const product = matchedProducts[0];

      // Nếu color không tồn tại trong variants thì bỏ qua color
      if (query.color) {
        const allColors = product.variants.map(v => v.color.toLowerCase());
        if (!allColors.includes(query.color.toLowerCase())) {
          query.color = null;
        }
      }

      // Nếu không chỉ định màu/size, trả về tất cả các màu/size còn hàng
      if (!query.color && !query.size) {
        let foundAny = false;
        let totalVariants = 0;
        for (const variant of product.variants) {
          for (const size of variant.sizes) {
            if (size.stock > 0) {
              foundAny = true;
              totalVariants++;
            }
          }
        }
        
        if (!foundAny) {
          return {
            found: false,
            productName: product.name,
            message: `❌ Sản phẩm "${product.name}" hiện không còn hàng ở bất kỳ màu/size nào.`,
          };
        }
        
        return {
          found: true,
          productName: product.name,
          message: this.generateAllVariantsMessage(product.name, totalVariants),
        };
      }

      // Nếu có chỉ định màu/size, vẫn dùng logic cũ
      const bestMatch = this.findBestMatch([product], query);

      if (!bestMatch) {
        return {
          found: false,
          productName: query.productName,
          message: `❌ Không tìm thấy sản phẩm "${query.productName}" với thông số yêu cầu.`,
        };
      }

      const { variant, size } = bestMatch;

      return {
        found: true,
        productName: product.name,
        color: variant?.color,
        size: size?.size,
        stock: size?.stock || 0,
        price: size?.price,
        message: this.generateStockMessage(product.name, variant?.color, size),
      };
    } catch (error) {
      console.error('Lỗi khi kiểm tra tồn kho:', error);
      return {
        found: false,
        productName: query.productName,
        message: '❌ Có lỗi xảy ra khi kiểm tra tồn kho. Vui lòng thử lại sau.',
      };
    }
  }

  /**
   * Tìm sản phẩm phù hợp nhất
   */
  private findBestMatch(products: any[], query: InventoryQuery) {
    for (const product of products) {
      // Nếu không có yêu cầu về màu sắc và size
      if (!query.color && !query.size) {
        // Trả về variant đầu tiên có stock > 0
        for (const variant of product.variants) {
          for (const size of variant.sizes) {
            if (size.stock > 0) {
              return { product, variant, size };
            }
          }
        }
        continue;
      }

      // Tìm theo màu sắc và size
      for (const variant of product.variants) {
        // Kiểm tra màu sắc nếu có yêu cầu
        if (query.color && !this.matchColor(variant.color, query.color)) {
          continue;
        }

        // Tìm size phù hợp
        for (const size of variant.sizes) {
          if (!query.size || this.matchSize(size.size, query.size)) {
            return { product, variant, size };
          }
        }
      }
    }

    return null;
  }

  /**
   * So khớp màu sắc
   */
  private matchColor(variantColor: string, queryColor: string): boolean {
    const variantColorLower = variantColor.toLowerCase();
    const queryColorLower = queryColor.toLowerCase();
    
    // So khớp chính xác
    if (variantColorLower === queryColorLower) {
      return true;
    }

    // So khớp một phần
    if (variantColorLower.includes(queryColorLower) || queryColorLower.includes(variantColorLower)) {
      return true;
    }

    // Map các từ khóa màu sắc
    const colorMap: { [key: string]: string[] } = {
      'trắng': ['white', 'trắng', 'trang'],
      'đen': ['black', 'đen', 'den'],
      'xanh': ['blue', 'xanh', 'blue'],
      'đỏ': ['red', 'đỏ', 'do'],
      'vàng': ['yellow', 'vàng', 'vang'],
      'xám': ['gray', 'grey', 'xám', 'xam'],
      'nâu': ['brown', 'nâu', 'nau'],
    };

    for (const [key, values] of Object.entries(colorMap)) {
      if (values.includes(queryColorLower) && values.includes(variantColorLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * So khớp size
   */
  private matchSize(variantSize: string, querySize: string): boolean {
    const variantSizeUpper = variantSize.toUpperCase();
    const querySizeUpper = querySize.toUpperCase();
    
    return variantSizeUpper === querySizeUpper;
  }

  // Tạo thông báo tồn kho ngắn gọn cho mobile app
  private generateStockMessage(productName: string, color?: string, size?: any): string {
    if (!size) {
      return `❌ Sản phẩm "${productName}" hiện không có trong kho.`;
    }

    const colorText = color ? ` màu ${color}` : '';
    const sizeText = size.size ? ` size ${size.size}` : '';

    if (size.stock > 0) {
      return `✅ ${productName}${colorText}${sizeText} còn ${size.stock} cái trong kho. Giá: ${size.price?.toLocaleString('vi-VN')} VNĐ.`;
    } else {
      return `❌ Rất tiếc, ${productName}${colorText}${sizeText} đã hết hàng.`;
    }
  }

  // Tạo thông báo tồn kho cho tất cả variants (ngắn gọn)
  private generateAllVariantsMessage(productName: string, totalVariants: number): string {
    return `✅ ${productName} có ${totalVariants} lựa chọn còn hàng. Bạn có thể xem chi tiết bên dưới.`;
  }

  /**
   * Phân tích câu hỏi để trích xuất thông tin sản phẩm
   */
  parseInventoryQuery(userMessage: string): InventoryQuery | null {
    const message = userMessage.toLowerCase();
    
    // Các từ khóa liên quan đến kiểm tra tồn kho
    const inventoryKeywords = [
      'còn hàng', 'còn không', 'có không', 'còn bao nhiêu', 'tồn kho',
      'kiểm tra', 'check', 'stock', 'inventory', 'còn mấy', 'còn mấy cái'
    ];

    const hasInventoryKeyword = inventoryKeywords.some(keyword => 
      message.includes(keyword)
    );

    if (!hasInventoryKeyword) {
      return null;
    }

    // Trích xuất tên sản phẩm
    const productName = this.extractProductName(message);
    if (!productName) {
      return null;
    }

    // Trích xuất màu sắc
    const color = this.extractColor(message);
    
    // Trích xuất size
    const size = this.extractSize(message);

    return {
      productName,
      color,
      size,
    };
  }

  /**
   * Trích xuất tên sản phẩm
   */
  private extractProductName(message: string): string | null {
    // Loại bỏ các từ không cần thiết
    const stopWords = [
      'còn', 'hàng', 'không', 'có', 'bao', 'nhiêu', 'mấy', 'cái', 'kiểm', 'tra',
      'check', 'stock', 'inventory', 'size', 'màu', 'color', 'trắng', 'đen', 'xanh',
      'đỏ', 'vàng', 'xám', 'nâu', 's', 'm', 'l', 'xl', 'xxl'
    ];

    let words = message.split(' ');
    words = words.filter(word => !stopWords.includes(word));

    if (words.length === 0) {
      return null;
    }

    // Tìm cụm từ sản phẩm (thường có 2-4 từ)
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
        const productName = words.slice(i, j).join(' ');
        if (productName.length >= 3) {
          return productName;
        }
      }
    }

    return words.join(' ');
  }

  public extractColor(message: string): string | null {
    const colors = ['trắng', 'đen', 'xanh', 'đỏ', 'vàng', 'xám', 'nâu', 'white', 'black', 'blue', 'red', 'yellow', 'gray', 'brown'];
    for (const color of colors) {
      if (message.includes(color)) {
        return color;
      }
    }
    return null;
  }

  public extractSize(message: string): string | null {
    const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'];
    // Tách câu thành các từ riêng biệt
    const words = message.toLowerCase().split(/\s+/);
    for (const size of sizes) {
      if (words.includes(size)) {
        return size.toUpperCase();
      }
    }
    return null;
  }
} 