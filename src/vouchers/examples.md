# Voucher API Examples

## Các ví dụ test API voucher

### 1. Test với cURL

#### A. Tìm kiếm cơ bản
```bash
# Lấy tất cả voucher (phân trang)
curl -X GET "http://localhost:3001/v1/vouchers?page=1&limit=10"

# Tìm kiếm theo ID voucher
curl -X GET "http://localhost:3001/v1/vouchers?keyword=507f1f77bcf86cd799439011"
```

#### B. Filter theo loại
```bash
# Lấy voucher giảm giá sản phẩm
curl -X GET "http://localhost:3001/v1/vouchers?type=item"

# Lấy voucher giảm giá vận chuyển
curl -X GET "http://localhost:3001/v1/vouchers?type=ship"

# Lấy voucher đã bị vô hiệu hóa
curl -X GET "http://localhost:3001/v1/vouchers?isDisable=true"
```

#### C. Filter theo thời gian
```bash
# Lấy voucher đang hoạt động
curl -X GET "http://localhost:3001/v1/vouchers?isActive=true"

# Lấy voucher đã hết hạn
curl -X GET "http://localhost:3001/v1/v1/vouchers?isExpired=true"

# Lấy voucher trong khoảng thời gian
curl -X GET "http://localhost:3001/v1/vouchers?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z"
```

#### D. Filter theo giá trị
```bash
# Lấy voucher giảm giá từ 5% đến 20%
curl -X GET "http://localhost:3001/v1/vouchers?minDiscount=5&maxDiscount=20"

# Lấy voucher có điều kiện từ 100k đến 1M
curl -X GET "http://localhost:3001/v1/vouchers?minCondition=100000&maxCondition=1000000"

# Lấy voucher có giới hạn giảm giá từ 10k đến 100k
curl -X GET "http://localhost:3001/v1/vouchers?minLimit=10000&maxLimit=100000"
```

#### E. Filter theo stock
```bash
# Lấy voucher còn stock
curl -X GET "http://localhost:3001/v1/vouchers?hasStock=true"

# Lấy voucher hết stock
curl -X GET "http://localhost:3001/v1/vouchers?hasStock=false"

# Lấy voucher có stock từ 10 đến 100
curl -X GET "http://localhost:3001/v1/vouchers?minStock=10&maxStock=100"
```

#### F. Filter theo user
```bash
# Lấy voucher dành cho user cụ thể
curl -X GET "http://localhost:3001/v1/vouchers?userId=507f1f77bcf86cd799439011"

# Lấy voucher có user được chỉ định
curl -X GET "http://localhost:3001/v1/vouchers?hasUsers=true"

# Lấy voucher không có user được chỉ định
curl -X GET "http://localhost:3001/v1/vouchers?hasUsers=false"
```

#### G. Sắp xếp
```bash
# Sắp xếp theo % giảm giá giảm dần
curl -X GET "http://localhost:3001/v1/vouchers?sortBy=disCount&sortOrder=desc"

# Sắp xếp theo điều kiện tăng dần
curl -X GET "http://localhost:3001/v1/vouchers?sortBy=condition&sortOrder=asc"

# Sắp xếp theo ngày tạo mới nhất
curl -X GET "http://localhost:3001/v1/vouchers?sortBy=createdAt&sortOrder=desc"
```

#### H. Tìm kiếm nâng cao (kết hợp nhiều filter)
```bash
# Voucher giảm giá sản phẩm, đang hoạt động, có stock, giảm từ 10-20%
curl -X GET "http://localhost:3001/v1/vouchers?type=item&isActive=true&hasStock=true&minDiscount=10&maxDiscount=20&sortBy=disCount&sortOrder=desc"

# Voucher giảm giá vận chuyển, có điều kiện từ 500k, còn stock
curl -X GET "http://localhost:3001/v1/vouchers?type=ship&minCondition=500000&hasStock=true&sortBy=createdAt&sortOrder=desc"

# Voucher dành cho user cụ thể, đang hoạt động
curl -X GET "http://localhost:3001/v1/vouchers?userId=507f1f77bcf86cd799439011&isActive=true"
```

### 2. Test với JavaScript/Node.js

#### A. Sử dụng fetch
```javascript
// Tìm kiếm cơ bản
const response = await fetch('http://localhost:3001/v1/vouchers?page=1&limit=10');
const data = await response.json();
console.log(data);

// Tìm kiếm nâng cao
const searchParams = new URLSearchParams({
  type: 'item',
  isActive: 'true',
  hasStock: 'true',
  minDiscount: '10',
  maxDiscount: '20',
  sortBy: 'disCount',
  sortOrder: 'desc'
});

const advancedResponse = await fetch(`http://localhost:3001/v1/vouchers?${searchParams}`);
const advancedData = await advancedResponse.json();
console.log(advancedData);
```

#### B. Sử dụng axios
```javascript
const axios = require('axios');

// Tìm kiếm voucher
const searchVouchers = async (params) => {
  try {
    const response = await axios.get('http://localhost:3001/v1/vouchers', {
      params: params
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};

// Ví dụ sử dụng
const result = await searchVouchers({
  type: 'item',
  isActive: 'true',
  hasStock: 'true',
  minDiscount: '10',
  maxDiscount: '20',
  sortBy: 'disCount',
  sortOrder: 'desc',
  page: '1',
  limit: '10'
});

console.log(result);
```

### 3. Test với Postman

#### A. Collection JSON
```json
{
  "info": {
    "name": "Voucher API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get All Vouchers",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3001/v1/vouchers?page=1&limit=10",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["v1", "vouchers"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "10"
            }
          ]
        }
      }
    },
    {
      "name": "Search Active Item Vouchers",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3001/v1/vouchers?type=item&isActive=true&hasStock=true&minDiscount=10&maxDiscount=20&sortBy=disCount&sortOrder=desc",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["v1", "vouchers"],
          "query": [
            {
              "key": "type",
              "value": "item"
            },
            {
              "key": "isActive",
              "value": "true"
            },
            {
              "key": "hasStock",
              "value": "true"
            },
            {
              "key": "minDiscount",
              "value": "10"
            },
            {
              "key": "maxDiscount",
              "value": "20"
            },
            {
              "key": "sortBy",
              "value": "disCount"
            },
            {
              "key": "sortOrder",
              "value": "desc"
            }
          ]
        }
      }
    }
  ]
}
```

### 4. Test Scenarios

#### A. Admin Scenarios
```bash
# 1. Xem tất cả voucher (bao gồm disabled và expired)
curl -X GET "http://localhost:3001/v1/vouchers?includeDisabled=true&includeExpired=true"

# 2. Xem voucher đã hết hạn
curl -X GET "http://localhost:3001/v1/vouchers?isExpired=true"

# 3. Xem voucher đã bị vô hiệu hóa
curl -X GET "http://localhost:3001/v1/v1/vouchers?isDisable=true"

# 4. Xem voucher theo loại và sắp xếp theo ngày tạo
curl -X GET "http://localhost:3001/v1/vouchers?type=item&sortBy=createdAt&sortOrder=desc"
```

#### B. User Scenarios
```bash
# 1. Xem voucher dành cho mình
curl -X GET "http://localhost:3001/v1/vouchers?userId=YOUR_USER_ID&isActive=true"

# 2. Xem voucher giảm giá sản phẩm đang hoạt động
curl -X GET "http://localhost:3001/v1/vouchers?type=item&isActive=true&hasStock=true"

# 3. Xem voucher giảm giá vận chuyển
curl -X GET "http://localhost:3001/v1/vouchers?type=ship&isActive=true&hasStock=true"

# 4. Tìm voucher phù hợp với đơn hàng của mình
curl -X GET "http://localhost:3001/v1/vouchers?type=item&isActive=true&hasStock=true&maxCondition=500000&sortBy=disCount&sortOrder=desc"
```

### 5. Expected Results

#### A. Success Response
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "item",
      "disCount": 15,
      "condition": 500000,
      "limit": 100000,
      "stock": 25,
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z",
      "userId": ["60c72b2f9b1e8a001f8e4bde"],
      "isDisable": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "pages": 1
}
```

#### B. Empty Response
```json
{
  "data": [],
  "total": 0,
  "pages": 0
}
```

#### C. Error Response
```json
{
  "statusCode": 400,
  "message": "Lỗi tìm kiếm voucher: User ID không hợp lệ",
  "error": "Bad Request"
}
```

### 6. Performance Testing

#### A. Test với nhiều filter
```bash
# Test performance với filter phức tạp
time curl -X GET "http://localhost:3001/v1/vouchers?type=item&isActive=true&hasStock=true&minDiscount=5&maxDiscount=25&minCondition=100000&maxCondition=2000000&sortBy=disCount&sortOrder=desc&page=1&limit=50"
```

#### B. Test pagination
```bash
# Test các trang khác nhau
curl -X GET "http://localhost:3001/v1/vouchers?page=1&limit=10"
curl -X GET "http://localhost:3001/v1/vouchers?page=2&limit=10"
curl -X GET "http://localhost:3001/v1/vouchers?page=10&limit=10"
```
