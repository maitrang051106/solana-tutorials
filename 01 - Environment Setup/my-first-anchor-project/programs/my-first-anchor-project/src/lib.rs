use anchor_lang::prelude::*;

declare_id!("5wbQm8iyMSfFoqvHfpoJ51AWKLfu8fdYkCfB1RTn66sp");

#[program]
pub mod my_first_anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
