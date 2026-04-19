use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankInfo, UserReserve},
    transfer_helper::sol_transfer_from_pda, // Hàm Helper CPI tự động ký tên bằng PDA
};

// ==============================================================================
// LỚP KIỂM DUYỆT (VALIDATION LAYER)
// ==============================================================================
#[derive(Accounts)]
pub struct Withdraw<'info> {
    
    // 1. SỔ GỐC NGÂN HÀNG (Dùng để check trạng thái khóa và lấy Bump)
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // 2. KÉT SẮT NGÂN HÀNG
    ///CHECK: Két sắt chỉ chứa SOL, không chứa dữ liệu cấu trúc nên không cần kiểm tra data.
    #[account(
        mut, // `mut` vì số dư (lamports) của két sắt sẽ bị trừ đi
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // 3. SỔ TIẾT KIỆM CỦA USER
    #[account(
        mut, // Bắt buộc `mut` vì ta sẽ trừ biến `deposited_amount`
        seeds = [USER_RESERVE_SEED, user.key().as_ref()], // Ghép Seed với ví khách để tìm đúng sổ
        bump,
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    // 4. KHÁCH HÀNG RÚT TIỀN (Người nhận tiền)
    #[account(mut)] // Bắt buộc `mut` vì ví khách sẽ được cộng thêm SOL vào
    pub user: Signer<'info>, // Khách phải cắm ví vào ký lệnh rút
    
    // 5. HỆ ĐIỀU HÀNH SOLANA
    pub system_program: Program<'info, System>,
}

// ==============================================================================
// LỚP LOGIC NGHIỆP VỤ (BUSINESS LOGIC)
// ==============================================================================
impl<'info> Withdraw<'info> {
    pub fn process(ctx: Context<Withdraw>, withdraw_amount: u64) -> Result<()> {
        
        // 1.1. Check công tắc khẩn cấp
        if ctx.accounts.bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let user_reserve = &mut ctx.accounts.user_reserve;

        // 1.2. Check tính hợp lệ của số tiền rút
        // Macro `require!` đóng vai trò như bảo vệ: 
        // Điều kiện: Tiền rút phải > 0 VÀ không được vượt quá số tiền khách đang có trong sổ.
        // Nếu sai điều kiện -> Lập tức văng lỗi InvalidWithdrawAmount và hủy giao dịch.
        require!(
            withdraw_amount > 0 && withdraw_amount <= user_reserve.deposited_amount,
            BankAppError::InvalidWithdrawAmount
        );


        // --- CHUẨN BỊ CHỮ KÝ GIẢ LẬP CHO PDA ---
        
        // Lấy con số `bump` đã cất công lưu ở hàm initialize ra để dùng.
        // pda_seeds là mảng 3 chiều chứa "Hồ sơ gốc" để chứng minh Smart Contract là chủ của cái Két sắt.
        let pda_seeds: &[&[&[u8]]] = &[&[BANK_VAULT_SEED, &[ctx.accounts.bank_info.bump]]];
        
        
        // --- THỰC THI GIAO DỊCH (CPI) ---
        
        // Gọi hàm Helper để nhờ Hệ điều hành Solana chuyển SOL từ Két về Ví khách.
        // Hàm này xài `invoke_signed` ở bên dưới, và dùng `pda_seeds` để đóng dấu xác nhận.
        sol_transfer_from_pda(
            ctx.accounts.bank_vault.to_account_info(), // Nguồn: Két sắt
            ctx.accounts.user.to_account_info(),       // Đích: Ví người dùng
            &ctx.accounts.system_program,
            pda_seeds,                                 // Đưa con dấu ra cho Hệ điều hành check
            withdraw_amount,
        )?;


        // --- CẬP NHẬT TRẠNG THÁI SỔ SÁCH (STATE UPDATE) ---
        
        // Trừ đi số tiền khách vừa rút khỏi sổ tiết kiệm
        user_reserve.deposited_amount -= withdraw_amount;

        Ok(())
    }
}