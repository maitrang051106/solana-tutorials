// This file handles the logic for users withdrawing native SOL from the Bank App.
use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_ASSET_SEED, BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankAsset, BankInfo, UserReserve},
};

// The `Withdraw` struct defines the accounts required to withdraw SOL.
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    ///CHECK: The Bank Vault (PDA) that holds SOL and will transfer it back to the user.
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The PDA that tracks the user's deposited SOL balance. Must exist for a withdrawal to happen.
    #[account(
        mut,
        seeds = [USER_RESERVE_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    #[account(
        mut,
        seeds = [BANK_ASSET_SEED],
        bump,
    )]
    pub bank_asset: Box<Account<'info, BankAsset>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn process(ctx: Context<Withdraw>, withdraw_shares: u64) -> Result<()> {
        if ctx.accounts.bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let bank_asset = &mut ctx.accounts.bank_asset;
        let user_reserve = &mut ctx.accounts.user_reserve;
        if user_reserve.shares < withdraw_shares {
            return Err(BankAppError::InsufficientFunds.into());
        }

        let total_assets = ctx.accounts.bank_vault.lamports();
        let total_shares = bank_asset.total_shares;

        let amount_to_return = if total_shares == 0 {
            0
        } else {
            (withdraw_shares as u128 * total_assets as u128 / total_shares as u128) as u64
        };

        // The seeds needed for the Bank Vault PDA to sign the withdrawal transfer.
        let pda_seeds: &[&[&[u8]]] = &[&[BANK_VAULT_SEED, &[ctx.accounts.bank_info.vault_bump]]];

        
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.bank_vault.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, pda_seeds);
        system_program::transfer(cpi_ctx, amount_to_return)?;
        
        // Update the user's balance in our bookkeeping
        user_reserve.shares -= withdraw_shares;
        bank_asset.total_shares -= withdraw_shares;

        msg!("Withdrawal Successful! Amount: {}", amount_to_return);
        Ok(())
    }
}
