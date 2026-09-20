# 🩺 HỆ THỐNG PHÂN TÍCH XÉT NGHIỆM CẬN LÂM SÀNG & TRỢ LÝ BÁC SĨ AI (CHUẨN BỘ Y TẾ)

Ứng dụng thông minh hỗ trợ nhân viên y tế và người bệnh nhận diện tự động kết quả phiếu xét nghiệm (qua ảnh chụp, tài liệu viết tay, file PDF), chuẩn hóa đơn vị đo lường, đối chiếu khoảng tham chiếu an toàn, biện luận tích hợp Đông - Tây Y chuyên sâu, và tư vấn trực tuyến phong cách Zalo theo chuẩn Hướng dẫn của Bộ Y tế Việt Nam.

---

## ✨ Tính Năng Nổi Bật

1. **📷 Nhận diện OCR Thông Minh Đa Định Dạng:**
   - Đọc kết quả từ ảnh chụp điện thoại (kể cả ảnh chụp nghiêng, ngược sáng, phiếu nhăn).
   - Nhận diện chính xác chữ viết tay của bác sĩ/kỹ thuật viên (kể cả chữ viết tay mờ, nét đứt).
   - Đọc file văn bản PDF gốc đa trang trực tiếp mà không làm mất dữ liệu.

2. **⚖️ Tự Động Chuẩn Hóa Đơn Vị & Quy Đổi Y Khoa:**
   - Tự động quy đổi đơn vị tương thích (ví dụ: Glucose mg/dL sang mmol/L, HCT L/L sang %, Protein mg/dL sang g/L...).
   - Tự động nhận diện dải đo đặc thù (Urobilinogen nước tiểu µmol/L chuẩn sinh lý).
   - Cảnh báo an toàn nếu phát hiện đơn vị không tương thích hoặc nghi ngờ nhầm lẫn cột tham chiếu.

3. **📊 Báo Cáo Biện Luận Tích Hợp Đông - Tây Y Toàn Diện (Đủ 5 Mục):**
   - **Mục 1:** Hồ sơ, chẩn đoán sơ bộ & Tổng quan lâm sàng.
   - **Mục 2:** Biện luận chi tiết theo Tây Y (Bảng tổng hợp chỉ số, phân tích cơ chế bệnh sinh dòng tế bào, men gan, thận, điện giải, đông máu, u bướu, tuyến giáp...).
   - **Mục 3:** Biện chứng luận trị theo Đông Y (Hội chứng bệnh học Tý, Can uất, Khí huyết hư, Tỳ thận hư; học thuyết Âm Dương - Tạng Phủ).
   - **Mục 4:** Chế độ dinh dưỡng khoa học & Bài thuốc Dược thiện lành tính giao thoa Đông - Tây Y.
   - **Mục 5:** Khuyến nghị cận lâm sàng bổ sung chuyên sâu (Phân tách rõ: A - Xét nghiệm máu/nước tiểu chuyên biệt, B - Chẩn đoán hình ảnh siêu âm/ECG/FibroScan, C - Phân tầng ưu tiên 1/2/3, D - Chuyên khoa đề xuất).

4. **💬 Trợ Lý Bác Sĩ Tư Vấn Trực Tuyến Phong Cách Zalo:**
   - Nút bấm nổi (Floating Widget) tiện lợi ở góc dưới bên phải màn hình.
   - Giao diện thân thuộc như Zalo: Header xanh đặc trưng, tích xanh xác thực, avatar bác sĩ trực tuyến, khung chat và bong bóng tin nhắn chuẩn Zalo.
   - Phản hồi ngắn gọn, súc tích (3-5 gạch đầu dòng), căn cứ 100% theo Hướng dẫn chẩn đoán và điều trị của Bộ Y tế Việt Nam.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local)

### Yêu Cầu Tiên Quyết:
- Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
- Khóa API Google Gemini (Nhận miễn phí tại: [Google AI Studio](https://aistudio.google.com/app/apikey)).

### Các Bước Thực Hiện:
1. **Clone hoặc tải mã nguồn về máy:**
   ```bash
   git clone https://github.com/<tai-khoan-cua-ban>/<ten-repository>.git
   cd <ten-repository>
   ```

2. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

3. **Tạo file cấu hình môi trường:**
   Tạo file `.env` tại thư mục gốc của dự án với nội dung:
   ```env
   GEMINI_API_KEY=dien_khoa_api_gemini_cua_ban_vao_day
   PORT=3000
   ```

4. **Khởi động ứng dụng:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt và truy cập: `http://localhost:3000`

---

## 🌐 Hướng Dẫn Đưa Lên GitHub & Vercel (Để Chia Sẻ Miễn Phí)

### BƯỚC 1: Đưa Dự Án Lên GitHub

1. **Cài đặt Git** (nếu máy tính chưa có):
   - Mở PowerShell và chạy:
     ```powershell
     winget install --id Git.Git -e --source winget
     ```
   - Hoặc tải bộ cài đặt tại: [git-scm.com/download/win](https://git-scm.com/download/win).
   - *Lưu ý: Bạn cũng có thể dùng phần mềm giao diện [GitHub Desktop](https://desktop.github.com/) nếu không quen dùng dòng lệnh.*

2. **Tạo một Repository mới trên GitHub:**
   - Đăng nhập vào [GitHub](https://github.com/).
   - Bấm nút **"New"** (hoặc dấu `+` ở góc trên cùng bên phải ➔ **New repository**).
   - Đặt tên Repository (ví dụ: `phan-tich-xet-nghiem-can-lam-sang`).
   - Chọn chế độ **Public** (để chia sẻ cho mọi người) hoặc **Private**.
   - **Không** tích chọn "Add a README file" (vì dự án đã có sẵn file README).
   - Bấm **"Create repository"**.

3. **Đẩy mã nguồn từ máy tính lên GitHub:**
   Mở cửa sổ PowerShell/Terminal ngay tại thư mục dự án và chạy lần lượt các lệnh sau:
   ```bash
   git init
   git add .
   git commit -m "Khoi tao he thong phan tich xet nghiem can lam sang"
   git branch -M main
   git remote add origin https://github.com/<ten-tai-khoan-github-cua-ban>/<ten-repository>.git
   git push -u origin main
   ```
   *(Thay `<ten-tai-khoan-github-cua-ban>` và `<ten-repository>` bằng thông tin thật của bạn trên GitHub).*

---

### BƯỚC 2: Triển Khai Lên Vercel (Hoàn Toàn Miễn Phí)

1. **Đăng nhập Vercel:**
   - Truy cập vào [vercel.com](https://vercel.com/) và bấm **Sign Up** (hoặc **Log In**).
   - Chọn **"Continue with GitHub"** để liên kết trực tiếp với tài khoản GitHub của bạn.

2. **Import Dự Án:**
   - Tại trang bảng điều khiển (Dashboard) của Vercel, bấm nút **"Add New..."** ở góc trên bên phải ➔ Chọn **"Project"**.
   - Tìm repository vừa tạo (ví dụ: `phan-tich-xet-nghiem-can-lam-sang`) và bấm nút **"Import"**.

3. **Cấu Hình Dự Án Trên Vercel:**
   - **Framework Preset:** Giữ mặc định là `Vite`.
   - **Root Directory:** Giữ nguyên `./`.
   - **Environment Variables (Cực kỳ quan trọng):**
     - Mở mục **Environment Variables**.
     - Nhập `Key`: `GEMINI_API_KEY`
     - Nhập `Value`: `<Dán mã khóa API Gemini của bạn vào đây>`
     - Bấm **"Add"**.

4. **Triển Khai (Deploy):**
   - Bấm nút **"Deploy"**.
   - Chờ khoảng 1 đến 2 phút để Vercel tự động đóng gói ứng dụng.
   - Khi hoàn tất, màn hình sẽ chúc mừng và cung cấp đường link công khai có dạng:
     👉 **`https://phan-tich-xet-nghiem-can-lam-sang.vercel.app`**
   - Giờ đây, bạn có thể gửi link này cho đồng nghiệp, bác sĩ hoặc bệnh nhân dùng trực tiếp trên mọi thiết bị (máy tính, điện thoại iPhone, Android) mượt mà 24/7!

---

## 🔒 Bảo Mật & Lưu Ý Quan Trọng

- File `.gitignore` đã được cấu hình tự động loại trừ các file bí mật (`.env`, `node_modules/`, `dist/`), đảm bảo API Key của bạn không bao giờ bị lộ lên GitHub.
- Dự án hỗ trợ cả việc người dùng tự cấu hình API Key cá nhân trực tiếp trên giao diện (nút Cấu hình AI ở góc trên) để chia sẻ chi phí/tài nguyên nếu cần.
- **Tuyên bố y khoa:** Toàn bộ thông tin từ AI chỉ mang tính định hướng tham khảo chuyên môn, không thay thế chẩn đoán lâm sàng và chỉ định y khoa trực tiếp của bác sĩ điều trị.