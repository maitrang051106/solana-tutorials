use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED},
    state::BankInfo,
};

// #[derive(Accounts)] defines the accounts required to run the Initialize instruction.
// All accounts listed here must be passed in by the user when they call this instruction.
#[derive(Accounts)]
pub struct Initialize<'info> {
    // We are creating a new account (init) to store the bank's global info.
    #[account(
        init,
        seeds = [BANK_INFO_SEED], // The seed used to generate this PDA
        bump, // Anchor automatically calculates the bump and saves it
        payer = authority, // The user calling this pays for the space (rent)
        space = 8 + std::mem::size_of::<BankInfo>(), // 8 bytes for the Anchor discriminator + size of the struct
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // ///CHECK: is used when we don't need Anchor to do strict type checking on this account.
    // We just need a PDA to act as our vault to hold SOL.
    ///CHECK:
    #[account(
        init,
        seeds = [BANK_VAULT_SEED],
        bump,
        payer = authority,
        space = 0, // 0 space because it only holds SOL balance, no extra data
        owner = system_program::ID // Owned by the system program (required to hold SOL)
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The user calling this instruction. They must sign the transaction (Signer)
    // and their account must be mutable (mut) because they pay SOL for account rent.
    #[account(mut)]
    pub authority: Signer<'info>,
    
    // We need the system program to create accounts and allocate space.
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    // The actual logic that runs when 'initialize' is called.
    pub fn process(ctx: Context<Initialize>) -> Result<()> {
        // Get a mutable reference to the newly created bank_info account
        let bank_info = &mut ctx.accounts.bank_info;

        // Set the bank's admin to whoever called this instruction
        bank_info.authority = ctx.accounts.authority.key();
        // The bank starts un-paused
        bank_info.is_paused = false;
        // Save the vault's bump seed so we can use it later when withdrawing money
        bank_info.bump = ctx.bumps.bank_vault;

        msg!("bank app initialized!");
        Ok(())
    }
}
