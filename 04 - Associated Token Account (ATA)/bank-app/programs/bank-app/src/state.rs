use anchor_lang::prelude::*;

// #[account] marks this struct as an account that can be stored on the Solana blockchain.
// BankInfo stores the global configuration of our bank.
#[account]
#[derive(Default)]
pub struct BankInfo {
    // The public key (wallet address) of the bank's admin/owner.
    pub authority: Pubkey,
    // A flag to indicate if the bank is temporarily paused (no deposits/withdrawals allowed).
    pub is_paused: bool,
    // The "bump" seed used to find this PDA (Program Derived Address). Saving it here saves computation later.
    pub bump: u8,
}

// UserReserve stores data specific to a single user's deposits.
#[account]
#[derive(Default)]
pub struct UserReserve {
    // The total amount of tokens or SOL this specific user has deposited into the bank.
    pub deposited_amount: u64,
}
