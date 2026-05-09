use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constant::*;

// The context struct for the Deposit instruction.
// This defines what accounts are required to execute a native SOL deposit.
#[derive(Accounts)]
pub struct Deposit<'info> {
    // 1. The user depositing the SOL.
    // #[account(mut)] is needed because SOL will be deducted from this account, changing its state.
    // Signer<'info> ensures the user authorized this transaction.
    #[account(mut)]
    pub user: Signer<'info>,

    // 2. The Bank Vault PDA receiving the SOL.
    // #[account(mut)] is needed because SOL will be added to this account.
    // We validate it using its seeds to ensure users cannot pass a fake vault address.
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump
    )]
    /// CHECK: We are just sending SOL to it, so we don't need Anchor to deserialize any data structure.
    pub bank_vault: AccountInfo<'info>,

    // 3. The System Program.
    // Required to execute the underlying SOL transfer instruction.
    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    // The actual logic for depositing native SOL.
    // `amount` is passed as an argument from the frontend (in lamports: 1 SOL = 1,000,000,000 lamports).
    pub fn process(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        msg!("Processing deposit of {} lamports...", amount);

        // We delegate the transfer logic to our `transfer_helper` module.
        // This keeps our instruction clean and follows the DRY (Don't Repeat Yourself) principle.
        // We pass references to the required accounts: the sender (user), receiver (bank_vault), and the system program.
        crate::transfer_helper::sol_transfer_from_user(
            &ctx.accounts.user,
            ctx.accounts.bank_vault.to_account_info(),
            &ctx.accounts.system_program,
            amount,
        )?;
        
        msg!("Deposit successful!");
        Ok(()) // Return success
    }
}
