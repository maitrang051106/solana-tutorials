use anchor_lang::prelude::*;
use crate::constant::BANK_INFO_SEED;
use crate::state::BankInfo;

#[derive(Accounts)]
pub struct Pause<'info> {
    // The account that has the authority to pause the bank
    #[account(mut)]
    pub authority: Signer<'info>,

    // The bank info account that we want to modify
    #[account(
        mut, 
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Account<'info, BankInfo>,
}

impl<'info> Pause<'info> {
    pub fn process(ctx: Context<Pause>) -> Result<()> {
        // Toggle the pause state
        ctx.accounts.bank_info.is_paused = !ctx.accounts.bank_info.is_paused;

        msg!("Bank pause state toggled. Paused: {}", ctx.accounts.bank_info.is_paused);
        Ok(())
    }
}
