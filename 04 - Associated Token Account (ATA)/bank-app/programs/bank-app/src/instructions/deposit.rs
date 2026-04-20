use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankInfo, UserReserve},
    transfer_helper::sol_transfer_from_user,
};

// #[derive(Accounts)] defines the accounts required to run the Deposit instruction.
#[derive(Accounts)]
pub struct Deposit<'info> {
    // We need to read the bank's global info (to check if it's paused).
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    // This is the vault PDA that will receive the user's SOL.
    ///CHECK:
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID // System program owns SOL accounts
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // This account tracks how much SOL the specific user has deposited.
    // If they haven't deposited before, `init_if_needed` will create this account for them!
    #[account(
        init_if_needed,
        seeds = [USER_RESERVE_SEED, user.key().as_ref()], // Seed includes the user's wallet address
        bump,
        payer = user, // The user pays the rent if the account needs to be created
        space = 8 + std::mem::size_of::<UserReserve>(),
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    // The user who is depositing SOL. They must sign to authorize the transfer.
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    pub fn process(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        // Step 1: Ensure the bank is not paused
        if ctx.accounts.bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let user_reserve = &mut ctx.accounts.user_reserve;

        // Step 2: Transfer the SOL from the user's wallet to the bank vault PDA
        sol_transfer_from_user(
            &ctx.accounts.user, // From: User
            ctx.accounts.bank_vault.to_account_info(), // To: Vault
            &ctx.accounts.system_program,
            deposit_amount, // How much to transfer
        )?;

        // Step 3: Update our internal bookkeeping so we remember they deposited this money
        user_reserve.deposited_amount += deposit_amount;

        Ok(())
    }
}
