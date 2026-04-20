use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    token::Token,
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankInfo, UserReserve},
    transfer_helper::token_transfer_from_user,
};

// #[derive(Accounts)] defines all the accounts we need to deposit SPL tokens (like USDC).
#[derive(Accounts)]
pub struct DepositToken<'info> {
    // Read the bank's global info to check if it's paused.
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // The vault PDA. Even though tokens are stored in an Associated Token Account (ATA),
    // the vault PDA acts as the *owner* of the bank's ATA.
    ///CHECK:
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The Mint account represents the specific token being deposited (e.g., USDC Mint address).
    #[account(mut)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

    // The user's Associated Token Account (ATA). This is where the user's tokens are currently sitting.
    #[account(
        mut,
        associated_token::mint = token_mint, // Must match the token mint
        associated_token::authority = user // Must be owned by the user
    )]
    pub user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // The bank's Associated Token Account (ATA). This is where the tokens will be sent to.
    #[account(
        mut,
        associated_token::mint = token_mint, // Must match the token mint
        associated_token::authority = bank_vault // Must be owned by our bank vault PDA
    )]
    pub bank_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // The user's reserve account to keep track of their deposits.
    // Note how the seeds include BOTH the user's address AND the token's mint address,
    // meaning the user has a separate reserve account for each different type of token!
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

    #[account(mut)]
    pub user: Signer<'info>, // The user signing the transaction
    pub token_program: Program<'info, Token>, // The official SPL Token program
    pub system_program: Program<'info, System>,
}

impl<'info> DepositToken<'info> {
    pub fn process(ctx: Context<DepositToken>, deposit_amount: u64) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;

        // Step 1: Ensure the bank is not paused
        if bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let user_reserve = &mut ctx.accounts.user_reserve;

        // Step 2: Transfer the SPL tokens from the user's ATA to the bank's ATA
        token_transfer_from_user(
            ctx.accounts.user_ata.to_account_info(), // From: User's token account
            &ctx.accounts.user,                      // Authority: User's signature
            ctx.accounts.bank_ata.to_account_info(), // To: Bank's token account
            &ctx.accounts.token_program,
            deposit_amount,
        )?;

        // Step 3: Update our bookkeeping
        user_reserve.deposited_amount += deposit_amount;

        Ok(())
    }
}
