use anchor_lang::prelude::*;

declare_id!("Demo54vM5eg59zRwWui5EQbia2jXcXwmefhupHmHYsST");

#[program]
pub mod demo {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn look_mum_it_has_an_instruction(ctx: Context<HelloWorld>) -> Result<()> {
        msg!("Hello World from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct HelloWorld {}
