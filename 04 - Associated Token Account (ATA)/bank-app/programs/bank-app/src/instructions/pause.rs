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
        bump,
        has_one = authority
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    pub authority: Signer<'info>,
}

impl<'info> Pause<'info> {
    pub fn process(ctx: Context<Pause>) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;
        bank_info.is_paused = !bank_info.is_paused;
        Ok(())
    }
}
