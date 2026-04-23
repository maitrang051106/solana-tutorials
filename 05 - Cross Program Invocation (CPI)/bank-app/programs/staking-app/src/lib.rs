use anchor_lang::{prelude::*, system_program};

declare_id!("GQtXaoyDE71UGwEUy8tpuVW1c5GhhmEHcoJDc8vTMixZ");

pub mod transfer_helper;

#[program]
pub mod staking_app {
    use transfer_helper::{sol_transfer_from_pda, sol_transfer_from_user};

    use super::*;

    const STAKING_APR: u64 = 31_536_000; //1% per second
    const SECOND_PER_YEAR: u64 = 31_536_000;

    // The `stake` instruction handles both staking and unstaking SOL based on the `is_stake` flag.
    pub fn stake(ctx: Context<Stake>, amount: u64, is_stake: bool) -> Result<()> {
        let user_info = &mut ctx.accounts.user_info;

        let current_time: u64 = Clock::get()?.unix_timestamp.try_into().unwrap();
        // Calculate the elapsed time since the user's last update.
        let pass_time = if user_info.last_update_time == 0 {
            //just initialized
            0
        } else {
            current_time - user_info.last_update_time
        };

        // Calculate and add pending rewards based on a fixed APR of 5%.
        user_info.amount += user_info.amount * STAKING_APR * pass_time / 100 / SECOND_PER_YEAR;
        user_info.last_update_time = current_time;

        if amount != 0 {
            if is_stake {
                // If staking, transfer SOL from the user to the staking vault.
                sol_transfer_from_user(
                    &ctx.accounts.user,
                    ctx.accounts.staking_vault.to_account_info(),
                    &ctx.accounts.system_program,
                    amount,
                )?;

                // Update the user's staked balance.
                user_info.amount += amount;
            } else {
                // If unstaking, prepare the seeds for the PDA vault to sign the transfer.
                let pda_seeds: &[&[&[u8]]] = &[&[b"STAKING_VAULT", &[ctx.bumps.staking_vault]]];

                // Transfer SOL from the staking vault back to the user.
                sol_transfer_from_pda(
                    ctx.accounts.staking_vault.to_account_info(),
                    ctx.accounts.user.to_account_info(),
                    &ctx.accounts.system_program,
                    pda_seeds,
                    amount,
                )?;

                // Decrease the user's staked balance.
                user_info.amount -= amount;
            }
        }
        Ok(())
    }
}

// The `Stake` struct defines the accounts required for the `stake` instruction.
#[derive(Accounts)]
pub struct Stake<'info> {
    /// CHECK: The Staking Vault (PDA) that holds all staked SOL.
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"STAKING_VAULT"],
        bump,
        space = 0,
        owner = system_program::ID
    )]
    pub staking_vault: UncheckedAccount<'info>,

    // The PDA that tracks the user's staked balance and last update time for rewards.
    #[account(
        init_if_needed,
        seeds = [b"USER_INFO", user.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + std::mem::size_of::<UserInfo>(),
    )]
    pub user_info: Box<Account<'info, UserInfo>>,

    // The user who owns the stake. If called via CPI, this could be a PDA (like the Bank Vault).
    #[account(mut)]
    pub user: Signer<'info>,
    // The payer for account creation fees (rent). Separated from `user` to allow CPI from PDAs without funds for rent.
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct UserInfo {
    pub amount: u64,
    pub last_update_time: u64,
}
