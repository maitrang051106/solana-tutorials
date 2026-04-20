use anchor_lang::prelude::*;

use crate::{
    constant::BANK_INFO_SEED,
    state::BankInfo,
};

// #[derive(Accounts)] defines the accounts required to run the Pause instruction.
#[derive(Accounts)]
pub struct Pause<'info> {
    // The bank's global info account. We need it mutable (mut) because we are changing `is_paused`.
    #[account(
        mut,
        seeds = [BANK_INFO_SEED],
        bump,
        // VERY IMPORTANT: `has_one = authority` checks that the `authority` account passed in below 
        // exactly matches the `authority` public key saved inside `bank_info`.
        // This ensures ONLY the original admin can pause/unpause the bank!
        has_one = authority
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // The user trying to pause the bank. They must sign the transaction.
    pub authority: Signer<'info>,
}

impl<'info> Pause<'info> {
    pub fn process(ctx: Context<Pause>) -> Result<()> {
        let bank_info = &mut ctx.accounts.bank_info;
        
        // Toggle the pause state (if false -> true, if true -> false)
        bank_info.is_paused = !bank_info.is_paused;
        
        Ok(())
    }
}
