use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod instructions;
pub mod transfer_helper;

use instructions::*;

declare_id!("BTNSwgCPHbRwbg8dMRZXA1LxqAsocyQAPqK8owYLJgpK");

#[program]
pub mod bank_app {
    use super::*;

    // 1. Initialize the Bank Vault
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        return Initialize::process(ctx);
    }

    // 2. Deposit SOL into the Bank Vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        return Deposit::process(ctx, amount);
    }

    // 3. Deposit SPL Token into the Bank Vault
    pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        return DepositToken::process(ctx, amount);
    }
}