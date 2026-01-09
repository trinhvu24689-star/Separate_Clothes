// db/schema.ts
// Đây là định nghĩa schema cho cơ sở dữ liệu của bạn, được thiết kế để tương ứng với các bảng SQL (ví dụ: trên Neon DB).

export interface User {
  id: string; // PRIMARY KEY, UUID
  username: string; // UNIQUE
  passwordHash?: string; // Stored as TEXT, hashed
  email?: string; // UNIQUE, NULLABLE
  role: 'GUEST' | 'TALENT' | 'MEMBER' | 'CONGTU' | 'THIEUGIA' | 'DAIGIA' | 'DAINHAN' | 'THAITU' | 'DAITHAITU' | 'THIENTU' | 'VUA' | 'CHUA' | 'THANTAI' | 'THUONGTIEN' | 'THUONGTHAN' | 'COTHAN' | 'VIP' | 'SSVIP' | 'ULTRA_INFINITY' | 'LIFETIME' | 'MODERATOR' | 'ADMIN' | 'LOCKED'; // REFERENCES vip_tiers(name) conceptually
  stars: number; // INTEGER, DEFAULT 0
  dailyStarClaimed: string; // TEXT, DATE_STRING 'YYYY-MM-DD'
  avatarUrl: string; // TEXT, URL or Base64
  frameId: string; // REFERENCES frames(id)
  history: HistoryEntry[]; // JSONB in PostgreSQL, for simplified embedding of history
  googleId?: string; // UNIQUE, NULLABLE
  facebookId?: string; // UNIQUE, NULLABLE
  createdAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  updatedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  // Thêm các trường khác nếu cần cho SQL, ví dụ: last_login_ip (TEXT), device_id (TEXT)
}

export interface Frame {
  id: string; // PRIMARY KEY, UUID
  name: string; // TEXT, UNIQUE
  imageUrl: string; // TEXT, URL
  priceStars: number; // INTEGER, DEFAULT 0
  minLevel: number; // INTEGER (min VIP level to access)
  isExclusive: boolean; // BOOLEAN
  description?: string; // TEXT, NULLABLE
  createdAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  updatedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
}

export interface VipTier {
  id: string; // PRIMARY KEY, UUID
  name: string; // TEXT, UNIQUE
  level: number; // INTEGER, UNIQUE
  description: string; // TEXT
  priceVND?: number; // NUMERIC, NULLABLE
  priceUSD?: number; // NUMERIC, NULLABLE
  benefits: string[]; // JSONB (array of strings); backend sẽ parse từ JSONB
  duration?: 'lifetime' | 'annual' | 'monthly'; // TEXT, NULLABLE
  createdAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  updatedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
}

export interface StarPack {
  id: string; // PRIMARY KEY, UUID
  amount: number; // INTEGER
  priceVND: number; // NUMERIC
  priceUSD: number; // NUMERIC
  createdAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  updatedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
}

export interface ChatMessage {
  id: string; // PRIMARY KEY, UUID
  senderId: string; // REFERENCES users(id)
  senderUsername: string; // TEXT (denormalized for chat display)
  senderRole: User['role']; // TEXT (denormalized)
  content: string; // TEXT
  timestamp: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  roomId?: string; // TEXT, NULLABLE (for private chats or channels)
  createdAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  updatedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
}

export interface HistoryEntry {
  id: string; // PRIMARY KEY, UUID
  userId: string; // REFERENCES users(id)
  thumbnailUrl: string; // TEXT, URL or Base64
  originalPrompt?: string; // TEXT, NULLABLE
  processedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  resolutionUsed: string; // TEXT
  costStars: number; // INTEGER
  createdAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
  updatedAt: number; // BIGINT (Unix timestamp in ms); sử dụng number cho JSON qua HTTP
}

export type VipTierConfig = {
  name: string;
  level: number;
  benefits: string[];
  description: string;
  price?: string; // Original price string
};

export const VipTiersMap: { [key: string]: VipTierConfig } = {
  GUEST: { name: 'Khách', level: 0, benefits: ['+30 sao miễn phí mỗi ngày (tối đa 69 sao)', '5 tin nhắn chat/ngày (Cooldown 30s)'], description: 'Người dùng mặc định' },
  MEMBER: { name: 'Thành viên', level: 1, benefits: ['+50 sao miễn phí mỗi ngày (tối đa 200 sao)', '10 tin nhắn chat/ngày (Cooldown 20s)', 'Giảm 2% phí nâng cấp VIP'], description: 'Thành viên cơ bản' },
  TALENT: { name: 'Tài nhân', level: 2, benefits: ['+100 sao miễn phí mỗi ngày (tối đa 500 sao)', '20 tin nhắn chat/ngày (Cooldown 15s)', 'Giảm 5% phí nâng cấp VIP', 'Mở khóa tính năng: Vẽ tự do'], description: 'Người dùng có tài năng sáng tạo' },
  CONGTU: { name: 'Công tử', level: 3, benefits: ['+200 sao miễn phí mỗi ngày (tối đa 1000 sao)', '30 tin nhắn chat/ngày (Cooldown 10s)', 'Giảm 8% phí nâng cấp VIP'], description: 'Con nhà quyền quý' },
  THIEUGIA: { name: 'Thiếu gia', level: 4, benefits: ['+300 sao miễn phí mỗi ngày (tối đa 2000 sao)', '40 tin nhắn chat/ngày (Cooldown 8s)', 'Giảm 10% phí nâng cấp VIP'], description: 'Người kế nghiệp gia đình' },
  DAIGIA: { name: 'Đại gia', level: 5, benefits: ['+500 sao miễn phí mỗi ngày (tối đa 3000 sao)', '50 tin nhắn chat/ngày (Cooldown 5s)', 'Giảm 12% phí nâng cấp VIP', 'Khung avatar độc quyền: Kim Cương Bất Diệt'], description: 'Giàu có và quyền lực' },
  DAINHAN: { name: 'Đại nhân', level: 6, benefits: ['+700 sao miễn phí mỗi ngày (tối đa 4000 sao)', '70 tin nhắn chat/ngày (Cooldown 3s)', 'Giảm 15% phí nâng cấp VIP', 'Khung avatar độc quyền: Phượng Rồng', 'Ưu tiên hỗ trợ'], description: 'Người có địa vị cao trong xã hội' },
  THAITU: { name: 'Thái tử', level: 7, benefits: ['+1000 sao miễn phí mỗi ngày (tối đa 5000 sao)', '100 tin nhắn chat/ngày (Cooldown 2s)', 'Giảm 18% phí nâng cấp VIP', 'Khung avatar độc quyền: Phượng Rồng & Phượng Hoàng', 'Truy cập tính năng Beta sớm'], description: 'Người thừa kế ngai vàng' },
  DAITHAITU: { name: 'Đại Thái tử', level: 8, benefits: ['+1500 sao miễn phí mỗi ngày (tối đa 7000 sao)', '150 tin nhắn chat/ngày (Cooldown 1s)', 'Giảm 20% phí nâng cấp VIP', 'Khung avatar độc quyền: Phượng Rồng, Phượng Hoàng & Thiên Thượng', 'Yêu cầu tính năng riêng'], description: 'Vị vua tương lai của đế chế' },
  THIENTU: { name: 'Thiên tử', level: 9, benefits: ['+2000 sao miễn phí mỗi ngày (tối đa 10000 sao)', '200 tin nhắn chat/ngày (Cooldown 1s)', 'Giảm 22% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Ưu tiên hỗ trợ 24/7'], description: 'Con của trời, người cai trị tối cao' },
  VUA: { name: 'Vua', level: 10, benefits: ['+3000 sao miễn phí mỗi ngày (tối đa 15000 sao)', '300 tin nhắn chat/ngày (Cooldown 0.5s)', 'Giảm 25% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Tùy chỉnh avatar động (sắp ra mắt)'], description: 'Người đứng đầu một vương quốc' },
  CHUA: { name: 'Chúa', level: 11, benefits: ['+4000 sao miễn phí mỗi ngày (tối đa 20000 sao)', '400 tin nhắn chat/ngày (Cooldown 0.5s)', 'Giảm 28% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Tạo hiệu ứng hình ảnh riêng'], description: 'Chúa tể, quyền lực tối thượng' },
  THANTAI: { name: 'Thần tài', level: 12, benefits: ['+5000 sao miễn phí mỗi ngày (tối đa 25000 sao)', '500 tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 30% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Yêu cầu tính năng độc đáo'], description: 'Vị thần mang lại may mắn và tiền bạc' },
  THUONGTIEN: { name: 'Thượng tiên', level: 13, benefits: ['+6000 sao miễn phí mỗi ngày (tối đa 30000 sao)', '600 tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 32% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Được vinh danh trên bảng xếp hạng'], description: 'Tiên nhân với pháp lực cao cường' },
  THUONGTHAN: { name: 'Thượng thần', level: 14, benefits: ['+7000 sao miễn phí mỗi ngày (tối đa 35000 sao)', '700 tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 35% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Tham gia sự kiện VIP độc quyền'], description: 'Vị thần tối cao, quyền năng vô hạn' },
  COTHAN: { name: 'Cổ thần', level: 15, benefits: ['+8000 sao miễn phí mỗi ngày (tối đa 40000 sao)', '800 tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 38% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Giới hạn kích thước ảnh tùy chỉnh'], description: 'Vị thần từ thuở hồng hoang, nắm giữ bí mật vũ trụ' },
  VIP: { name: 'VIP', level: 16, benefits: ['+10000 sao miễn phí mỗi ngày (tối đa 50000 sao)', '1000 tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 40% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Hỗ trợ thiết kế hình ảnh theo yêu cầu', 'Mức giảm giá +2% gói Người kiểm duyệt (nếu nâng cấp gói này), giá 2.500.000 VNĐ / 99 USD'], description: 'Đặc quyền vượt trội', price: '2.500.000 VNĐ / 99 USD' },
  SSVIP: { name: 'SSVIP', level: 17, benefits: ['+15000 sao miễn phí mỗi ngày (tối đa 75000 sao)', '1500 tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 45% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Tạo hiệu ứng đặc biệt cho avatar', 'Mức giảm giá +5% gói Người kiểm duyệt (nếu nâng cấp gói này), giá 4.000.000 VNĐ / 159 USD'], description: 'Đặc quyền tối cao', price: '4.000.000 VNĐ / 159 USD' },
  ULTRA_INFINITY: { name: 'ULTRA_INFINITY', level: 18, benefits: ['+20000 sao miễn phí mỗi ngày (tối đa 100000 sao)', 'Vô hạn tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 50% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Truy cập chat Admin', 'Mức giảm giá +15% gói Người kiểm duyệt (nếu nâng cấp gói này), giá 6.000.000 VNĐ / 239 USD'], description: 'Vô hạn quyền năng', price: '6.000.000 VNĐ / 239 USD' },
  LIFETIME: { name: 'Trọn Đời', level: 19, benefits: ['Vô hạn sao miễn phí mỗi ngày', 'Vô hạn tin nhắn chat/ngày (Cooldown 0s)', 'Giảm 70% phí nâng cấp VIP', 'Tất cả khung avatar độc quyền', 'Hỗ trợ nhanh nhất', 'Miễn phí mọi tính năng mới', 'Mức giảm giá +25% gói Người kiểm duyệt (nếu nâng cấp gói này), giá 10.000.000 VNĐ / 399 USD'], description: 'Quyền lực vĩnh cửu', price: '10.000.000 VNĐ / 399 USD' },
  MODERATOR: { name: 'Người kiểm duyệt', level: 20, benefits: ['Vô hạn sao miễn phí mỗi ngày', 'Vô hạn tin nhắn chat/ngày (Cooldown 0s)', 'Tất cả khung avatar độc quyền', 'Truy cập Bảng quản trị (hạn chế)', 'Miễn phí mọi tính năng mới', 'Không giới hạn kích thước ảnh'], description: 'Quản lý cộng đồng', price: '10.000.000 VNĐ / 399 USD' },
  ADMIN: { name: 'Admin', level: 99, benefits: ['Vô hạn sao', 'Vô hạn tin nhắn chat', 'Full quyền Bảng quản trị', 'Tất cả khung avatar', 'Truy cập mọi tính năng'], description: 'Quản trị viên tối cao' },
  LOCKED: { name: 'Tài khoản bị khóa', level: -1, benefits: ['Không thể sử dụng dịch vụ'], description: 'Tài khoản bị khóa do vi phạm' },
};