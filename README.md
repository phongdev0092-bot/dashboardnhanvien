# 📊 Dashboard Quản Lý Thông Tin Nhân Viên (Google Sheets Live)

Một ứng dụng Web Dashboard hiện đại được xây dựng bằng **Python (FastAPI)** kết hợp **Tailwind CSS** và **shadcn/ui design tokens**, tự động đồng bộ và đọc dữ liệu trực tiếp từ **Google Sheets**, hỗ trợ đầy đủ các thao tác **Thêm, Sửa, Xóa (CRUD)** nhân viên.

---

## 🌟 Tính Năng Nổi Bật

### 1. Đồng Bộ & Xử Lý Dữ Liệu Thông Minh
- **Nguồn dữ liệu:** Kết nối trực tiếp tới Google Sheet qua API Export CSV (`gid=32204814`).
- **Cơ chế Cache:** Tự động lưu cache 5 phút để tối ưu tốc độ và giảm request đến Google.
- **Nút "Làm mới dữ liệu":** Bỏ qua cache và cập nhật tức thì dữ liệu mới nhất từ Google Sheets.
- **Giữ nguyên định dạng chuỗi (`dtype=str`):** Không làm mất số `0` ở đầu của Số điện thoại, CMND/CCCD, Mã nhân viên.
- **Tự động làm sạch dữ liệu:** Trim khoảng trắng thừa, xóa dòng rỗng, chuẩn hóa tên cột.
- **Xử lý lỗi quyền truy cập:** Hiển thị thông báo và hướng dẫn chi tiết nếu Google Sheet chưa được mở quyền xem công khai.

### 2. Thao Tác Quản Lý Nhân Viên: Thêm / Sửa / Xóa (CRUD Mới)
- **Nút "Thêm nhân viên":** Đặt nổi bật ở thanh công cụ phía trên. Bấm vào sẽ mở Dialog form chuẩn shadcn/ui để nhập liệu 30 trường (có chia 4 nhóm khoa học: Cá nhân, Công việc, Tài khoản, Đội trưởng).
- **Nút "Sửa" (Icon bút chì):** Có sẵn ở cột Thao tác trên từng dòng của bảng và ngay trong Dialog xem chi tiết nhân viên. Mở form chỉnh sửa với đầy đủ dữ liệu điền sẵn.
- **Nút "Xóa" (Icon thùng rác đỏ):** Có ở từng dòng và trong Dialog chi tiết. Mở Dialog cảnh báo xác nhận (AlertDialog) trước khi thực hiện xóa.
- **Lưu trữ thay đổi cục bộ (`data/local_mutations.json`):** Mọi thao tác Thêm, Sửa, Xóa đều được lưu trữ an toàn, bảo toàn ngay cả khi bạn tải lại trang hoặc khởi động lại server.
- **API hoàn chỉnh:** 
  - `POST /api/employees` (Thêm)
  - `PUT /api/employees/{id}` (Sửa)
  - `DELETE /api/employees/{id}` (Xóa)
  - `POST /api/employees/reset` (Khôi phục dữ liệu gốc từ Google Sheets)

### 3. Giao Diện Chuẩn shadcn/ui
- **Design Tokens chuẩn:** Sử dụng các biến CSS `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--radius` (0.5rem), đổ bóng nhẹ và viền mảnh tinh tế.
- **Chế độ Sáng / Tối (Dark/Light Mode):** Nút chuyển đổi nhanh góc phải header, lưu lựa chọn vào `localStorage`, mặc định vào là chế độ Sáng với hiệu ứng chuyển màu mượt mà.
- **Responsive toàn diện:** Hiển thị tối ưu trên Desktop, Tablet và Mobile.
- **Icon Lucide:** Tinh gọn, đồng nhất và hiện đại.

### 4. Thẻ Thống Kê Năng Động (Stat Cards)
- **Thẻ Hero:** Tổng số nhân viên (tự động cập nhật theo bộ lọc dạng `X / Tổng`).
- **Thẻ Đang làm việc:** Nhân viên chưa có *Ngày làm Việc Cuối*.
- **Thẻ Đã nghỉ việc:** Nhân viên đã có *Ngày làm Việc Cuối*.
- **Thẻ Tài khoản hoạt động:** Nhân viên có tình trạng tài khoản hoạt động.
- **Thẻ Số vùng:** Tổng số khu vực/vùng phân bổ.

### 5. Tìm Kiếm & Lọc Nâng Cao
- **Tìm kiếm đa năng:** Tìm kiếm tức thời trên Họ Tên NV, Mã NV, Email, Số điện thoại, Inside Account.
- **Hỗ trợ tiếng Việt không dấu:** Tìm `nguyen van a` vẫn ra `Nguyễn Văn A`.
- **7 Dropdown bộ lọc tự động:** Lấy giá trị duy nhất từ dữ liệu thực tế (Vùng, Đối tác, Block, Chức danh, Tình trạng Hợp đồng, Tình trạng Tài khoản, Loại HĐLĐ).
- **Nút "Xóa bộ lọc":** Đặt lại toàn bộ tìm kiếm và dropdown về mặc định chỉ với 1 click.

### 6. Bảng Dữ Liệu Chuyên Nghiệp (Data Table)
- **Cố định 2 cột đầu (Sticky Columns):** Cột **STT** và **Họ Tên NV** luôn cố định bên trái khi cuộn ngang.
- **Cố định Header (Sticky Header):** Tiêu đề bảng cố định khi cuộn dọc.
- **Bật/Tắt Cột hiển thị:** Dropdown checkbox cho phép tùy chỉnh hiển thị bất kỳ cột nào trong 30 cột. Cấu hình được lưu tự động vào `localStorage`.
- **Sắp xếp linh hoạt:** Bấm tiêu đề cột để sắp xếp tăng/giảm (hỗ trợ sắp xếp số cho STT và chữ cho tên).
- **Badge trạng thái thông minh:** Màu xanh cho hoạt động/còn hiệu lực, màu đỏ cho khóa/hết hạn/chấm dứt, màu vàng cho thử việc/chờ gia hạn.
- **Avatar tự động:** Hiển thị ảnh chân dung nếu có link ảnh; nếu trống tự sinh avatar chữ cái đầu với màu sắc trang nhã.
- **Liên kết tiện ích:** Bấm vào số điện thoại gọi ngay (`tel:`), bấm vào email gửi thư (`mailto:`), bấm tọa độ mở Google Maps (`maps.google.com`).
- **Phân trang:** Tùy chọn 10, 25, 50, 100 dòng mỗi trang.
- **Xuất CSV:** Xuất toàn bộ dữ liệu đang được lọc kèm UTF-8 BOM hiển thị chuẩn tiếng Việt trên Microsoft Excel (loại bỏ Password vì lý do bảo mật).

### 7. Bảo Mật & Xem Chi Tiết
- **Dialog chi tiết nhân viên (30 trường):** Chia làm 4 khối rõ ràng:
  1. *Thông tin cá nhân* (Họ tên, CMND, Địa chỉ, Email, SĐT, Tọa độ...)
  2. *Công việc & Phân công* (Vùng, Đối tác, Block, Chức danh, Điều hành, Loại HĐLĐ, Phân công, Tính lương...)
  3. *Tài khoản & Phân quyền* (Inside Account, Password, Mobisale, Roles...)
  4. *Đội trưởng & Hỗ trợ* (Hỗ trợ, Đội trưởng, SĐT FRT...)
- **Bảo vệ dữ liệu nhạy cảm:**
  - Cột `Password` **không bao giờ** xuất hiện trên bảng chính hoặc file CSV xuất ra.
  - Cột `Password` và `CMND` mặc định được che (`••••••••` và `••••••••123`).
  - Trong Dialog chi tiết, có icon con mắt để bật/tắt xem rõ CMND.
  - Biến môi trường `SHOW_SENSITIVE=false`: ẩn mật khẩu hoàn toàn khỏi mọi người dùng.
- **Mật khẩu truy cập Dashboard:** Hỗ trợ cấu hình `DASHBOARD_PASSWORD` trong `.env` để yêu cầu đăng nhập trước khi vào xem.

---

## 📁 Cấu Trúc Dự Án

```
d:\BOT\
├── main.py                     # FastAPI application chính & API routes (kèm CRUD API)
├── run.bat                     # File khởi động 1-click cho Windows
├── requirements.txt            # Danh sách thư viện Python
├── .env.example                # File mẫu cấu hình môi trường
├── .env                        # File cấu hình môi trường thực tế
├── README.md                   # Hướng dẫn chi tiết
├── data/
│   └── local_mutations.json    # Lưu trữ các thay đổi Thêm/Sửa/Xóa cục bộ
├── sample_data/
│   └── employees_sample.csv    # Dữ liệu mẫu dự phòng khi offline
├── services/
│   ├── __init__.py
│   └── sheets.py               # Xử lý kết nối Google Sheets, cache, chuẩn hóa dữ liệu & CRUD logic
├── static/
│   ├── css/
│   │   └── style.css           # shadcn/ui tokens & custom styles
│   └── js/
│       └── app.js              # Xử lý giao diện, tìm kiếm, lọc, render, modals Thêm/Sửa/Xóa, xuất CSV
└── templates/
    ├── base.html               # Layout gốc (header, theme toggle, footer)
    ├── dashboard.html          # Trang dashboard chính (Stat cards, Filters, Table, Modals)
    └── login.html              # Màn hình đăng nhập (khi bật bảo vệ mật khẩu)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trên Windows

### Cách 1: Khởi động nhanh với `run.bat` (Khuyên dùng)
Chỉ cần nhấp đúp (Double-click) vào file **`run.bat`**. 
Script sẽ tự động:
1. Kiểm tra Python.
2. Tạo file `.env` nếu chưa có.
3. Cài đặt các thư viện cần thiết.
4. Tự động mở trình duyệt web tại địa chỉ `http://127.0.0.1:8000`.

---

### Cách 2: Chạy thủ công qua Terminal (PowerShell / Command Prompt)

**Bước 1: Mở thư mục dự án**
```powershell
cd d:\BOT
```

**Bước 2: Cài đặt các thư viện**
```powershell
pip install -r requirements.txt
```

**Bước 3: Khởi chạy máy chủ**
```powershell
python main.py
```

**Bước 4: Mở trình duyệt**
Truy cập: [http://127.0.0.1:8000](http://127.0.0.1:8000)
