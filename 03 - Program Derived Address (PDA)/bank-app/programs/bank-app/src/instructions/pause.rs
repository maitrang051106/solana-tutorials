use anchor_lang::prelude::*;

use crate::{
    constant::BANK_INFO_SEED,
    state::BankInfo,
};

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    #[account(address = bank_info.authority)]
    pub authority: Signer<'info>,
}

impl<'info> Pause<'info> {
    pub fn process(ctx: Context<Pause>) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;
        bank_info.is_paused = !bank_info.is_paused;

        if bank_info.is_paused {
            msg!("bank app paused!");
        } else {
            msg!("bank app unpaused!");
        }

        Ok(())
    }
}
