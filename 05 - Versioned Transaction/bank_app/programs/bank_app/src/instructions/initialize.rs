use anchor_lang::prelude::*;
use crate::constant::*;

// The #[derive(Accounts)] macro defines the context of accounts that must be passed 
// to the instruction when it is called from the client (frontend).
// Anchor uses this struct to automatically validate the accounts before running the instruction logic.
#[derive(Accounts)]
pub struct Initialize<'info> {
    // 1. The admin account.
    // #[account(mut)] means this account will be modified (because it pays for the transaction fee and rent).
    // Signer<'info> ensures that the transaction was cryptographically signed by this account.
    #[account(mut)]
    pub admin: Signer<'info>,

    // 2. The Bank Vault account.
    // This is a Program Derived Address (PDA) that acts as the bank's vault to store SOL.
    #[account(
        init, // Instructs Anchor to create this account.
        payer = admin, // The 'admin' account pays the SOL required for account creation (rent).
        space = 8, // The size of the account. 8 bytes is the minimum for the Anchor discriminator. We don't store custom data here, just SOL balance.
        seeds = [BANK_VAULT_SEED], // The seed used to derive this PDA (e.g., "BANK_VAULT_SEED").
        bump // Anchor automatically calculates the cryptographic bump needed to find a valid address off the elliptic curve.
    )]
    // /// CHECK: This is an unsafe comment required by Anchor when we use AccountInfo instead of a strictly typed Account<T>.
    // It tells Anchor: "I know what I'm doing, skip strict type checking". We use it here because the vault just holds SOL, no data structure.
    /// CHECK: This is just a PDA vault to hold SOL securely
    pub bank_vault: AccountInfo<'info>,

    // 3. The System Program.
    // This is required whenever we create new accounts (init) or transfer native SOL.
    pub system_program: Program<'info, System>,
}

// This implementation block holds the actual business logic for the instruction.
impl<'info> Initialize<'info> {
    pub fn process(_ctx: Context<Initialize>) -> Result<()> {
        // msg! macro logs messages to the Solana program logs.
        // Useful for debugging in the Solana Explorer or local terminal.
        msg!("Bank Initialized! The Vault is ready.");
        
        // Return Ok(()) to indicate the instruction executed successfully without errors.
        Ok(())
    }
}
