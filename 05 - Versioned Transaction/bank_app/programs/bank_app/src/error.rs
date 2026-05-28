use anchor_lang::prelude::*;

#[error_code]
pub enum BankError {
    #[msg("Custom error not implemented yet.")]
    NotImplemented,
}
