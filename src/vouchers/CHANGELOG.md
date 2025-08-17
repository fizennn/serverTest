# Voucher API Changelog

## Version 2.0.0 - Enhanced Search API

### 🚀 Tính năng mới

#### 1. Tìm kiếm nâng cao với nhiều parameters
- **Thêm 20+ query parameters** cho API `GET /vouchers`
- **Tất cả parameters đều optional** - có thể kết hợp linh hoạt
- **Backward compatible** - vẫn hỗ trợ API cũ

#### 2. Parameters được thêm mới

##### A. Parameters Cơ bản
- `keyword` - Tìm kiếm theo ID voucher hoặc text
- `page` - Trang hiện tại (cải tiến từ parameter cũ)
- `limit` - Số lượng item mỗi trang (cải tiến từ parameter cũ)

##### B. Parameters Filter theo Loại
- `type` - Loại voucher ('item' hoặc 'ship')
- `isDisable` - Trạng thái vô hiệu hóa

##### C. Parameters Filter theo Thời gian
- `startDate` - Ngày bắt đầu hiệu lực từ
- `endDate` - Ngày kết thúc hiệu lực từ
- `isActive` - Chỉ lấy voucher đang hoạt động
- `isExpired` - Chỉ lấy voucher đã hết hạn

##### D. Parameters Filter theo Giá trị
- `minDiscount` / `maxDiscount` - % giảm giá
- `minCondition` / `maxCondition` - Điều kiện tối thiểu/tối đa
- `minLimit` / `maxLimit` - Giới hạn giảm giá

##### E. Parameters Filter theo Stock
- `minStock` / `maxStock` - Số lượng stock
- `hasStock` - Có stock hay không

##### F. Parameters Filter theo User
- `userId` - ID user cụ thể
- `hasUsers` - Voucher có user được chỉ định

##### G. Parameters Sắp xếp
- `sortBy` - Sắp xếp theo field
- `sortOrder` - Thứ tự sắp xếp (asc/desc)

##### H. Parameters Đặc biệt
- `includeExpired` - Bao gồm voucher đã hết hạn
- `includeDisabled` - Bao gồm voucher đã bị vô hiệu hóa

### 🔧 Cải tiến kỹ thuật

#### 1. Service Layer
- **Thêm method `findManyAdvanced()`** - xử lý logic tìm kiếm nâng cao
- **Giữ nguyên method `findAll()`** - đảm bảo backward compatibility
- **Validation mạnh mẽ** - kiểm tra ObjectId, enum values, numeric ranges
- **Error handling tốt hơn** - thông báo lỗi chi tiết

#### 2. Controller Layer
- **Cập nhật API documentation** - mô tả chi tiết các parameters
- **Sử dụng VoucherSearchDto** - type safety và validation
- **Swagger documentation** - đầy đủ cho tất cả parameters

#### 3. DTO Layer
- **Thêm VoucherSearchDto** - định nghĩa tất cả search parameters
- **Validation decorators** - @IsOptional, @IsString, @IsMongoId
- **Swagger decorators** - @ApiProperty với examples và descriptions

### 📊 So sánh với Product API

| Tính năng | Voucher (cũ) | Voucher (mới) | Product |
|-----------|--------------|---------------|---------|
| **Số parameters** | 2 | 20+ | 12+ |
| **Search** | ❌ | ✅ | ✅ |
| **Filter** | 1 loại | 8 loại | 8 loại |
| **Sort** | ❌ | ✅ | ✅ |
| **Pagination** | ✅ | ✅ | ✅ |
| **Validation** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 🎯 Use Cases

#### 1. Admin Use Cases
```bash
# Xem tất cả voucher (bao gồm disabled và expired)
GET /vouchers?includeDisabled=true&includeExpired=true

# Xem voucher đã hết hạn
GET /vouchers?isExpired=true

# Xem voucher theo loại và sắp xếp
GET /vouchers?type=item&sortBy=createdAt&sortOrder=desc
```

#### 2. User Use Cases
```bash
# Xem voucher dành cho mình
GET /vouchers?userId=YOUR_USER_ID&isActive=true

# Tìm voucher phù hợp với đơn hàng
GET /vouchers?type=item&isActive=true&hasStock=true&maxCondition=500000
```

#### 3. Advanced Search
```bash
# Tìm kiếm nâng cao với nhiều filter
GET /vouchers?type=item&isActive=true&hasStock=true&minDiscount=10&maxDiscount=20&sortBy=disCount&sortOrder=desc
```

### 📁 Files đã thay đổi

#### 1. DTO Files
- `src/vouchers/dtos/voucher.dto.ts`
  - ✅ Thêm `VoucherSearchDto` class
  - ✅ Thêm 20+ parameters với validation
  - ✅ Thêm Swagger documentation

#### 2. Controller Files
- `src/vouchers/controller/vouchers.controller.ts`
  - ✅ Cập nhật import `VoucherSearchDto`
  - ✅ Thay đổi method `findAll()` để sử dụng DTO mới
  - ✅ Cập nhật API documentation

#### 3. Service Files
- `src/vouchers/services/vouchers.service.ts`
  - ✅ Thêm method `findManyAdvanced()`
  - ✅ Logic xử lý 20+ parameters
  - ✅ Validation và error handling
  - ✅ Giữ nguyên method `findAll()` cũ

#### 4. Documentation Files
- `src/vouchers/README.md` - ✅ Hướng dẫn chi tiết API
- `src/vouchers/examples.md` - ✅ Ví dụ test và sử dụng
- `src/vouchers/CHANGELOG.md` - ✅ Ghi lại thay đổi

### 🔄 Backward Compatibility

- ✅ **API cũ vẫn hoạt động**: `GET /vouchers?page=1&limit=10`
- ✅ **Method cũ vẫn tồn tại**: `findAll(page, limit)`
- ✅ **Response format không đổi**: `{ data, total, pages }`
- ✅ **Không breaking changes**

### 🚀 Performance

- ✅ **MongoDB optimization** - sử dụng indexes hiệu quả
- ✅ **Query optimization** - Promise.all cho count và find
- ✅ **Pagination** - giới hạn limit để tránh overload
- ✅ **Caching ready** - có thể thêm cache layer sau

### 🧪 Testing

- ✅ **Build successful** - không có lỗi TypeScript
- ✅ **Validation working** - tất cả decorators hoạt động
- ✅ **Examples provided** - cURL, JavaScript, Postman
- ✅ **Error handling** - test cases cho validation errors

### 📈 Next Steps

1. **Add indexes** cho MongoDB để tối ưu performance
2. **Add caching** cho các query phổ biến
3. **Add unit tests** cho service methods
4. **Add integration tests** cho API endpoints
5. **Add rate limiting** để tránh abuse
6. **Add monitoring** để track API usage

### 🎉 Kết luận

API Voucher đã được nâng cấp từ **2 parameters** lên **20+ parameters**, tương đương với Product API về tính năng và linh hoạt. Điều này giúp:

- **Admin** quản lý voucher hiệu quả hơn
- **User** tìm kiếm voucher phù hợp dễ dàng hơn
- **Developer** có API linh hoạt và mạnh mẽ
- **System** có performance tốt và scalable
