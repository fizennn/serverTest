# Test API lấy sản phẩm theo Size ID

## API Endpoints đã tạo:

### 1. Lấy sản phẩm theo Variant ID
```
GET /products/variant/:variantId
```

Ví dụ:
```
GET /products/variant/68551b6f0bc19e44a4ae1920
```

### 2. Lấy sản phẩm theo Size ID
```
GET /products/size/:sizeId
```

Ví dụ:
```
GET /products/size/68551b6f0bc19e44a4ae1921
```

## Dữ liệu test:

Với sản phẩm mẫu:
```json
{
    "_id": "68551835dc75515b71ad59c6",
    "name": "Áo thun nam cổ trònn",
    "brand": "Uniqlo",
    "category": "Áo thun",
    "images": [
        "http://localhost:3001/uploads/ao-thun-1.jpg",
        "http://localhost:3001/uploads/ao-thun-2.jpg"
    ],
    "description": "Áo thun chất liệu cotton thoáng mát, phù hợp mặc hàng ngày.",
    "reviews": [],
    "rating": 0,
    "numReviews": 0,
    "price": 250000,
    "countInStock": 84,
    "variants": [
        {
            "color": "Đenn10",
            "image": "black.jpg",
            "sizes": [
                {
                    "size": "S",
                    "stock": 10,
                    "price": 250000,
                    "_id": "68551b6f0bc19e44a4ae1921"
                }
            ],
            "_id": "68551b6f0bc19e44a4ae1920"
        }
    ],
    "status": true,
    "createdAt": "2025-06-20T08:13:41.570Z",
    "updatedAt": "2025-06-22T05:06:28.536Z",
    "__v": 1
}
```

## Kết quả mong đợi:

### Khi gọi GET /products/size/68551b6f0bc19e44a4ae1921:
- Trả về sản phẩm "Áo thun nam cổ trònn"
- Chỉ hiển thị size có ID "68551b6f0bc19e44a4ae1921" (size S)
- Các size khác sẽ bị lọc ra

### Khi gọi GET /products/variant/68551b6f0bc19e44a4ae1920:
- Trả về sản phẩm "Áo thun nam cổ trònn"
- Chỉ hiển thị variant có ID "68551b6f0bc19e44a4ae1920" (màu Đen)
- Các variant khác sẽ bị lọc ra

## Validation:
- API sẽ validate MongoDB ObjectId format
- Trả về lỗi 400 nếu ID không hợp lệ
- Trả về lỗi 404 nếu không tìm thấy sản phẩm 