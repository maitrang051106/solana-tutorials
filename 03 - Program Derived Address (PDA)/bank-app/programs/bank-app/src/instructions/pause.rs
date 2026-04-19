use anchor_lang::prelude::*;

use crate::{
    constant::BANK_INFO_SEED,
    state::BankInfo,
};
// ==============================================================================
// LỚP KIỂM DUYỆT (VALIDATION LAYER / ACCESS CONTROL)
// ==============================================================================
#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    #[account(address = bank_info.authority)]// Chỉ cho phép người có địa chỉ ví trùng với `authority` trong `BankInfo` mới được quyền gọi lệnh này.
    pub authority: Signer<'info>,
}
// ==============================================================================
// LỚP LOGIC NGHIỆP VỤ (SERVICE/BUSINESS LOGIC)
impl<'info> Pause<'info> {
    pub fn process(ctx: Context<Pause>) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;// tham chiếu có quyền ghi (mutable reference) đến tài khoản BankInfo để sửa đổi trường is_paused
        bank_info.is_paused = !bank_info.is_paused;

        if bank_info.is_paused {
            msg!("bank app paused!");
        } else {
            msg!("bank app unpaused!");
        }

        Ok(())
    }
}
