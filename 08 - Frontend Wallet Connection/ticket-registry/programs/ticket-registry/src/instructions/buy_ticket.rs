use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::CustomError;
use crate::state::{EventAccount, TicketAccount};

pub fn _buy_ticket<'info>(ctx: Context<BuyTicketContext<'info>>) -> Result<()> {
    let event_account_info = ctx.accounts.event_account.to_account_info();
    let event_account_key = ctx.accounts.event_account.key();

    let event = &mut ctx.accounts.event_account;
    let ticket_account = &mut ctx.accounts.ticket_account;
    let buyer = &ctx.accounts.buyer;
    let system_program = &ctx.accounts.system_program;

    require!(
        event.start_date > Clock::get()?.unix_timestamp,
        CustomError::EventAlreadyStarted
    );
    require!(event.available_tickets > 0, CustomError::SoldOut);
    event.available_tickets = event.available_tickets.checked_sub(1).unwrap();

    let cpi_context = CpiContext::new(
        system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: buyer.to_account_info(),
            to: event_account_info,
        },
    );

    system_program::transfer(cpi_context, event.ticket_price)?;

    ticket_account.event = event_account_key;
    ticket_account.buyer = buyer.key();
    ticket_account.price = event.ticket_price;

    Ok(())
}

#[derive(Accounts)]
pub struct BuyTicketContext<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + TicketAccount::INIT_SPACE,
        seeds = [b"ticket_account", buyer.key().as_ref(), event_account.key().as_ref()],
        bump
    )]
    pub ticket_account: Account<'info, TicketAccount>,
    #[account(mut)]
    pub event_account: Account<'info, EventAccount>,
    pub system_program: Program<'info, System>,
}
