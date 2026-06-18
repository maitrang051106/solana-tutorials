use anchor_lang::prelude::*;

pub const MAX_NAME_LENGTH: usize = 30;
pub const MAX_DESCRIPTION_LENGTH: usize = 300;

#[account]
#[derive(InitSpace)]
pub struct EventAccount {
    #[max_len(MAX_NAME_LENGTH)]
    pub name: String,
    #[max_len(MAX_DESCRIPTION_LENGTH)]
    pub description: String,
    pub ticket_price: u64,
    pub available_tickets: u64,
    pub event_organizer: Pubkey,
    pub start_date: i64,
}

#[account]
#[derive(InitSpace)]
pub struct TicketAccount {
    pub event: Pubkey,
    pub buyer: Pubkey,
    pub price: u64,
}
