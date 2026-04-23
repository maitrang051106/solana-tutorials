// This file contains the logic for the bank authority to invest deposited SOL into an external Staking App via CPI.
use anchor_lang::{prelude::*, system_program};

use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED},
    error::BankAppError,
    state::BankInfo,
};
use staking_app::{cpi, program::StakingApp};

// The `Invest` struct defines the accounts required for the CPI investment instruction.
#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    ///CHECK: Bank Vault (PDA) that holds SOL deposits. This acts as the "user" making the stake in the Staking App.
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    ///CHECK: The target vault in the external Staking App where SOL will be deposited.
    #[account(mut)]
    pub staking_vault: UncheckedAccount<'info>,
    ///CHECK: The user info PDA in the Staking App that will track the bank vault's staked balance.
    #[account(mut)]
    pub staking_info: UncheckedAccount<'info>,
    // The program ID of the external Staking App we are calling via CPI.
    pub staking_program: Program<'info, StakingApp>,

    // Only the authorized bank manager can call this instruction.
    #[account(mut, address = bank_info.authority)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Invest<'info> {
    pub fn process(ctx: Context<Invest>, amount: u64, is_stake: bool) -> Result<()> {
        if ctx.accounts.bank_info.is_paused {
            return Err(BankAppError::BankAppPaused.into());
        }

        // We prepare the signer seeds because the Bank Vault PDA must "sign" the CPI call
        // to authorize actions on its behalf within the Staking App.
        let invest_vault_seeds: &[&[&[u8]]] = &[&[BANK_VAULT_SEED, &[ctx.accounts.bank_info.vault_bump]]];

        // This makes the Cross-Program Invocation (CPI) to the `stake` instruction of the Staking App.
        cpi::stake(
            CpiContext::new_with_signer(
                ctx.accounts.staking_program.to_account_info(),
                cpi::accounts::Stake {
                    staking_vault: ctx.accounts.staking_vault.to_account_info(),
                    user_info: ctx.accounts.staking_info.to_account_info(),
                    user: ctx.accounts.bank_vault.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
                invest_vault_seeds,
            ),
            amount,
            is_stake,
        )?;

        Ok(())
    }
}
