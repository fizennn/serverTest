# Voucher API Documentation

## Tổng quan

API Voucher cung cấp các chức năng quản lý và tìm kiếm phiếu giảm giá với nhiều tùy chọn filter và sắp xếp nâng cao.

## Base URL
```
http://localhost:3001/v1/vouchers
```

## Các Endpoints

### 1. GET /vouchers - Tìm kiếm voucher nâng cao

**Mô tả**: Tìm kiếm voucher với nhiều tiêu chí filter và sắp xếp.

**Method**: `GET`

**URL**: `/vouchers`

**Query Parameters** (Tất cả đều optional):

#### A. Parameters Cơ bản
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `keyword` | string | Từ khóa tìm kiếm (ID voucher hoặc text) | `"giảm giá"` hoặc `"507f1f77bcf86cd799439011"` |
| `page` | string | Trang hiện tại | `"1"` |
| `limit` | string | Số lượng item mỗi trang | `"10"` |

#### B. Parameters Filter theo Loại
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `type` | string | Loại voucher | `"item"` hoặc `"ship"` |
| `isDisable` | string | Trạng thái vô hiệu hóa | `"true"` hoặc `"false"` |

#### C. Parameters Filter theo Thời gian
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `startDate` | string | Ngày bắt đầu hiệu lực từ | `"2024-01-01T00:00:00.000Z"` |
| `endDate` | string | Ngày kết thúc hiệu lực từ | `"2024-12-31T23:59:59.999Z"` |
| `isActive` | string | Chỉ lấy voucher đang hoạt động | `"true"` |
| `isExpired` | string | Chỉ lấy voucher đã hết hạn | `"true"` |

#### D. Parameters Filter theo Giá trị
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `minDiscount` | string | % giảm giá tối thiểu | `"5"` |
| `maxDiscount` | string | % giảm giá tối đa | `"20"` |
| `minCondition` | string | Điều kiện tối thiểu (VNĐ) | `"100000"` |
| `maxCondition` | string | Điều kiện tối đa (VNĐ) | `"1000000"` |
| `minLimit` | string | Giới hạn giảm giá tối thiểu (VNĐ) | `"10000"` |
| `maxLimit` | string | Giới hạn giảm giá tối đa (VNĐ) | `"100000"` |

#### E. Parameters Filter theo Stock
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `minStock` | string | Số lượng stock tối thiểu | `"10"` |
| `maxStock` | string | Số lượng stock tối đa | `"100"` |
| `hasStock` | string | Có stock hay không | `"true"` hoặc `"false"` |

#### F. Parameters Filter theo User
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `userId` | string | ID user cụ thể | `"507f1f77bcf86cd799439011"` |
| `hasUsers` | string | Voucher có user được chỉ định | `"true"` hoặc `"false"` |

#### G. Parameters Sắp xếp
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `sortBy` | string | Sắp xếp theo field | `"disCount"`, `"condition"`, `"limit"`, `"stock"`, `"start"`, `"end"`, `"createdAt"` |
| `sortOrder` | string | Thứ tự sắp xếp | `"asc"` hoặc `"desc"` |

#### H. Parameters Đặc biệt
| Parameter | Type | Mô tả | Ví dụ |
|-----------|------|-------|-------|
| `includeExpired` | string | Bao gồm voucher đã hết hạn | `"true"` |
| `includeDisabled` | string | Bao gồm voucher đã bị vô hiệu hóa | `"true"` |

## Ví dụ sử dụng

### 1. Tìm kiếm cơ bản
```bash
# Lấy tất cả voucher (phân trang)
GET /vouchers?page=1&limit=10

# Tìm kiếm theo ID voucher
GET /vouchers?keyword=507f1f77bcf86cd799439011
```

### 2. Filter theo loại và thời gian
```bash
# Lấy voucher giảm giá sản phẩm đang hoạt động
GET /vouchers?type=item&isActive=true

# Lấy voucher giảm giá vận chuyển
GET /vouchers?type=ship

# Lấy voucher trong khoảng thời gian
GET /vouchers?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z
```

### 3. Filter theo giá trị
```bash
# Lấy voucher giảm giá từ 5% đến 20%
GET /vouchers?minDiscount=5&maxDiscount=20

# Lấy voucher có điều kiện từ 100k đến 1M
GET /vouchers?minCondition=100000&maxCondition=1000000

# Lấy voucher có giới hạn giảm giá từ 10k đến 100k
GET /vouchers?minLimit=10000&maxLimit=100000
```

### 4. Filter theo stock
```bash
# Lấy voucher còn stock
GET /vouchers?hasStock=true

# Lấy voucher có stock từ 10 đến 100
GET /vouchers?minStock=10&maxStock=100
```

### 5. Filter theo user
```bash
# Lấy voucher dành cho user cụ thể
GET /vouchers?userId=507f1f77bcf86cd799439011

# Lấy voucher có user được chỉ định
GET /vouchers?hasUsers=true
```

### 6. Sắp xếp và phân trang
```bash
# Sắp xếp theo % giảm giá giảm dần
GET /vouchers?sortBy=disCount&sortOrder=desc

# Sắp xếp theo ngày tạo mới nhất
GET /vouchers?sortBy=createdAt&sortOrder=desc

# Sắp xếp theo điều kiện tăng dần
GET /vouchers?sortBy=condition&sortOrder=asc
```

### 7. Tìm kiếm nâng cao (kết hợp nhiều filter)
```bash
# Voucher giảm giá sản phẩm, đang hoạt động, có stock, giảm từ 10-20%
GET /vouchers?type=item&isActive=true&hasStock=true&minDiscount=10&maxDiscount=20&sortBy=disCount&sortOrder=desc

# Voucher giảm giá vận chuyển, có điều kiện từ 500k, còn stock
GET /vouchers?type=ship&minCondition=500000&hasStock=true&sortBy=createdAt&sortOrder=desc

# Voucher dành cho user cụ thể, đang hoạt động, chưa hết hạn
GET /vouchers?userId=507f1f77bcf86cd799439011&isActive=true&includeExpired=false
```

### 8. Tìm kiếm voucher đã hết hạn hoặc bị vô hiệu hóa
```bash
# Lấy voucher đã hết hạn
GET /vouchers?isExpired=true

# Lấy voucher đã bị vô hiệu hóa
GET /vouchers?isDisable=true

# Lấy tất cả voucher (bao gồm hết hạn và vô hiệu hóa)
GET /vouchers?includeExpired=true&includeDisabled=true
```

## Response Format

### Success Response (200)
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "item",
      "disCount": 10,
      "condition": 500000,
      "limit": 100000,
      "stock": 50,
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z",
      "userId": ["60c72b2f9b1e8a001f8e4bde"],
      "isDisable": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25,
  "pages": 3
}
```

### Error Response (400)
```json
{
  "statusCode": 400,
  "message": "Lỗi tìm kiếm voucher: User ID không hợp lệ",
  "error": "Bad Request"
}
```

## Lưu ý quan trọng

1. **Tất cả parameters đều optional**: Bạn có thể sử dụng bất kỳ combination nào của các parameters.

2. **Mặc định filter**:
   - `isDisable: false` (không bao gồm voucher đã vô hiệu hóa)
   - `end: { $gte: now }` (không bao gồm voucher đã hết hạn)
   - `sortBy: "createdAt"`, `sortOrder: "desc"` (sắp xếp theo ngày tạo mới nhất)

3. **Validation**:
   - `userId` phải là MongoDB ObjectId hợp lệ
   - `type` chỉ nhận giá trị `"item"` hoặc `"ship"`
   - `sortBy` chỉ nhận các field hợp lệ
   - `sortOrder` chỉ nhận `"asc"` hoặc `"desc"`

4. **Performance**: API sử dụng MongoDB aggregation để tối ưu performance với các filter phức tạp.

5. **Pagination**: Mặc định `page=1`, `limit=10`. Tối đa `limit=100` để tránh overload.

## Các API khác

- `GET /vouchers/active` - Lấy voucher đang hoạt động
- `GET /vouchers/all` - Lấy tất cả voucher (debug)
- `GET /vouchers/user/:userId` - Lấy voucher của user cụ thể
- `POST /vouchers` - Tạo voucher mới (Admin only)
- `DELETE /vouchers/:id` - Vô hiệu hóa voucher (Admin only)
