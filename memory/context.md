# SYSTEM PROMPT: RANDOM CHAT MVP WITH AI ICEBREAKERS

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

Xây dựng ứng dụng web "Anonymous Random Chat" (MVP).

- **Mục tiêu:** Kết nối 2 người lạ để nhắn tin văn bản thời gian thực.
- **Tính năng đặc biệt:** Tích hợp AI để gợi ý 3 câu mở lời (Icebreakers) ngay khi bắt đầu cuộc trò chuyện.
- **Công nghệ:** React + React Router (Frontend), Node.js + Socket.io (Backend), Redis (Matching), Python (AI Service).

---

## IMPLEMENTATION STATUS

### ✅ Completed Features

#### 1. Authentication System (Google OAuth with @react-oauth/google)

- **Frontend:**
  - `client/contexts/AuthContext.tsx` - Auth context with `useGoogleLogin` hook (Authorization Code Flow)
  - `client/pages/Index.tsx` - Auto-redirect to profile if incomplete
  - `client/App.tsx` - Wrapped with `GoogleOAuthProvider`

- **Backend:**
  - `server/routes/auth.ts` - OAuth token exchange with Google APIs
  - Real OAuth implementation (not mock)
  - Session management with httpOnly cookies
  - PostgreSQL database integration

- **Shared Types:**
  - `shared/auth.ts` - User, UserPreferences, AuthResponse interfaces

#### 2. Profile Setup System

- **Frontend:**
  - `client/pages/Profile.tsx` - Profile form with gender & chat style selection
  - First-time user flow: Login → Profile → Chat
  - Returning users go directly to chat

- **Backend:**
  - User preferences stored in database
  - Profile completion tracking

#### 3. Database Layer (PostgreSQL + Knex)

- **Setup:**
  - `server/db.ts` - Knex database connection
  - `server/knexfile.ts` - Knex configuration
  - `server/migrations/` - Database schema migrations
  - `DATABASE_SETUP.md` - Setup instructions

- **Schema:**
  - `users` - Google OAuth user data
  - `user_preferences` - Gender, chat style, interests
  - `sessions` - Active user sessions with expiry

- **Scripts:**
  - `pnpm db:migrate` - Run migrations
  - `pnpm db:rollback` - Rollback migrations

### 📋 Pending Features

#### UC1: Tìm kiếm & Ghép đôi (Find & Match)

- Socket.io integration
- Queue management with Redis
- Matching algorithm

#### UC2: Khởi tạo với AI Icebreaker (AI Initialization)

- Python AI service integration
- Icebreaker generation API
- Frontend display of icebreakers

#### UC3: Gửi tin nhắn & Sử dụng Icebreaker

- Real-time messaging with Socket.io
- Optimistic UI updates
- Icebreaker click-to-send functionality

#### UC4: Bỏ qua & Tìm mới (Skip & Next)

- Skip/Next button functionality
- Session cleanup
- Re-queue mechanism

---

## 2. USE CASES CHI TIẾT (DETAILED USE CASES)

### UC1: Tìm kiếm & Ghép đôi (Find & Match)

- **Actor:** Người dùng (Guest).
- **Trigger:** Người dùng bấm nút "Bắt đầu Chat" (Start Chat) hoặc "Tìm người lạ" (Find Stranger).
- **Flow:**
  1. Frontend gửi sự kiện `join_queue` qua Socket.io.
  2. Hiển thị màn hình "Đang tìm kiếm..." (Loading State).
  3. Server (Redis) tìm thấy đối tượng phù hợp.
  4. Server gửi sự kiện `match_found` kèm theo `sessionId`.
  5. Frontend chuyển sang màn hình Chat Room.

### UC2: Khởi tạo với AI Icebreaker (AI Initialization)

- **Actor:** Hệ thống (System) & AI Service.
- **Trigger:** Ngay khi `match_found` thành công.
- **Flow:**
  1. Server gọi API sang Python Service để lấy 3 câu mở lời ngẫu nhiên/theo ngữ cảnh.
  2. Server gửi danh sách này (dạng Array string) xuống cả 2 Client.
  3. Frontend hiển thị 3 câu này dưới dạng "Chips" hoặc "Bubbles" có thể bấm được, nằm phía trên thanh nhập liệu.

### UC3: Gửi tin nhắn & Sử dụng Icebreaker

- **Actor:** Người dùng A & Người dùng B.
- **Pre-condition:** Đang trong một Session chat active.
- **Flow A (Gõ phím):**
  1. Người dùng gõ text vào input -> Bấm Send.
  2. Tin nhắn hiện ngay lập tức ở phía người gửi (Optimistic UI).
  3. Server nhận và phát sang người nhận.
- **Flow B (Chọn Icebreaker):**
  1. Người dùng bấm vào 1 trong 3 gợi ý Icebreaker trên màn hình.
  2. Nội dung gợi ý đó tự động được gửi đi như một tin nhắn bình thường.
  3. Các gợi ý Icebreaker ẩn đi sau khi tin nhắn đầu tiên được gửi.

### UC4: Bỏ qua & Tìm mới (Skip & Next)

- **Actor:** Người dùng.
- **Trigger:** Bấm nút "Bỏ qua" (Skip) hoặc "Next".
- **Flow:**
  1. Frontend gửi sự kiện `leave_session`.
  2. Server thông báo cho đối phương là "Người lạ đã rời đi".
  3. Hệ thống tự động kích hoạt lại **UC1 (Tìm kiếm & Ghép đôi)** cho người dùng vừa bấm Skip (nếu họ chọn Next) hoặc đưa về trang chủ.

---

## 3. UI/UX DESIGN GUIDELINES (THIẾT KẾ GIAO DIỆN)

### Phong cách chủ đạo (Style Guide)

- **Theme:** Dark Mode (Ưu tiên) hoặc Clean Minimalist. Giúp tập trung vào nội dung chat, giảm mỏi mắt.
- **Màu sắc:**
  - _Primary:_ Tím Electric (#6C63FF) hoặc Xanh Teal (#00BFA5) - Tạo cảm giác hiện đại, ẩn danh.
  - _Background:_ Dark Grey (#121212) hoặc Off-White (#F5F5F5).
  - _Chat Bubbles:_
    - Me: Primary Color.
    - Stranger: Darker Grey/Light Grey (Tương phản nhẹ với nền).
- **Typography:** Sans-serif (Inter, Roboto hoặc SF Pro). Rõ ràng, dễ đọc.

### Các Màn hình Chính (Screen Layouts)

#### 1. Màn hình Chờ (Landing/Home)

- **Center:** Logo ứng dụng + Slogan ngắn gọn (VD: "Talk to someone new").
- **Action:** Một nút bấm lớn (FAB hoặc Big Button) ở giữa màn hình: "START CHAT".
- **Footer:** Link tới Điều khoản sử dụng (Terms) & Quy tắc cộng đồng (nhỏ, tinh tế).

#### 2. Màn hình "Đang tìm kiếm" (Matching State)

- **Visual:** Animation loading nhẹ nhàng (Pulse, Radar scan, hoặc 3 chấm nhảy).
- **Text:** "Đang tìm người phù hợp..." / "Connecting to a stranger...".
- **Action:** Nút "Hủy" (Cancel) nhỏ bên dưới.

#### 3. Màn hình Chat (Chat Room Interface) - QUAN TRỌNG NHẤT

- **Header:**
  - Trạng thái: "Người lạ" (Stranger) + Dot xanh (Online).
  - Nút Action: "Dừng" (Stop) hoặc icon "Next" (⏭️) ở góc phải.
- **Chat Area (Body):**
  - Hiển thị lịch sử chat (cuộn từ dưới lên).
  - Thông báo hệ thống: "Bạn đã được kết nối với người lạ. Hãy nói Hello!" (Màu xám nhạt, in nghiêng).
- **AI Icebreaker Zone (Overlay/Floating):**
  - Vị trí: Nổi ngay phía trên thanh Input.
  - Hiển thị: 3 nút dạng "Pill" (Viên thuốc) xếp ngang hoặc 2 dòng.
  - Hiệu ứng: Fade in nhẹ nhàng khi vào phòng. Fade out khi user bắt đầu chat.
  - Ví dụ nội dung: ["Bạn thích chó hay mèo?", "Bộ phim gần nhất bạn xem?", "Nếu có siêu năng lực..."].
- **Input Area (Footer):**
  - Text input (Placeholder: "Nhập tin nhắn...").
  - Nút Gửi (Icon máy bay giấy).
  - (MVP chưa cần nút gửi ảnh/mic).

#### 4. Màn hình Kết thúc (Disconnected State)

- **Trạng thái:** Input bị vô hiệu hóa (Disabled).
- **Thông báo:** "Người lạ đã ngắt kết nối."
- **Action:**
  - Nút chính: "Tìm người mới" (New Chat) - Nổi bật.
  - Nút phụ: "Về trang chủ".
  - Nút Report (Cờ báo cáo) nếu người kia có hành vi xấu.
