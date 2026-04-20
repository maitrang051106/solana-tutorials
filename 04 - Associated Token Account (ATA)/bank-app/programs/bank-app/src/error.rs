use anchor_lang::prelude::*;

// The #[error_code] macro helps us define custom error messages that our smart contract can return if something goes wrong.
#[error_code]
pub enum BankAppError {
    // This error is thrown when someone tries to do something (like deposit/withdraw) while the bank is paused by the admin.
    #[msg("The bank app is currently paused.")]
    BankAppPaused,
    
    // This error is thrown if a user tries to withdraw more money than they actually have in their reserve.
    #[msg("Insufficient funds for withdrawal.")]
    InsufficientFunds,
}
