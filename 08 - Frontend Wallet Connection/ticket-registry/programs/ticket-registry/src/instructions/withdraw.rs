use anchor_lang::prelude::*;

use crate::errors::CustomError;
use crate::state::EventAccount;

pub fn _withdraw<'info>(ctx: Context<WithdrawContext<'info>>, amount: u64) -> Result<()> {
    let event_account = &mut ctx.accounts.event_account;
    let event_organizer = &mut ctx.accounts.event_organizer;

    // Kiểm tra số dư đủ để rút, đồng thời phải đảm bảo tài khoản không bị xóa (rent exemption)
    let rent = Rent::get()?;
    let event_account_info = event_account.to_account_info();
    let rent_exemption = rent.minimum_balance(event_account_info.data_len());
    let available_balance = event_account_info.lamports().saturating_sub(rent_exemption);

    require!(amount <= available_balance, CustomError::InsufficientFunds);

    event_account.sub_lamports(amount)?;
    event_organizer.add_lamports(amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawContext<'info> {
    #[account(mut)]
    pub event_organizer: Signer<'info>,
    #[account(
        mut,
        has_one = event_organizer,
    )]
    pub event_account: Account<'info, EventAccount>,
}
