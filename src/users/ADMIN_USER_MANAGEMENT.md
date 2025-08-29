# Hướng dẫn API Quản lý User cho Admin

## Tổng quan

Hệ thống cung cấp các API để admin quản lý user trong hệ thống, bao gồm:
- Lấy danh sách user thường (isAdmin = false) với tìm kiếm nâng cao
- Lấy danh sách admin (isAdmin = true)
- Cập nhật trạng thái hoạt động của user (isActive)
- Quản lý vai trò và quyền hạn

## Các API chính

### 1. Tìm kiếm user thường nâng cao

**Endpoint:** `GET /users/regular`

**Mô tả:** Lấy danh sách tất cả người dùng thường (isAdmin = false) với tìm kiếm nâng cao

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Query Parameters:**

#### Tìm kiếm cơ bản:
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng item mỗi trang (mặc định: 20)

#### Tìm kiếm nâng cao:
- `keyword` (optional): Từ khóa tìm kiếm (tên, email) hoặc ID user (ObjectId)
- `name` (optional): Tên user (tìm kiếm chính xác)
- `email` (optional): Email user (tìm kiếm chính xác)
- `isActive` (optional): Trạng thái hoạt động (true/false)
- `roleId` (optional): ID vai trò

#### Sắp xếp:
- `sortBy` (optional): Sắp xếp theo (name, email, createdAt, isActive)
- `sortOrder` (optional): Thứ tự sắp xếp (asc, desc)

**Ví dụ sử dụng:**

```bash
# Tìm kiếm cơ bản
GET /users/regular?page=1&limit=10

# Tìm kiếm theo từ khóa
GET /users/regular?keyword=john&page=1&limit=10

# Tìm kiếm theo tên
GET /users/regular?name=John&page=1&limit=10

# Tìm kiếm theo email
GET /users/regular?email=john@example.com&page=1&limit=10

# Tìm kiếm theo trạng thái hoạt động
GET /users/regular?isActive=true&page=1&limit=10

# Tìm kiếm theo vai trò
GET /users/regular?roleId=507f1f77bcf86cd799439011&page=1&limit=10

# Sắp xếp theo tên tăng dần
GET /users/regular?sortBy=name&sortOrder=asc&page=1&limit=10

# Tìm kiếm kết hợp nhiều tiêu chí
GET /users/regular?keyword=john&isActive=true&sortBy=createdAt&sortOrder=desc&page=1&limit=10
```

**Response:**
```json
{
  "items": [
    {
      "_id": "665f1e2b2c8b2a0012a4e123",
      "name": "John Doe",
      "email": "john@example.com",
      "isAdmin": false,
      "isActive": true,
      "roleId": {
        "_id": "665f1e2b2c8b2a0012a4e123",
        "name": "Customer",
        "description": "Khách hàng thông thường"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

### 2. Lấy danh sách admin

**Endpoint:** `GET /users/admins`

**Mô tả:** Lấy danh sách tất cả người dùng có quyền admin (isAdmin = true)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng item mỗi trang (mặc định: 20)

### 3. Cập nhật trạng thái hoạt động của user

**Endpoint:** `PUT /users/:id/status`

**Mô tả:** Cập nhật trạng thái hoạt động (isActive) của một user

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Path Parameters:**
- `id`: ID của user cần cập nhật

**Request Body:**
```json
{
  "isActive": true
}
```

**Response:**
```json
{
  "_id": "665f1e2b2c8b2a0012a4e123",
  "name": "John Doe",
  "email": "john@example.com",
  "isAdmin": false,
  "isActive": true,
  "roleId": {
    "_id": "665f1e2b2c8b2a0012a4e123",
    "name": "Customer",
    "description": "Khách hàng thông thường"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. Lấy thông tin chi tiết user

**Endpoint:** `GET /users/:id`

**Mô tả:** Lấy thông tin chi tiết của một user theo ID

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Path Parameters:**
- `id`: ID của user

### 5. Cập nhật thông tin user

**Endpoint:** `PUT /users/:id`

**Mô tả:** Cập nhật thông tin của một user (bao gồm isActive, roleId)

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Path Parameters:**
- `id`: ID của user

**Request Body:**
```json
{
  "name": "Updated User Name",
  "email": "updated@example.com",
  "isActive": true,
  "roleId": "665f1e2b2c8b2a0012a4e123"
}
```

### 6. Lấy users theo quyền hạn

**Endpoint:** `GET /users/by-permission/:permission`

**Mô tả:** Lấy danh sách users có quyền hạn cụ thể

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Path Parameters:**
- `permission`: Tên quyền hạn (isOrder, isProduct, isCategory, isPost, isVoucher, isBanner, isAnalytic, isReturn, isUser)

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng item mỗi trang (mặc định: 20)

### 7. Lấy users theo vai trò

**Endpoint:** `GET /users/by-role/:roleId`

**Mô tả:** Lấy danh sách users có vai trò cụ thể

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Path Parameters:**
- `roleId`: ID của vai trò

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số lượng item mỗi trang (mặc định: 20)

### 8. Thống kê nhân viên

**Endpoint:** `GET /users/statistics/employees`

**Mô tả:** Lấy thống kê chi tiết về nhân viên trong hệ thống

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Response:**
```json
{
  "totalEmployees": 25,
  "activeEmployees": 20,
  "inactiveEmployees": 5,
  "employeesByRole": [
    {
      "_id": "665f1e2b2c8b2a0012a4e123",
      "count": 8,
      "roleName": "Product Manager"
    }
  ],
  "employeesByPermission": {
    "isOrder": 15,
    "isProduct": 20,
    "isCategory": 12,
    "isPost": 8,
    "isVoucher": 10,
    "isBanner": 5,
    "isAnalytic": 18,
    "isReturn": 6,
    "isUser": 14
  },
  "recentEmployees": [
    {
      "_id": "665f1e2b2c8b2a0012a4e123",
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "roleId": {
        "_id": "665f1e2b2c8b2a0012a4e123",
        "name": "Product Manager"
      }
    }
  ]
}
```

## Tính năng tìm kiếm nâng cao

API `GET /users/regular` hỗ trợ tìm kiếm nâng cao với các tính năng:

### 1. Tìm kiếm theo từ khóa (keyword)
- Tìm kiếm trong tên và email
- Hỗ trợ tìm kiếm theo ID user (ObjectId)
- Tìm kiếm không phân biệt chữ hoa/thường

### 2. Tìm kiếm chính xác
- `name`: Tìm kiếm theo tên chính xác
- `email`: Tìm kiếm theo email chính xác
- `isActive`: Lọc theo trạng thái hoạt động
- `roleId`: Lọc theo vai trò

### 3. Sắp xếp
- `sortBy`: name, email, createdAt, isActive
- `sortOrder`: asc (tăng dần), desc (giảm dần)

### 4. Kết hợp nhiều tiêu chí
Có thể kết hợp nhiều tiêu chí tìm kiếm trong cùng một request.

## Lưu ý quan trọng

1. **Quyền truy cập:** Tất cả các API này yêu cầu quyền admin (AdminGuard)

2. **Bảo mật:** Không thể thay đổi trạng thái của admin khác thông qua API `updateUserStatus`

3. **Phân trang:** Tất cả API lấy danh sách đều hỗ trợ phân trang với `page` và `limit`

4. **Validation:** Hệ thống sẽ validate:
   - ID user phải hợp lệ (ObjectId)
   - User phải tồn tại
   - Quyền hạn phải hợp lệ

5. **Tìm kiếm:** 
   - Tìm kiếm không phân biệt chữ hoa/thường
   - Hỗ trợ tìm kiếm một phần (partial search)
   - Có thể kết hợp nhiều tiêu chí

## Ví dụ sử dụng

### Kích hoạt user
```bash
curl -X PUT http://localhost:3000/users/665f1e2b2c8b2a0012a4e123/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

### Vô hiệu hóa user
```bash
curl -X PUT http://localhost:3000/users/665f1e2b2c8b2a0012a4e123/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### Tìm kiếm user thường
```bash
# Tìm kiếm cơ bản
curl -X GET "http://localhost:3000/users/regular?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"

# Tìm kiếm theo từ khóa
curl -X GET "http://localhost:3000/users/regular?keyword=john&page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"

# Tìm kiếm kết hợp nhiều tiêu chí
curl -X GET "http://localhost:3000/users/regular?keyword=john&isActive=true&sortBy=createdAt&sortOrder=desc&page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

## Error Codes

- `400`: Dữ liệu không hợp lệ hoặc ID không hợp lệ
- `403`: Không có quyền truy cập (chỉ admin)
- `404`: Không tìm thấy user
- `500`: Lỗi server
