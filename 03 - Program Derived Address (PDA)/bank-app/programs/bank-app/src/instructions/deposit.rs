use anchor_lang::{prelude::*, system_program};

// Import các hằng số, lỗi, model dữ liệu và hàm Helper chuyển tiền
use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankInfo, UserReserve},
    transfer_helper::sol_transfer_from_user,
};

// ==============================================================================
// LỚP KIỂM DUYỆT (VALIDATION LAYER / DTO)
// ==============================================================================
#[derive(Accounts)]
pub struct Deposit<'info> {
    // 1. Sổ gốc ngân hàng (Đọc để check xem có đang bị khóa không)
    // Không có chữ `mut` vì hàm deposit không được phép sửa thông tin ngân hàng.
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // 2. Két sắt ngân hàng (Nơi nhận tiền)
    ///CHECK:
    #[account(
        mut, // Có `mut` vì số dư (lamports) của két thay đổi
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // 3. Sổ tiết kiệm của User (Nơi ghi chép số dư)
    #[account(
        init_if_needed, // Phép thuật của Anchor: Chưa có thì tạo, có rồi thì bỏ qua!
        seeds = [USER_RESERVE_SEED, user.key().as_ref()], // Ghép Seed tĩnh + Ví của khách
        bump,
        payer = user, // Nếu cần tạo sổ mới, trừ tiền phí tạo PDA vào ví khách
        space = 8 + std::mem::size_of::<UserReserve>(),
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    // 4. Khách hàng nạp tiền
    #[account(mut)] // Bắt buộc `mut` vì ví khách sẽ bị trừ tiền SOL
    pub user: Signer<'info>, // Khách phải tự ký duyệt giao dịch
    
    // 5. Cấp quyền cho Hệ điều hành tạo tài khoản và chuyển tiền
    pub system_program: Program<'info, System>,
}

// ==============================================================================
// LỚP LOGIC NGHIỆP VỤ (SERVICE/BUSINESS LOGIC)
// ==============================================================================
impl<'info> Deposit<'info> {
    pub fn process(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        
        // Kiểm tra xem ngân hàng có đang bị khóa không. Nếu có, ném lỗi ra ngay lập tức và dừng hàm.
        if ctx.accounts.bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        // Lấy tham chiếu có quyền ghi (Mutable Reference)
        let user_reserve = &mut ctx.accounts.user_reserve;

        // Gọi chéo chương trình (CPI) thông qua Helper
        // Chuyển SOL thật từ ví User sang PDA Két Sắt
        sol_transfer_from_user(
            &ctx.accounts.user,
            ctx.accounts.bank_vault.to_account_info(),
            &ctx.accounts.system_program,
            deposit_amount, // Số tiền gửi lên từ Frontend
        )?; // Dấu ? đảm bảo nếu chuyển tiền thất bại (VD: khách hết tiền), toàn bộ giao dịch sẽ bị Hủy (Revert).

        // Cập nhật Trạng thái (Update State)
        // Nếu CPI thành công, cộng thêm số tiền gửi vào sổ tiết kiệm của User.
        user_reserve.deposited_amount += deposit_amount;

        Ok(())
    }
}