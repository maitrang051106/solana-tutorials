use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED},
    state::BankInfo,
};

// The `Initialize` struct defines the accounts required for the initialization instruction.
#[derive(Accounts)]
pub struct Initialize<'info> {
    // `bank_info` is a PDA that stores global settings like the authority and pause state.
    // It is created here (`init`) and paid for by the `authority`.
    #[account(
        init,
        seeds = [BANK_INFO_SEED],
        bump,
        payer = authority,
        space = 8 + std::mem::size_of::<BankInfo>(),
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    ///CHECK: This is the Bank Vault (PDA), a native SOL vault. We don't need Anchor to deserialize it, so it's an UncheckedAccount.
    // It is created here (`init`) to hold SOL deposits and owned by the System Program.
    #[account(
        init,
        seeds = [BANK_VAULT_SEED],
        bump,
        payer = authority,
        space = 0,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The signer who is paying for account creation and will be set as the bank authority.
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    // The `process` function executes the actual logic of the instruction.
    pub fn process(ctx: Context<Initialize>) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;

        // Set the initial state of the bank.
        // Assign the authority to the person who initialized it.
        bank_info.authority = ctx.accounts.authority.key();
        bank_info.is_paused = false; // Initially, the bank is active.
        bank_info.vault_bump = ctx.bumps.bank_vault; // Store the vault's bump seed for future CPI signing.

        msg!("bank app initialized!");
        Ok(())
    }
}
