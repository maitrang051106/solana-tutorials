// This file handles the logic for users depositing native SOL into the Bank App.
use anchor_lang::{prelude::*, system_program};
use staking_app::UserInfo;

use crate::{
    constant::{BANK_ASSET_SEED, BANK_INFO_SEED, BANK_VAULT_SEED, USER_RESERVE_SEED},
    error::BankAppError,
    state::{BankAsset, BankInfo, UserReserve},
    transfer_helper::sol_transfer_from_user,
};

// The `Deposit` struct defines the accounts required to deposit SOL.
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    ///CHECK: The Bank Vault (PDA) that holds the deposited SOL.
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    // The PDA that tracks the user's total deposited SOL balance.
    // It is created automatically (`init_if_needed`) when the user deposits for the first time.
    #[account(
        init_if_needed,
        seeds = [USER_RESERVE_SEED, user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + std::mem::size_of::<UserReserve>(),
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,

    #[account(
        init_if_needed,
        seeds = [BANK_ASSET_SEED],
        bump,
        payer = user,
        space = 8 + std::mem::size_of::<BankAsset>(),
    )]
    pub bank_asset: Box<Account<'info, BankAsset>>,

    /// CHECK: The user info PDA in the external Staking App, used to read the staked balance.
    pub staking_info: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Deposit<'info> {
    pub fn process(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
        if ctx.accounts.bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        let bank_asset = &mut ctx.accounts.bank_asset;
        let user_reserve = &mut ctx.accounts.user_reserve;

        let vault_rent = Rent::get()?.minimum_balance(ctx.accounts.bank_vault.data_len());
        let liquid_assets = ctx
            .accounts
            .bank_vault
            .lamports()
            .saturating_sub(vault_rent);

        // Read staked assets from the external staking info account if it has been initialized
        let staked_assets = if ctx.accounts.staking_info.to_account_info().data_is_empty() {
            0
        } else {
            let staking_data = ctx.accounts.staking_info.try_borrow_data()?;
            let staking_account = UserInfo::try_deserialize(&mut &staking_data[..])?;
            staking_account.amount
        };

        // Total assets is the sum of liquid SOL and staked SOL
        let total_assets_before = liquid_assets + staked_assets;
        let total_shares = bank_asset.total_shares;

        let shares_to_mint = if total_shares == 0 || total_assets_before == 0 {
            deposit_amount
        } else {
            (deposit_amount as u128 * total_shares as u128 / total_assets_before as u128) as u64
        };

        // Perform the actual SOL transfer from the user's wallet to the Bank Vault PDA
        // using the helper function.
        sol_transfer_from_user(
            &ctx.accounts.user,
            ctx.accounts.bank_vault.to_account_info(),
            &ctx.accounts.system_program,
            deposit_amount,
        )?;

        // Update the user's deposit record to reflect the new balance.
        user_reserve.shares += shares_to_mint;
        bank_asset.total_shares += shares_to_mint;

        Ok(())
    }
}
