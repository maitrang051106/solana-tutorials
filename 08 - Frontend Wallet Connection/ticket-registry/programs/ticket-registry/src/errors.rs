use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Name is too long")]
    NameTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("Start date is in the past")]
    InvalidStartDate,
    #[msg("Available tickets must be greater than zero")]
    ZeroTickets,
    #[msg("All tickets are sold out")]
    SoldOut,
    #[msg("Event has already started")]
    EventAlreadyStarted,
    #[msg("Insufficient funds to withdraw")]
    InsufficientFunds,
}
