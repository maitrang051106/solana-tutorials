use anchor_lang::prelude::*;

declare_id!("FJde1FVA7Fj8g7TxXGWVHuAj6UogQgvTAE3NK7mYv1E8");

#[program]
pub mod my_first_anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let name = "Mang Thu Trai";
        let age = 20;
        
        msg!("My name is {}", name);
        msg!("I'm {} years old", age);
        msg!("How are you?");
        msg!("I'm fine, thank you! And you?");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
