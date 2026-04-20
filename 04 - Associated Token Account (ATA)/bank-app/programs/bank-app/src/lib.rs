use anchor_lang::prelude::*;

// We import all the different modules (files/folders) so this main file can use them.
pub mod constant;
pub mod error;
pub mod instructions; // Contains all the instructions (functions) a user can call
pub mod state; // Contains the structure of the data we store on-chain
pub mod transfer_helper; // Helper functions for transferring tokens/SOL

use instructions::*;

// This is the unique ID (address) of our program on the Solana blockchain.
// Anchor automatically generates this for you when you run `anchor init`.
declare_id!("6zCwGUboqLEHq93tsGTvMmZ3xTnyK4dsT8qXRcNVWRRj");

// The #[program] macro indicates that the module below contains the instructions
// (endpoints) that external users/apps can call.
#[program]
pub mod bank_app {
    use super::*;

    // This instruction initializes the bank, setting up the global state.
    // `Context` gives us access to the accounts passed in by the user.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        return Initialize::process(ctx);
    }

    // This instruction allows a user to deposit native SOL into the bank.
    pub fn deposit(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        return Deposit::process(ctx, deposit_amount);
    }

    // This instruction allows a user to deposit SPL tokens (like USDC) into the bank.
    pub fn deposit_token(ctx: Context<DepositToken>, deposit_amount: u64) -> Result<()> {
        return DepositToken::process(ctx, deposit_amount);
    }

    // This instruction allows a user to withdraw native SOL they previously deposited.
    pub fn withdraw(ctx: Context<Withdraw>, withdraw_amount: u64) -> Result<()> {
        return Withdraw::process(ctx, withdraw_amount);
    }

    // This instruction allows a user to withdraw SPL tokens they previously deposited.
    pub fn withdraw_token(ctx: Context<WithdrawToken>, withdraw_amount: u64) -> Result<()> {
        return WithdrawToken::process(ctx, withdraw_amount);
    }

    // This instruction pauses the bank so no one can deposit or withdraw. Only the admin can call this.
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        return Pause::process(ctx);
    }
}
