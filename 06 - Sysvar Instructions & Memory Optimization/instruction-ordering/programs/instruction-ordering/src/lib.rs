use anchor_lang::prelude::*;
use anchor_lang::solana_program::{hash::hash, sysvar::instructions};

declare_id!("2aKShZhCd5Xfy2jEiMLsUGfLU4r87EHowf74q2p5nLA2");

#[program]
pub mod exercise {
    use super::*;

    // ---------------- Part 1: Instruction Ordering ----------------

    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        // TODO: Implement approval logic (you can just log for now)
        msg!("Approval granted");
        Ok(())
    }

    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        // Check that previous instruction was `approve`
        let current_index = instructions::load_current_index_checked(&ctx.accounts.instructions)? as usize;
        require!(current_index > 0, ErrorCode::MustApproveFirst);

        let previous_ix = instructions::load_instruction_at_checked(
            current_index - 1,
            &ctx.accounts.instructions,
        )?;

        // Verify program_id matches
        require!(
            previous_ix.program_id == crate::ID,
            ErrorCode::MustApproveFirst
        );

        // Verify discriminator matches "approve" (first 8 bytes)
        let expected_discriminator = hash(b"global:approve").to_bytes()[0..8].to_vec();
        require!(
            previous_ix.data.len() >= 8,
            ErrorCode::MustApproveFirst
        );
        require!(
            previous_ix.data[0..8] == expected_discriminator[0..8],
            ErrorCode::MustApproveFirst
        );

        msg!("Executing with amount: {}", amount);
        Ok(())
    }

    // ---------------- Part 2: Large Data – Regular vs Zero-Copy ----------------

    pub fn initialize_large_approval_regular(
        ctx: Context<InitializeLargeApprovalRegular>,
    ) -> Result<()> {
        let approval_data = &mut ctx.accounts.approval_data;
        approval_data.authority = ctx.accounts.authority.key();
        approval_data.approval_history = [0; REGULAR_HISTORY_LEN];
        Ok(())
    }

    pub fn process_large_approval_regular(ctx: Context<ProcessLargeApprovalRegular>) -> Result<()> {
        let timestamp = Clock::get()?.unix_timestamp as u64;
        let approval_data = &mut ctx.accounts.approval_data;
        
        for i in 0..approval_data.approval_history.len() {
            if approval_data.approval_history[i] == 0 {
                approval_data.approval_history[i] = timestamp;
                break;
            }
        }
        Ok(())
    }

    pub fn initialize_large_approval_zero_copy(
        ctx: Context<InitializeLargeApprovalZeroCopy>,
    ) -> Result<()> {
        let mut data = ctx.accounts.approval_data.load_init()?;
        data.authority = ctx.accounts.authority.key().to_bytes();
        data.approval_history = [0; 512];
        Ok(())
    }

    pub fn process_large_approval_zero_copy(
        ctx: Context<ProcessLargeApprovalZeroCopy>,
    ) -> Result<()> {
        let timestamp = Clock::get()?.unix_timestamp as u64;
        let mut data = ctx.accounts.approval_data.load_mut()?;
        
        for i in 0..data.approval_history.len() {
            if data.approval_history[i] == 0 {
                data.approval_history[i] = timestamp;
                break;
            }
        }
        Ok(())
    }

    // ---------------- Part 3: Multi-Send ----------------

    pub fn multi_send<'info>(
        ctx: Context<'_, '_, '_, 'info, MultiSend<'info>>,
        amounts: Vec<u64>,
    ) -> Result<()> {
        require!(!amounts.is_empty(), ErrorCode::NoRecipients);
        require!(amounts.len() <= 10, ErrorCode::TooManyRecipients);

        let sender = &ctx.accounts.sender;
        let system_program = &ctx.accounts.system_program;
        let remaining_accounts = ctx.remaining_accounts;

        require!(
            remaining_accounts.len() == amounts.len(),
            ErrorCode::NoRecipients
        );

        for (i, amount) in amounts.iter().enumerate() {
            let recipient = &remaining_accounts[i];
            
            require!(recipient.is_writable, ErrorCode::RecipientNotWritable);

            let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
                sender.key,
                recipient.key,
                *amount,
            );

            anchor_lang::solana_program::program::invoke(
                &transfer_ix,
                &[sender.to_account_info(), recipient.clone(), system_program.to_account_info()],
            )?;
        }

        Ok(())
    }
}

// ---------------- Part 1 Accounts ----------------

#[derive(Accounts)]
pub struct Approve<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    pub authority: Signer<'info>,

    /// CHECK: Instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}

// ---------------- Part 2: Regular Account<T> ----------------

// TODO: Adjust this length to be "large but still compiles" under BPF stack limits.
// Later, you can experiment with increasing it to see stack usage errors.
pub const REGULAR_HISTORY_LEN: usize = 128;

#[account]
pub struct LargeApprovalDataRegular {
    pub authority: Pubkey,
    pub approval_history: [u64; REGULAR_HISTORY_LEN],
}

#[derive(Accounts)]
pub struct InitializeLargeApprovalRegular<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<LargeApprovalDataRegular>(),
        seeds = [b"approval_regular", authority.key().as_ref()],
        bump
    )]
    pub approval_data: Account<'info, LargeApprovalDataRegular>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessLargeApprovalRegular<'info> {
    #[account(
        mut,
        seeds = [b"approval_regular", authority.key().as_ref()],
        bump
    )]
    pub approval_data: Account<'info, LargeApprovalDataRegular>,

    pub authority: Signer<'info>,
}

// ---------------- Part 2: Zero-Copy AccountLoader<T> ----------------

#[account(zero_copy)]
#[repr(C)]
pub struct LargeApprovalData {
    pub authority: [u8; 32],
    pub approval_history: [u64; 512],
}

#[derive(Accounts)]
pub struct InitializeLargeApprovalZeroCopy<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<LargeApprovalData>(),
        seeds = [b"approval_zero_copy", authority.key().as_ref()],
        bump
    )]
    pub approval_data: AccountLoader<'info, LargeApprovalData>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessLargeApprovalZeroCopy<'info> {
    #[account(
        mut,
        seeds = [b"approval_zero_copy", authority.key().as_ref()],
        bump
    )]
    pub approval_data: AccountLoader<'info, LargeApprovalData>,

    pub authority: Signer<'info>,
}

// ---------------- Part 3: Multi-Send Accounts ----------------

#[derive(Accounts)]
pub struct MultiSend<'info> {
    /// Người gửi — bị debit lamport
    #[account(mut)]
    pub sender: Signer<'info>,
 
    pub system_program: Program<'info, System>,
    // remaining_accounts
}

// ---------------- Errors ----------------

#[error_code]
pub enum ErrorCode {
    #[msg("Must approve before executing")]
    MustApproveFirst,

    #[msg("Must provide at least one recipient")]
    NoRecipients,
 
    #[msg("Too many recipients, maximum is 10")]
    TooManyRecipients,
 
    #[msg("Recipient account must be writable")]
    RecipientNotWritable,
}
