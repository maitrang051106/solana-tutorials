use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    token::Token,
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constant::{BANK_ASSET_SEED, BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankAsset, BankInfo, UserReserve},
    transfer_helper::token_transfer_from_pda,
};

// #[derive(Accounts)] defines all the accounts we need to withdraw SPL tokens.
#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    // Read the bank's global info to check if it's paused.
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // The vault PDA. It acts as the authority (owner) of the bank's Associated Token Account (ATA).
    ///CHECK:
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The Mint account of the token we want to withdraw (e.g., USDC Mint address).
    #[account(mut)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // The user's ATA. This is where the withdrawn tokens will be sent to.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user
    )]
    pub user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // The bank's ATA. This is where the tokens are currently stored and will be withdrawn from.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = bank_vault // Owned by the vault PDA
    )]
    pub bank_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // The user's reserve account. We need to check if they have enough balance to withdraw!
    #[account(
        mut,
        seeds = [
            USER_RESERVE_SEED,
            user.key().as_ref(),
            token_mint.key().as_ref()
        ],
        bump,
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    #[account(
        mut,
        seeds = [BANK_ASSET_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub bank_asset: Box<Account<'info, BankAsset>>,

    #[account(mut)]
    pub user: Signer<'info>, // The user who is withdrawing
    pub token_program: Program<'info, Token>, // The official SPL Token program
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawToken<'info> {
    pub fn process(ctx: Context<WithdrawToken>, withdraw_shares: u64) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;

        // Step 1: Ensure the bank is not paused
        if bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let bank_asset = &mut ctx.accounts.bank_asset;
        let user_reserve = &mut ctx.accounts.user_reserve;

        // Step 2: Check if the user has enough deposited tokens
        if user_reserve.shares < withdraw_shares {
            return Err(BankAppError::InsufficientFunds.into());
        }

        let total_assets = ctx.accounts.bank_ata.amount;
        let total_shares = bank_asset.total_shares;

        let amount_to_return = if total_shares == 0 {
            0
        } else {
            (withdraw_shares as u128 * total_assets as u128 / total_shares as u128) as u64
        };

        // Step 3: Prepare the seeds so the program can sign on behalf of the vault PDA
        let bank_vault_bump = ctx.accounts.bank_info.vault_bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            BANK_VAULT_SEED,
            &[bank_vault_bump],
        ]];

        // Step 4: Transfer the SPL tokens from the bank's ATA to the user's ATA
        token_transfer_from_pda(
            ctx.accounts.bank_ata.to_account_info(), // From: Bank's token account
            ctx.accounts.bank_vault.to_account_info(), // Authority: Bank vault PDA (needs seeds to sign)
            ctx.accounts.user_ata.to_account_info(), // To: User's token account
            &ctx.accounts.token_program,
            signer_seeds, // The seeds used to sign for the PDA authority
            amount_to_return,
        )?;

        // Step 5: Update the user's balance in our bookkeeping
        user_reserve.shares -= withdraw_shares;
        bank_asset.total_shares -= withdraw_shares;

        msg!("Withdrawal Successful! Amount: {}", amount_to_return);
        Ok(())
    }
}
