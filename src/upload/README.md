# Upload API Documentation

## Tổng quan
API Upload cho phép quản lý file ảnh với đầy đủ chức năng CRUD và lưu trữ thông tin vào MongoDB.

## Các Endpoints

### 1. Upload Ảnh
**POST** `/v1/upload/image`

Upload file ảnh và lưu thông tin vào database.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `image`: File ảnh (bắt buộc)
  - `description`: Mô tả file (tùy chọn)
  - `tags`: Thẻ phân loại (tùy chọn)

**Response:**
```json
{
  "success": true,
  "message": "Upload ảnh thành công!",
  "data": {
    "originalName": "anh-san-pham.jpg",
    "filename": "image-1703123456789-123456789.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg",
    "url": "https://170.64.217.145/v1/uploads/image-1703123456789-123456789.jpg"
  }
}
```

### 2. Lấy Danh Sách Upload
**GET** `/v1/upload`

Lấy danh sách tất cả file đã upload với phân trang và lọc.

**Query Parameters:**
- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng item mỗi trang (mặc định: 10)
- `tags`: Lọc theo tags (có thể nhiều tags)
- `isActive`: Lọc theo trạng thái (true/false)
- `search`: Tìm kiếm theo tên hoặc mô tả

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "originalName": "anh-san-pham.jpg",
    "filename": "image-1703123456789-123456789.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg",
    "url": "https://170.64.217.145/v1/uploads/image-1703123456789-123456789.jpg",
    "description": "Ảnh sản phẩm áo thun nam",
    "tags": ["product", "clothing"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 3. Lấy Thông Tin Upload Theo ID
**GET** `/v1/upload/:id`

Lấy thông tin chi tiết của một file upload.

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "originalName": "anh-san-pham.jpg",
  "filename": "image-1703123456789-123456789.jpg",
  "size": 1024000,
  "mimetype": "image/jpeg",
  "url": "https://170.64.217.145/v1/uploads/image-1703123456789-123456789.jpg",
  "description": "Ảnh sản phẩm áo thun nam",
  "tags": ["product", "clothing"],
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### 4. Cập Nhật Upload (Yêu cầu JWT)
**PUT** `/v1/upload/:id`

Cập nhật thông tin của file upload.

**Headers:**
- Authorization: Bearer {JWT_TOKEN}

**Body:**
```json
{
  "description": "Mô tả mới",
  "tags": ["product", "new"],
  "isActive": false
}
```

### 5. Xóa Upload (Yêu cầu JWT)
**DELETE** `/v1/upload/:id`

Xóa file upload (cả file vật lý và record trong database).

**Headers:**
- Authorization: Bearer {JWT_TOKEN}

**Response:**
```json
{
  "message": "Xóa file upload thành công"
}
```

### 6. Thống Kê Upload
**GET** `/v1/upload/stats`

Lấy thống kê về upload files.

**Response:**
```json
{
  "totalFiles": 150,
  "totalSize": 52428800,
  "filesByType": [
    { "_id": "image/jpeg", "count": 100 },
    { "_id": "image/png", "count": 50 }
  ],
  "filesByTag": [
    { "_id": "product", "count": 80 },
    { "_id": "banner", "count": 20 }
  ]
}
```

### 7. Tìm Kiếm Theo Tags
**GET** `/v1/upload/tags/:tags`

Lấy danh sách file theo tags (phân cách bằng dấu phẩy).

**Example:** `/v1/upload/tags/product,banner`

## Cấu Trúc Database

### Upload Schema
```typescript
{
  originalName: string,      // Tên gốc file
  filename: string,          // Tên file đã đổi
  size: number,             // Kích thước (bytes)
  mimetype: string,         // Loại MIME
  url: string,              // URL truy cập
  path: string,             // Đường dẫn file
  description?: string,     // Mô tả
  tags?: string[],          // Thẻ phân loại
  uploadedBy?: string,      // ID người upload
  isActive: boolean,        // Trạng thái
  createdAt: Date,          // Thời gian tạo
  updatedAt: Date           // Thời gian cập nhật
}
```

## Tính Năng

- ✅ Upload file ảnh với validation
- ✅ Lưu thông tin vào MongoDB
- ✅ Phân trang và tìm kiếm
- ✅ Lọc theo tags và trạng thái
- ✅ Cập nhật thông tin file
- ✅ Xóa file (cả vật lý và database)
- ✅ Thống kê upload
- ✅ JWT Authentication cho các thao tác nhạy cảm
- ✅ Swagger documentation

## Giới Hạn

- Chỉ hỗ trợ file ảnh: jpg, jpeg, png, gif, webp
- Kích thước tối đa: 5MB
- Lưu trữ tại thư mục: `./uploads/` 