// This file handles the logic for users depositing SPL tokens into the Bank App.
use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    token::Token,
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constant::{BANK_ASSET_SEED, BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankAsset, BankInfo, UserReserve},
    transfer_helper::token_transfer_from_user,
};

// The `DepositToken` struct defines the accounts required to deposit SPL tokens.
#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    ///CHECK: The Bank Vault (PDA) that acts as the authority for the bank's token accounts.
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The SPL Token mint (e.g., USDC, custom token) being deposited.
    #[account(mut)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // The user's Associated Token Account (ATA) from which tokens will be transferred.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user
    )]
    pub user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // The Bank's Associated Token Account (ATA) where the deposited tokens will be stored.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = bank_vault
    )]
    pub bank_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // The PDA that tracks the user's total deposited balance for this specific token mint.
    // Notice the seeds include both the user's key and the token mint's key.
    #[account(
        init_if_needed,
        seeds = [
            USER_RESERVE_SEED,
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
        payer = user,
        space = 8 + std::mem::size_of::<UserReserve>(),
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    #[account(
        init_if_needed,
        seeds = [BANK_ASSET_SEED, token_mint.key().as_ref()],
        bump,
        payer = user,
        space = 8 + std::mem::size_of::<BankAsset>(),
    )]
    pub bank_asset: Box<Account<'info, BankAsset>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositToken<'info> {
    pub fn process(ctx: Context<DepositToken>, deposit_amount: u64) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;

        if bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let bank_asset = &mut ctx.accounts.bank_asset;
        let user_reserve = &mut ctx.accounts.user_reserve;

        let total_assets_before = ctx.accounts.bank_ata.amount;
        let total_shares = bank_asset.total_shares;

        let shares_to_mint = if total_shares == 0 || total_assets_before == 0 {
            deposit_amount
        } else {
            (deposit_amount as u128 * total_shares as u128 / total_assets_before as u128) as u64
        };

        // Transfer the SPL tokens from the user's ATA to the Bank's ATA.
        token_transfer_from_user(
            ctx.accounts.user_ata.to_account_info(),
            &ctx.accounts.user,
            ctx.accounts.bank_ata.to_account_info(),
            &ctx.accounts.token_program,
            deposit_amount,
        )?;

        // Update the user's token deposit record.
        user_reserve.shares += shares_to_mint;
        bank_asset.total_shares += shares_to_mint;

        Ok(())
    }
}
