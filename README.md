# Tài Liệu Server E-commerce

Tài liệu này cung cấp một cái nhìn tổng quan về kiến trúc, chức năng và cách vận hành của server backend cho dự án E-commerce.

## 1. Tổng quan

Đây là một hệ thống backend cho ứng dụng thương mại điện tử, được xây dựng bằng NestJS và MongoDB. Hệ thống quản lý các chức năng cốt lõi như người dùng, sản phẩm, giỏ hàng, đơn hàng và một hệ thống voucher linh hoạt.

## 2. Công nghệ sử dụng

-   **Framework**: [NestJS](https://nestjs.com/)
-   **Ngôn ngữ**: TypeScript
-   **Cơ sở dữ liệu**: MongoDB
-   **Giao tiếp với DB**: Mongoose
-   **Xác thực**: JWT (JSON Web Tokens), Passport.js
-   **API Documentation**: Swagger
-   **Containerization**: Docker (cho MongoDB)

## 3. Cấu trúc thư mục

Dự án được cấu trúc theo module, giúp dễ dàng quản lý và mở rộng.

```
src/
├── app/            # Module gốc của ứng dụng
├── auth/           # Xử lý xác thực, đăng nhập, đăng ký
├── users/          # Quản lý thông tin người dùng
├── products/       # Quản lý sản phẩm
├── cart/           # Quản lý giỏ hàng
├── orders/         # Quản lý đơn hàng
├── vouchers/       # Quản lý hệ thống voucher, mã giảm giá
├── mail/           # Gửi email
├── upload/         # Xử lý tải lên file (hình ảnh)
├── guards/         # Các guards để bảo vệ route
├── strategies/     # Các chiến lược xác thực (JWT, local)
└── ...
```

## 4. Các tính năng chính

-   **Quản lý người dùng & Xác thực**: Đăng ký, đăng nhập, quản lý thông tin cá nhân, phân quyền (admin/user).
-   **Quản lý sản phẩm**: Thêm, sửa, xóa sản phẩm, quản lý biến thể (màu sắc, kích thước), đánh giá sản phẩm.
-   **Quản lý giỏ hàng**: Thêm sản phẩm vào giỏ, cập nhật số lượng, xóa sản phẩm.
-   **Quản lý đơn hàng**: Tạo đơn hàng từ giỏ hàng, áp dụng voucher, tính toán tổng tiền, quản lý trạng thái đơn hàng.
-   **Hệ thống Voucher**:
    -   Hỗ trợ 2 loại: Giảm giá sản phẩm (`item`) và giảm giá phí vận chuyển (`ship`).
    -   Các điều kiện linh hoạt: giá trị đơn hàng tối thiểu, giới hạn giảm giá, số lượng, thời gian hiệu lực.
    -   Chi tiết có thể xem tại `VOUCHER_SYSTEM.md`.
-   **Tải lên hình ảnh**: Tích hợp với dịch vụ lưu trữ (ví dụ: Cloudinary) để quản lý hình ảnh sản phẩm.

## 5. Cài đặt và Khởi chạy

### Yêu cầu

-   [Node.js](https://nodejs.org/) (phiên bản 18.x trở lên)
-   [Docker](https://www.docker.com/)

### Các bước cài đặt

1.  **Clone a repository:**

    ```bash
    git clone <your-repository-url>
    cd server-Drezzup
    ```

2.  **Khởi chạy cơ sở dữ liệu MongoDB:**

    Sử dụng Docker Compose để khởi chạy container MongoDB.

    ```bash
    docker-compose up -d
    ```

    Lệnh này sẽ tạo một container MongoDB chạy ở cổng `27017`.

3.  **Cài đặt các dependencies:**

    ```bash
    npm install
    ```

4.  **Tạo file biến môi trường:**

    Tạo một file `.env` ở thư mục gốc và cấu hình các biến cần thiết, ví dụ như chuỗi kết nối MongoDB và các khóa bí mật.

    ```env
    MONGO_URI=mongodb://admin:password@localhost:27017/ecommerce?authSource=admin
    JWT_SECRET=your_jwt_secret
    JWT_EXPIRATION=3600s
    ```
    *Lưu ý: Thay đổi các giá trị cho phù hợp với môi trường của bạn.*

5.  **Khởi chạy ứng dụng:**

    Chạy ứng dụng ở chế độ phát triển (development mode) với hot-reload.

    ```bash
    npm run start:dev
    ```

    Server sẽ khởi động tại `http://localhost:3000`.

## 6. Tài liệu API

Hệ thống sử dụng Swagger để tạo tài liệu API tự động.

-   **Swagger UI**: Truy cập `http://localhost:3000/api` sau khi khởi động server.
-   **Hướng dẫn chi tiết**: Tham khảo `SWAGGER_API_GUIDE.md` và `VOUCHER_SYSTEM.md` để có ví dụ và giải thích sâu hơn về các API phức tạp.

## 7. Các câu lệnh hữu ích

-   `npm run build`: Build ứng dụng cho môi trường production.
-   `npm run format`: Format code bằng Prettier.
-   `npm run lint`: Lint code bằng ESLint.
-   `npm test`: Chạy unit test.

## 8. Chi tiết về API và Ví dụ

Phần này cung cấp mô tả chi tiết và ví dụ sử dụng cho từng API trong hệ thống.

---

### **8.1. Nhóm API Xác thực (Authentication)**

Quản lý đăng ký, đăng nhập và phiên làm việc của người dùng.
**Controller**: `src/users/controller/auth.controller.ts`

#### **1. Đăng ký tài khoản**

-   **Endpoint**: `POST /auth/register`
-   **Mô tả**: Tạo một tài khoản người dùng mới. Sau khi đăng ký thành công, hệ thống sẽ gửi một email kích hoạt.
-   **Request Body**:
    ```json
    {
      "name": "Nguyen Van A",
      "email": "test@example.com",
      "password": "yourStrongPassword123"
    }
    ```
-   **Response (201 Created)**:
    ```json
    {
      "user": {
        "name": "Nguyen Van A",
        "email": "test@example.com",
        "isActive": false,
        "_id": "60c72b2f9b1e8a001f8e4bde",
        "createdAt": "...",
        "updatedAt": "..."
      },
      "message": "Vui lòng kiểm tra email để kích hoạt tài khoản"
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/auth/register' \
    --header 'Content-Type: application/json' \
    --data-raw '{
      "name": "Nguyen Van A",
      "email": "test@example.com",
      "password": "yourStrongPassword123"
    }'
    ```

#### **2. Kích hoạt tài khoản**

-   **Endpoint**: `POST /auth/activate`
-   **Mô tả**: Kích hoạt tài khoản người dùng thông qua token được gửi trong email.
-   **Request Query Params**:
    -   `userId`: ID của người dùng.
    -   `token`: Token kích hoạt từ email.
-   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Kích hoạt tài khoản thành công"
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/auth/activate?userId=60c72b2f9b1e8a001f8e4bde&token=your_activation_token'
    ```

#### **3. Đăng nhập**

-   **Endpoint**: `POST /auth/login`
-   **Mô tả**: Xác thực người dùng và trả về `accessToken` và `refreshToken`. `accessToken` được dùng để truy cập các tài nguyên được bảo vệ.
-   **Request Body**:
    ```json
    {
      "email": "test@example.com",
      "password": "yourStrongPassword123"
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
      "user": {
        "name": "Nguyen Van A",
        "email": "test@example.com",
        "role": "user"
      },
      "tokens": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/auth/login' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "email": "test@example.com",
        "password": "yourStrongPassword123"
    }'
    ```

#### **4. Lấy thông tin cá nhân (Profile)**

-   **Endpoint**: `GET /auth/profile`
-   **Mô tả**: Lấy thông tin chi tiết của người dùng đang đăng nhập. Yêu cầu phải có `Authorization: Bearer <accessToken>` header.
-   **Request Header**:
    -   `Authorization`: `Bearer <accessToken>`
-   **Response (200 OK)**:
    ```json
    {
      "id": "60c72b2f9b1e8a001f8e4bde",
      "name": "Nguyen Van A",
      "email": "test@example.com",
      "role": "user",
      "addresses": []
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/auth/profile' \
    --header 'Authorization: Bearer your_access_token'
    ```

#### **5. Làm mới Token**

-   **Endpoint**: `POST /auth/refresh`
-   **Mô tả**: Dùng `refreshToken` để lấy một cặp `accessToken` và `refreshToken` mới khi `accessToken` hết hạn.
-   **Request Body**:
    ```json
    {
      "refreshToken": "your_refresh_token_from_login"
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "tokens": {
        "accessToken": "new_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "new_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/auth/refresh' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "refreshToken": "your_refresh_token_from_login"
    }'
    ```

#### **6. Đăng xuất**

-   **Endpoint**: `POST /auth/logout`
-   **Mô tả**: Vô hiệu hóa `refreshToken` của người dùng. Yêu cầu `accessToken`.
-   **Request Header**:
    -   `Authorization`: `Bearer <accessToken>`
-   **Response (200 OK)**:
    ```json
    {
      "success": true
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/auth/logout' \
    --header 'Authorization: Bearer your_access_token'
    ```

---

### **8.2. Nhóm API Quản lý Người dùng (Users)**

Các API này dùng để quản lý thông tin người dùng và các dữ liệu liên quan. Hầu hết yêu cầu quyền Admin, trừ các API liên quan đến địa chỉ mà người dùng có thể tự quản lý.
**Controller**: `src/users/controller/users.controller.ts`

#### **1. Lấy danh sách người dùng (Admin)**

-   **Endpoint**: `GET /users`
-   **Mô tả**: Lấy danh sách tất cả người dùng trong hệ thống với phân trang. Yêu cầu quyền Admin.
-   **Request Query Params**:
    -   `page` (tùy chọn): Số trang (mặc định: 1).
    -   `limit` (tùy chọn): Số lượng người dùng mỗi trang (mặc định: 20).
-   **Response (200 OK)**:
    ```json
    {
      "users": [
        { "id": "...", "name": "User 1", "email": "user1@example.com" },
        { "id": "...", "name": "User 2", "email": "user2@example.com" }
      ],
      "total": 100,
      "page": 1,
      "limit": 20
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/users?page=1&limit=10' \
    --header 'Authorization: Bearer your_admin_access_token'
    ```

#### **2. Thêm địa chỉ cho người dùng**

-   **Endpoint**: `POST /users/:userId/addresses`
-   **Mô tả**: Thêm một địa chỉ giao hàng mới cho người dùng. Người dùng có thể tự thêm địa chỉ cho mình, hoặc Admin có thể thêm cho người dùng khác.
-   **Request Params**:
    -   `userId`: ID của người dùng cần thêm địa chỉ.
-   **Request Body**:
    ```json
    {
      "phone": "0987654321",
      "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
    }
    ```
-   **Response (201 Created)**: Trả về thông tin người dùng đã được cập nhật với địa chỉ mới.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/users/60c72b2f9b1e8a001f8e4bde/addresses' \
    --header 'Authorization: Bearer your_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "phone": "0987654321",
        "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
    }'
    ```

#### **3. Lấy danh sách địa chỉ của người dùng**

-   **Endpoint**: `GET /users/:userId/addresses`
-   **Mô tả**: Lấy tất cả địa chỉ đã lưu của một người dùng.
-   **Request Params**:
    -   `userId`: ID của người dùng.
-   **Response (200 OK)**:
    ```json
    [
      {
        "_id": "60c72c8f9b1e8a001f8e4be0",
        "phone": "0987654321",
        "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
      }
    ]
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/users/60c72b2f9b1e8a001f8e4bde/addresses' \
    --header 'Authorization: Bearer your_access_token'
    ```

#### **4. Cập nhật địa chỉ**

-   **Endpoint**: `PUT /users/:userId/addresses/:addressId`
-   **Mô tả**: Cập nhật thông tin một địa chỉ cụ thể của người dùng.
-   **Request Params**:
    -   `userId`: ID của người dùng.
    -   `addressId`: ID của địa chỉ cần cập nhật.
-   **Request Body**:
    ```json
    {
      "phone": "0123456789",
      "address": "456 Đường XYZ, Phường ABC, Quận 2, TP.HCM"
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request PUT 'http://localhost:3000/api/users/60c72b2f9b1e8a001f8e4bde/addresses/60c72c8f9b1e8a001f8e4be0' \
    --header 'Authorization: Bearer your_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "phone": "0123456789",
        "address": "456 Đường XYZ, Phường ABC, Quận 2, TP.HCM"
    }'
    ```

#### **5. Xóa địa chỉ**

-   **Endpoint**: `DELETE /users/:userId/addresses/:addressId`
-   **Mô tả**: Xóa một địa chỉ của người dùng.
-   **Request Params**:
    -   `userId`: ID của người dùng.
    -   `addressId`: ID của địa chỉ cần xóa.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request DELETE 'http://localhost:3000/api/users/60c72b2f9b1e8a001f8e4bde/addresses/60c72c8f9b1e8a001f8e4be0' \
    --header 'Authorization: Bearer your_access_token'
    ```

---

### **8.3. Nhóm API Quản lý Sản phẩm (Products)**

Các API công khai để xem sản phẩm và các API yêu cầu quyền Admin để quản lý sản phẩm.
**Controller**: `src/products/controller/products.controller.ts`

#### **1. Lấy danh sách sản phẩm**

-   **Endpoint**: `GET /products`
-   **Mô tả**: Lấy danh sách sản phẩm công khai, hỗ trợ tìm kiếm theo từ khóa và phân trang.
-   **Request Query Params**:
    -   `keyword` (tùy chọn): Từ khóa tìm kiếm trong tên sản phẩm.
    -   `page` (tùy chọn): Số trang.
    -   `limit` (tùy chọn): Số lượng sản phẩm mỗi trang.
-   **Response (200 OK)**:
    ```json
    {
      "products": [
        {
          "_id": "60d0fe4f5311236168a109ca",
          "name": "Áo Thun Cao Cấp",
          "price": 350000,
          "images": ["/uploads/image1.jpg"],
          "rating": 4.5
        }
      ],
      "page": 1,
      "limit": 10,
      "total": 50
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/products?keyword=áo&page=1'
    ```

#### **2. Lấy chi tiết sản phẩm**

-   **Endpoint**: `GET /products/:id`
-   **Mô tả**: Lấy thông tin chi tiết của một sản phẩm, bao gồm cả các biến thể (màu sắc, kích thước) và các đánh giá.
-   **Request Params**:
    -   `id`: ID của sản phẩm.
-   **Response (200 OK)**:
    ```json
    {
      "_id": "60d0fe4f5311236168a109ca",
      "name": "Áo Thun Cao Cấp",
      "description": "Chất liệu cotton thoáng mát...",
      "price": 350000,
      "variants": [
        {
          "color": "Đen",
          "sizes": [
            { "size": "M", "stock": 50 },
            { "size": "L", "stock": 30 }
          ]
        }
      ],
      "reviews": [
        { "userName": "Khách Hàng A", "rating": 5, "comment": "Sản phẩm tuyệt vời!" }
      ]
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/products/60d0fe4f5311236168a109ca'
    ```

#### **3. Tạo sản phẩm (Admin)**

-   **Endpoint**: `POST /products`
-   **Mô tả**: Tạo một sản phẩm mới. Endpoint này sử dụng `multipart/form-data` để có thể tải lên hình ảnh cùng lúc. Yêu cầu quyền Admin.
-   **Request Body (`multipart/form-data`)**:
    -   `name`: Tên sản phẩm
    -   `description`: Mô tả
    -   `price`: Giá
    -   `variants`: Chuỗi JSON chứa thông tin biến thể.
    -   `images`: Các tệp hình ảnh.
-   **Ví dụ cURL** (sử dụng chuỗi JSON cho `variants`):
    ```bash
    curl --location --request POST 'http://localhost:3000/api/products' \
    --header 'Authorization: Bearer your_admin_access_token' \
    --form 'name="Áo Sơ Mi Nam"' \
    --form 'price="450000"' \
    --form 'description="Vải lụa, không nhăn."' \
    --form 'variants="[{\"color\":\"Trắng\",\"sizes\":[{\"size\":\"M\",\"stock\":20},{\"size\":\"L\",\"stock\":15}]}]"' \
    --form 'images=@"/path/to/your/image1.jpg"' \
    --form 'images=@"/path/to/your/image2.jpg"'
    ```

#### **4. Thêm đánh giá cho sản phẩm**

-   **Endpoint**: `PUT /products/:id/review`
-   **Mô tả**: Cho phép người dùng đã đăng nhập và đã mua sản phẩm để lại đánh giá.
-   **Request Params**:
    -   `id`: ID của sản phẩm cần đánh giá.
-   **Request Body**:
    ```json
    {
      "rating": 5,
      "comment": "Chất vải đẹp, giao hàng nhanh."
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request PUT 'http://localhost:3000/api/products/60d0fe4f5311236168a109ca/review' \
    --header 'Authorization: Bearer your_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "rating": 5,
        "comment": "Chất vải đẹp, giao hàng nhanh."
    }'
    ```

---

### **8.4. Nhóm API Quản lý Giỏ hàng (Cart)**

Các API này cho phép người dùng đã đăng nhập quản lý giỏ hàng của họ. Mọi API trong nhóm này đều yêu cầu xác thực.
**Controller**: `src/cart/controller/cart.controller.ts`

#### **1. Lấy thông tin giỏ hàng**

-   **Endpoint**: `GET /cart`
-   **Mô tả**: Lấy toàn bộ các mặt hàng hiện có trong giỏ hàng của người dùng đang đăng nhập.
-   **Response (200 OK)**:
    ```json
    {
      "items": [
        {
          "sizeId": "60d0fe4f5311236168a109cc",
          "name": "Áo Thun Cao Cấp - Đen - M",
          "qty": 2,
          "price": 350000,
          "image": "/uploads/image1.jpg",
          "product": "60d0fe4f5311236168a109ca"
        }
      ],
      "subtotal": 700000
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/cart' \
    --header 'Authorization: Bearer your_access_token'
    ```

#### **2. Thêm sản phẩm vào giỏ**

-   **Endpoint**: `POST /cart/items`
-   **Mô tả**: Thêm một sản phẩm (với một size cụ thể) vào giỏ hàng. Nếu sản phẩm đã tồn tại, số lượng sẽ được cập nhật.
-   **Request Body**:
    ```json
    {
      "sizeId": "60d0fe4f5311236168a109cc",
      "qty": 1
    }
    ```
    - `sizeId`: ID của biến thể size (đại diện cho một sản phẩm cụ thể, ví dụ: Áo Thun Đen size M).
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/cart/items' \
    --header 'Authorization: Bearer your_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "sizeId": "60d0fe4f5311236168a109cc",
        "qty": 1
    }'
    ```

#### **3. Cập nhật số lượng sản phẩm**

-   **Endpoint**: `PUT /cart/items/:sizeId`
-   **Mô tả**: Cập nhật số lượng cho một mặt hàng đã có trong giỏ.
-   **Request Params**:
    -   `sizeId`: ID của biến thể size cần cập nhật.
-   **Request Body**:
    ```json
    {
      "qty": 3
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request PUT 'http://localhost:3000/api/cart/items/60d0fe4f5311236168a109cc' \
    --header 'Authorization: Bearer your_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "qty": 3
    }'
    ```

#### **4. Xóa một mặt hàng khỏi giỏ**

-   **Endpoint**: `DELETE /cart/items/:sizeId`
-   **Mô tả**: Xóa một mặt hàng khỏi giỏ hàng dựa trên `sizeId`.
-   **Request Params**:
    -   `sizeId`: ID của biến thể size cần xóa.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request DELETE 'http://localhost:3000/api/cart/items/60d0fe4f5311236168a109cc' \
    --header 'Authorization: Bearer your_access_token'
    ```

#### **5. Xóa toàn bộ giỏ hàng**

-   **Endpoint**: `DELETE /cart`
-   **Mô tả**: Xóa tất cả các mặt hàng khỏi giỏ hàng, làm trống giỏ hàng.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request DELETE 'http://localhost:3000/api/cart' \
    --header 'Authorization: Bearer your_access_token'
    ```

---

### **8.5. Nhóm API Quản lý Đơn hàng (Orders)**

Các API để tạo, xem và quản lý trạng thái của đơn hàng.
**Controller**: `src/orders/controller/orders.controller.ts`

#### **1. Tạo đơn hàng mới**

-   **Endpoint**: `POST /orders`
-   **Mô tả**: Tạo một đơn hàng mới từ các sản phẩm trong giỏ hàng, áp dụng địa chỉ giao hàng và các mã voucher. API sẽ tự động tính toán tổng tiền cuối cùng.
-   **Request Body**:
    ```json
    {
      "items": [
        { "sizeId": "60d0fe4f5311236168a109cc", "quantity": 2 }
      ],
      "addressId": "60c72c8f9b1e8a001f8e4be0",
      "vouchers": ["60d21b4f2c8b2a001f8e4bdf"],
      "shipCost": 30000,
      "payment": "COD",
      "atStore": false
    }
    ```
    - `items`: Mảng các sản phẩm muốn mua.
    - `addressId`: ID của địa chỉ giao hàng đã lưu.
    - `vouchers`: Mảng các ID của voucher muốn áp dụng.
    - `payment`: Phương thức thanh toán (`COD` hoặc `payOS`).
    - `atStore`: `true` nếu mua tại cửa hàng (không tính phí ship).
-   **Response (201 Created)**: Trả về chi tiết đơn hàng đã được tạo.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/orders' \
    --header 'Authorization: Bearer your_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "items": [{ "sizeId": "60d0fe4f5311236168a109cc", "quantity": 2 }],
        "addressId": "60c72c8f9b1e8a001f8e4be0",
        "vouchers": ["60d21b4f2c8b2a001f8e4bdf"],
        "shipCost": 30000,
        "payment": "COD",
        "atStore": false
    }'
    ```

#### **2. Lấy lịch sử mua hàng**

-   **Endpoint**: `GET /orders/myorders`
-   **Mô tả**: Lấy danh sách tất cả các đơn hàng của người dùng đang đăng nhập.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/orders/myorders' \
    --header 'Authorization: Bearer your_access_token'
    ```

#### **3. Lấy chi tiết đơn hàng**

-   **Endpoint**: `GET /orders/:id`
-   **Mô tả**: Lấy thông tin chi tiết của một đơn hàng cụ thể. Người dùng có thể xem đơn hàng của mình, Admin có thể xem mọi đơn hàng.
-   **Request Params**:
    -   `id`: ID của đơn hàng.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/orders/60d21c4f2c8b2a001f8e4be1' \
    --header 'Authorization: Bearer your_access_token'
    ```

#### **4. Cập nhật trạng thái đơn hàng (Admin)**

-   **Endpoint**: `PUT /orders/:id/status`
-   **Mô tả**: Cập nhật trạng thái của đơn hàng. Ví dụ: `pending`, `confirmed`, `shipping`, `delivered`, `cancelled`. Yêu cầu quyền Admin.
-   **Request Params**:
    -   `id`: ID của đơn hàng cần cập nhật.
-   **Request Body**:
    ```json
    {
      "status": "shipping"
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request PUT 'http://localhost:3000/api/orders/60d21c4f2c8b2a001f8e4be1/status' \
    --header 'Authorization: Bearer your_admin_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "status": "shipping"
    }'
    ```

---

### **8.6. Nhóm API Quản lý Voucher**

Các API để tạo và quản lý hệ thống mã giảm giá phức tạp, bao gồm cả việc kiểm tra và tính toán chiết khấu.
**Controller**: `src/vouchers/controller/vouchers.controller.ts`

#### **1. Tạo voucher mới (Admin)**

-   **Endpoint**: `POST /vouchers`
-   **Mô tả**: Tạo một voucher giảm giá mới. Yêu cầu quyền Admin.
-   **Request Body**:
    ```json
    {
      "type": "item",
      "disCount": 10,
      "condition": 500000,
      "limit": 100000,
      "stock": 50,
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.999Z",
      "userIds": ["60c72b2f9b1e8a001f8e4bde"]
    }
    ```
    - `type`: `item` (giảm giá sản phẩm) hoặc `ship` (giảm giá vận chuyển).
    - `disCount`: % giảm giá.
    - `condition`: Giá trị đơn hàng tối thiểu để áp dụng.
    - `limit`: Mức giảm giá tối đa.
    - `userIds` (tùy chọn): Mảng ID người dùng được phép sử dụng.
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/vouchers' \
    --header 'Authorization: Bearer your_admin_access_token' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "type": "item", "disCount": 10, "condition": 500000, "limit": 100000, "stock": 50
    }'
    ```

#### **2. Lấy danh sách voucher đang hoạt động**

-   **Endpoint**: `GET /vouchers/active`
-   **Mô tả**: Lấy danh sách các voucher mà người dùng có thể sử dụng (còn hạn, còn số lượng).
-   **Ví dụ cURL**:
    ```bash
    curl --location --request GET 'http://localhost:3000/api/vouchers/active'
    ```

#### **3. Kiểm tra và tính toán một voucher**

-   **Endpoint**: `POST /vouchers/:id/check`
-   **Mô tả**: Kiểm tra xem một voucher có hợp lệ với một đơn hàng cụ thể (dựa trên tổng tiền hàng và phí ship) hay không, và trả về mức giảm giá có thể nhận được.
-   **Request Params**:
    -   `id`: ID của voucher cần kiểm tra.
-   **Request Body**:
    ```json
    {
      "userId": "60c72b2f9b1e8a001f8e4bde",
      "subtotal": 1200000,
      "shipCost": 30000
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
        "valid": true,
        "itemDiscount": 100000,
        "shipDiscount": 0,
        "message": "Voucher hợp lệ"
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/vouchers/60d21b4f2c8b2a001f8e4bdf/check' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "userId": "60c72b2f9b1e8a001f8e4bde",
        "subtotal": 1200000,
        "shipCost": 30000
    }'
    ```

#### **4. Tính toán chiết khấu cho nhiều voucher**

-   **Endpoint**: `POST /vouchers/calculate-discounts`
-   **Mô tả**: Tính toán tổng hợp mức giảm giá khi áp dụng nhiều voucher cùng lúc, phân biệt rõ voucher hợp lệ và không hợp lệ.
-   **Request Body**:
    ```json
    {
      "userId": "60c72b2f9b1e8a001f8e4bde",
      "subtotal": 1200000,
      "shipCost": 30000,
      "voucherIds": [
        "60d21b4f2c8b2a001f8e4bdf", 
        "60d21b5f2c8b2a001f8e4be0"
      ]
    }
    ```
-   **Response (200 OK)**:
    ```json
    {
      "totalItemDiscount": 100000,
      "totalShipDiscount": 15000,
      "validVouchers": [
        { "voucherId": "60d21b4f2c8b2a001f8e4bdf", "itemDiscount": 100000, "shipDiscount": 0 },
        { "voucherId": "60d21b5f2c8b2a001f8e4be0", "itemDiscount": 0, "shipDiscount": 15000 }
      ],
      "errors": [],
      "finalTotal": 1115000
    }
    ```
-   **Ví dụ cURL**:
    ```bash
    curl --location --request POST 'http://localhost:3000/api/vouchers/calculate-discounts' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "userId": "60c72b2f9b1e8a001f8e4bde",
        "subtotal": 1200000,
        "shipCost": 30000,
        "voucherIds": ["60d21b4f2c8b2a001f8e4bdf", "60d21b5f2c8b2a001f8e4be0"]
    }'
    ```

</rewritten_file> 