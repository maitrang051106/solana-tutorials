use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct BankInfo {
    pub authority: Pubkey,
    pub is_paused: bool,
    pub info_bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(Default)]
pub struct UserReserve {
    pub shares: u64,
}

#[account]
#[derive(Default)]
pub struct BankAsset {
    pub total_shares: u64,
}
