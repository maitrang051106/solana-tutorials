// Import toàn bộ thư viện và các công cụ cốt lõi của Anchor Framework
use anchor_lang::prelude::*;

// #[error_code] là một Macro (tính năng tự động sinh code) của Anchor.
// Nó âm thầm làm 3 việc sau lưng bạn:
// 1. Đăng ký danh sách này thành bộ mã lỗi chuẩn của hệ thống Solana.
// 2. Tự động đánh số thứ tự mã lỗi, bắt đầu từ con số 6000.
// 3. Đẩy danh sách này vào cuốn "từ điển" IDL (.json) để file Test (TypeScript) đọc hiểu được.
#[error_code]
pub enum BankAppError { // enum: Khai báo một danh sách các trường hợp lỗi có thể xảy ra
    
    // #[msg("...")] đính kèm một thông báo lỗi bằng chữ để con người dễ đọc.
    // Lỗi này sẽ mang "Mã số 6000" do nó đứng đầu tiên.
    // Xảy ra khi người dùng cố tình gửi tiền/rút tiền lúc App đang khóa (is_paused = true).
    #[msg("The bank app is currently paused.")]
    BankAppPaused,
    
    // Lỗi này sẽ mang "Mã số 6001" (số 6000 cộng thêm 1).
    // Xảy ra khi người dùng nhập số tiền rút <= 0, hoặc rút nhiều hơn số dư trong két.
    // Ở file test TypeScript, hàm "catch (error: any)" chính là để bắt câu chữ được viết ở đây.
    #[msg("Invalid withdraw amount.")]
    InvalidWithdrawAmount,
}