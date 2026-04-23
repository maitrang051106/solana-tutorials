use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction::transfer,
    },
};
use anchor_spl::token::{self, Token};

// HELPER FUNCTION: Transfer native SOL from a user's wallet to another account.
// This requires the user to sign the transaction.
pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    amount: u64,
) -> Result<()> {
    // Create the transfer instruction telling the System Program to move SOL
    let ix = transfer(signer.key, destination.key, amount);
    // Execute the instruction (CPI - Cross Program Invocation)
    invoke(
        &ix,
        &[
            signer.to_account_info(),
            destination,
            system_program.to_account_info(),
        ],
    )?;
    Ok(())
}

// HELPER FUNCTION: Transfer native SOL from a PDA (Program Derived Address) to another account.
// Since PDAs don't have private keys, the program "signs" for it using its seeds.
pub fn sol_transfer_from_pda<'info>(
    source: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    pda_seeds: &[&[&[u8]]], // The seeds needed to prove this program owns the PDA
    amount: u64,
) -> Result<()> {
    let ix = transfer(source.key, destination.key, amount);
    // invoke_signed is like invoke, but it allows the program to sign on behalf of a PDA
    invoke_signed(
        &ix,
        &[
            source,
            destination,
            system_program.to_account_info(),
        ],
        pda_seeds,
    )?;
    Ok(())
}

// HELPER FUNCTION: Transfer SPL tokens from a user to the bank.
// Requires the user to sign because they own the tokens.
pub fn token_transfer_from_user<'info>(
    from: AccountInfo<'info>,
    authority: &Signer<'info>,
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    // Set up the context for the CPI call to the Token Program
    let cpi_ctx: CpiContext<_> = CpiContext::new(
        token_program.to_account_info(),
        token::Transfer {
            from,
            authority: authority.to_account_info(),
            to,
        },
    );
    // Execute the token transfer
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

// HELPER FUNCTION: Transfer SPL tokens from the bank (PDA) to a user.
// The program must sign for the PDA using its seeds.
pub fn token_transfer_from_pda<'info>(
    from: AccountInfo<'info>,
    authority: AccountInfo<'info>, // The PDA authority
    to: AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    pda_seeds: &[&[&[u8]]], // Seeds required to sign for the authority PDA
    amount: u64,
) -> Result<()> {
    // Build the transfer instruction accounts
    let transfer_ix = token::Transfer {
        from,
        authority,
        to,
    };

    let cpi_ctx = CpiContext::new(
        token_program.to_account_info(),
        transfer_ix,
    );

    // .with_signer() is used because the authority is a PDA, so the program signs for it
    token::transfer(cpi_ctx.with_signer(pda_seeds), amount)?;
    Ok(())
}
