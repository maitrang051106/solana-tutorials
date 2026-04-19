use anchor_lang::prelude::*;

#[account] // Macro #[account] biến struct này thành một kiểu dữ liệu có thể lưu trữ trên mạng Solana (Account Data).
#[derive(Default)]// Macro #[derive(Default)] tự động sinh ra một hàm khởi tạo mặc định (default constructor) cho struct này, giúp chúng ta dễ dàng tạo ra một instance mới với giá trị mặc định (0 cho số, false cho boolean, v.v.) mà không cần phải gán giá trị thủ công.
pub struct BankInfo {
    pub authority: Pubkey, // Chứa địa chỉ ví của người chủ (Giám đốc)
    pub is_paused: bool,   // Công tắc khẩn cấp (true/false) để khóa ngân hàng
    pub bump: u8,          // Lưu lại số Bump (từ 0-255) của Két sắt Vault để tiết kiệm xăng (gas) sau này
}

#[account]
#[derive(Default)]
pub struct UserReserve {
    pub deposited_amount: u64, // Ghi lại tổng số SOL (tính bằng Lamports) mà người này đã gửi
}