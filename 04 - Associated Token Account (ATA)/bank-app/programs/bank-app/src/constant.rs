use anchor_lang::prelude::*;

// The #[constant] macro tells Anchor that these are global constants we'll use in our program.
#[constant]
// This is the seed string used to create a unique PDA (Program Derived Address) for storing the bank's global information.
pub const BANK_INFO_SEED: &[u8] = b"BANK_INFO_SEED";

// This seed is used to create a PDA for the "bank vault", which is the account that will actually hold the SOL/tokens deposited by users.
pub const BANK_VAULT_SEED: &[u8] = b"BANK_VAULT_SEED";

// This seed, combined with a user's wallet address, will create a PDA to keep track of how much that specific user has deposited.
pub const USER_RESERVE_SEED: &[u8] = b"USER_RESERVE_SEED";
