use anchor_lang::prelude::*;

declare_id!("9UDzQZ1pE1SVWKwNvc8tsMSQKVNp2jh1kxAY81b8Fo79");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod ticket_registry {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeContext>,
        name: String,
        description: String,
        ticket_price: u64,
        available_tickets: u64,
        start_date: i64,
    ) -> Result<()> {
        _initialize(
            ctx,
            name,
            description,
            ticket_price,
            available_tickets,
            start_date,
        )
    }
    pub fn buy_ticket(ctx: Context<BuyTicketContext>) -> Result<()> {
        _buy_ticket(ctx)
    }
    pub fn withdraw(ctx: Context<WithdrawContext>, amount: u64) -> Result<()> {
        _withdraw(ctx, amount)
    }
}
