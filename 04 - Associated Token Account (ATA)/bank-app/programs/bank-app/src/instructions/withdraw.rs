use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankInfo, UserReserve},
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    ///CHECK:
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        // Có thể giữ hoặc bỏ dòng owner này đều được vì Unchecked mặc định là System
        owner = system_program::ID 
    )]
    pub bank_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [USER_RESERVE_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn process(ctx: Context<Withdraw>, withdraw_amount: u64) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;

        if bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let user_reserve = &mut ctx.accounts.user_reserve;

        // 1. Kiểm tra số dư sổ sách
        if user_reserve.deposited_amount < withdraw_amount {
            return Err(BankAppError::InsufficientFunds.into());
        }

        // ========================================================
        // 2. CHUYỂN SOL (RÚT TIỀN TỪ KÉT BẰNG CPI CÓ CHỮ KÝ PDA)
        // ========================================================
        let bank_vault_bump = ctx.bumps.bank_vault;
        let signer_seeds: &[&[&[u8]]] = &[&[
            BANK_VAULT_SEED,
            &[bank_vault_bump],
        ]];

        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.bank_vault.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };
        
        // Gọi System Program kèm theo "con dấu" của Két sắt
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, withdraw_amount)?;

        // 3. Cập nhật lại sổ sách
        user_reserve.deposited_amount -= withdraw_amount;

        Ok(())
    }
}