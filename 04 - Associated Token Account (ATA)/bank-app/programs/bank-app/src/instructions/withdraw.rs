use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankInfo, UserReserve},
};

// #[derive(Accounts)] defines the accounts required to run the Withdraw instruction.
#[derive(Accounts)]
pub struct Withdraw<'info> {
    // Read the bank's global info to check if it's paused.
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // The vault PDA. This is where the SOL is currently stored and where it will be withdrawn from.
    ///CHECK:
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID 
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The user's reserve account. We need to check if they have enough balance to withdraw!
    #[account(
        mut,
        seeds = [USER_RESERVE_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    // The user who wants to withdraw. They must sign to prove who they are.
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn process(ctx: Context<Withdraw>, withdraw_amount: u64) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;

        // Step 1: Ensure the bank is not paused
        if bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let user_reserve = &mut ctx.accounts.user_reserve;

        // Step 2: Check if the user has enough deposited money (1. Kiểm tra số dư sổ sách)
        if user_reserve.deposited_amount < withdraw_amount {
            return Err(BankAppError::InsufficientFunds.into());
        }

        // ========================================================
        // Step 3: Transfer SOL from Vault to User (2. CHUYỂN SOL (RÚT TIỀN TỪ KÉT BẰNG CPI CÓ CHỮ KÝ PDA))
        // ========================================================
        // Because the Vault is a PDA, it doesn't have a private key. 
        // We have to "sign" for it using the seeds we used to create it.
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
        
        // Execute the transfer. CpiContext::new_with_signer allows the program to sign for the PDA.
        // Gọi System Program kèm theo "con dấu" của Két sắt
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        system_program::transfer(cpi_ctx, withdraw_amount)?;

        // Step 4: Update the user's balance in our bookkeeping (3. Cập nhật lại sổ sách)
        user_reserve.deposited_amount -= withdraw_amount;

        Ok(())
    }
}