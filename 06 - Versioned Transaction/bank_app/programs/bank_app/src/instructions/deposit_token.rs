use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constant::*;

// The context struct for depositing SPL Tokens (e.g., USDC, custom tokens).
// Notice how it differs from depositing native SOL: we need Associated Token Accounts (ATAs).
#[derive(Accounts)]
pub struct DepositToken<'info> {
    // 1. The user initiating the deposit. They must sign to authorize moving their tokens.
    #[account(mut)]
    pub user: Signer<'info>,

    // 2. The User's Associated Token Account (ATA).
    // This account actually holds the user's SPL tokens.
    // #[account(mut)] because tokens will be deducted from it.
    // We use Account<'info, TokenAccount> so Anchor strictly verifies it is a valid token account.
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,

    // 3. The Bank Vault PDA.
    // Even though tokens aren't stored directly in this PDA (they are stored in the bank's ATA),
    // we often need it for validation or as the owner of the bank_ata.
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump
    )]
    /// CHECK: PDA for the bank vault, verified via seeds.
    pub bank_vault: AccountInfo<'info>,

    // 4. The Bank's Associated Token Account (ATA).
    // This account receives and holds the SPL tokens on behalf of the bank vault.
    #[account(mut)]
    pub bank_ata: Account<'info, TokenAccount>,

    // 5. The SPL Token Program.
    // Required to execute the token transfer instruction (CPI to the Token Program).
    pub token_program: Program<'info, Token>,
}

impl<'info> DepositToken<'info> {
    // The actual logic for depositing SPL tokens.
    // `amount` is specified in the token's smallest unit (e.g., if decimals = 6, 1 token = 1,000,000).
    pub fn process(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        msg!("Processing token deposit of {}...", amount);

        // We use our custom helper to execute the Cross Program Invocation (CPI).
        // It transfers tokens from the user's ATA (`user_ata`) to the bank's ATA (`bank_ata`).
        // The user acts as the `authority` to approve the transfer.
        crate::transfer_helper::token_transfer_from_user(
            ctx.accounts.user_ata.to_account_info(), // Source
            &ctx.accounts.user,                      // Authority (Owner)
            ctx.accounts.bank_ata.to_account_info(), // Destination
            &ctx.accounts.token_program,             // Token Program
            amount,
        )?;

        msg!("Token Deposit successful!");
        Ok(()) // Return success
    }
}
