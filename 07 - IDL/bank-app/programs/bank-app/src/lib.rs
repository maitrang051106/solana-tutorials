use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod instructions;
pub mod state;
pub mod transfer_helper;

use instructions::*;

declare_id!("357s645XYGZxZsgh2vnbkFT6PVPbLTpDHA3bFNscvxvm");

#[program]
pub mod bank_app {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        return Initialize::process(ctx);
    }

    pub fn invest(ctx: Context<Invest>, amount: u64, is_stake: bool) -> Result<()> {
        return Invest::process(ctx, amount, is_stake);
    }

    pub fn invest_raw(ctx: Context<Invest>, amount: u64, is_stake: bool) -> Result<()> {
        return Invest::process_raw(ctx, amount, is_stake);
    }

    pub fn deposit(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        return Deposit::process(ctx, deposit_amount);
    }

    pub fn deposit_token(ctx: Context<DepositToken>, deposit_amount: u64) -> Result<()> {
        return DepositToken::process(ctx, deposit_amount);
    }
}
