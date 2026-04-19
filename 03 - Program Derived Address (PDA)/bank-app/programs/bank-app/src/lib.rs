use anchor_lang::prelude::*;

// ==============================================================================
// PHẦN 1: KHAI BÁO MODULES (PACKAGES/NAMESPACES)
// ==============================================================================
// Từ khóa 'mod' báo cho Compiler biết cấu trúc thư mục của dự án.
// Nó đóng vai trò như việc khai báo các Package hoặc Namespace trong OOP.
pub mod constant;         
pub mod error;            
pub mod instructions;     // Khai báo thư mục 'instructions' như một Package chứa các Class xử lý
pub mod state;            
pub mod transfer_helper;  

// Import (kế thừa) toàn bộ các public struct, trait, function từ package 'instructions'
// vào namespace hiện tại để sử dụng trực tiếp mà không cần gõ tiền tố dài dòng.
use instructions::*;

// ==============================================================================
// PHẦN 2: STATIC IDENTIFIER (ĐỊNH DANH TĨNH)
// ==============================================================================
// Gán Program ID - địa chỉ duy nhất trên mạng lưới để RPC Node biết 
// phải định tuyến (route) giao dịch vào Smart Contract này.
declare_id!("67T9EkMyoWsDqNu39jYRm3qCKHS2MCFZ7LwPGxEJyKbX");

// ==============================================================================
// PHẦN 3: API GATEWAY / CONTROLLER
// ==============================================================================
// Macro #[program] định nghĩa một Interface công khai (Public Interface).
// Những function bên trong module này chính là các API Endpoints mà Client có thể gọi qua RPC.
#[program]
pub mod bank_app {
    use super::*; 

    // API Endpoint 1: Khởi tạo
    // Tham số ctx (Context) hoạt động như một Dependency Injection Container,
    // gói gọn toàn bộ References tới các đối tượng Account cần thiết.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Delegation (Ủy quyền): Thay vì viết logic trực tiếp ở Controller,
        // ta ủy quyền cho phương thức tĩnh (static method) 'process' 
        // của class 'Initialize' nằm trong package 'instructions'.
        return Initialize::process(ctx);
    }

    // API Endpoint 2: Gửi tiền
    // Nhận payload (deposit_amount) từ request của Client.
    pub fn deposit(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        // Ủy quyền luồng thực thi (Execution flow) cho class 'Deposit'
        return Deposit::process(ctx, deposit_amount);
    }

    // API Endpoint 3: Rút tiền
    pub fn withdraw(ctx: Context<Withdraw>, withdraw_amount: u64) -> Result<()> {
        // Ủy quyền luồng thực thi cho class 'Withdraw'
        return Withdraw::process(ctx, withdraw_amount);
    }

    // API Endpoint 4: Tạm dừng
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        // Ủy quyền luồng thực thi cho class 'Pause'
        return Pause::process(ctx);
    }
}