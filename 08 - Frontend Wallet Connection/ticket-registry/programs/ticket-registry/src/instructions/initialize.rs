use anchor_lang::prelude::*;

use crate::errors::CustomError;
use crate::state::{EventAccount, MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH};

pub fn _initialize(
    ctx: Context<InitializeContext>,
    name: String,
    description: String,
    ticket_price: u64,
    available_tickets: u64,
    start_date: i64,
) -> Result<()> {
    let event: &mut EventAccount = &mut ctx.accounts.event_account;

    require!(name.len() <= MAX_NAME_LENGTH, CustomError::NameTooLong);
    event.name = name;

    require!(
        description.len() <= MAX_DESCRIPTION_LENGTH,
        CustomError::DescriptionTooLong
    );
    event.description = description;

    require!(available_tickets > 0, CustomError::ZeroTickets);
    event.available_tickets = available_tickets;

    require!(
        start_date > Clock::get()?.unix_timestamp,
        CustomError::InvalidStartDate
    );
    event.start_date = start_date;

    event.ticket_price = ticket_price;
    event.event_organizer = ctx.accounts.event_organizer.key();
    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String, description: String)]
pub struct InitializeContext<'info> {
    #[account(
        init_if_needed,
        payer = event_organizer,
        space = 8 + EventAccount::INIT_SPACE,
        seeds = [b"event_account", name.as_bytes(), event_organizer.key().as_ref()],
        bump
    )]
    pub event_account: Account<'info, EventAccount>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub event_organizer: Signer<'info>,
}
