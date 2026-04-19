use anchor_lang::{
    prelude::*, // Import toàn bộ thư viện và các công cụ cốt lõi của Anchor Framework
    solana_program::{
        program::{invoke, invoke_signed}, // Các hàm để gọi các chương trình khác (Cross-Program Invocation - CPI)
        // invoke: Dùng khi tài khoản signer là ví người dùng (Signer)
        // invoke_signed: Dùng khi tài khoản signer là PDA (Program Derived Address) - cần cung cấp thêm seeds để chứng minh quyền sở hữu
        system_instruction::transfer,// Hàm để tạo một instruction chuyển SOL từ tài khoản này sang tài khoản khác
    },
};

//  transfer SOL from user
pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    amount: u64,
) -> Result<()> {
    let ix = transfer(signer.key, destination.key, amount);// Tạo một instruction chuyển SOL từ signer (người dùng) sang destination (két sắt)
    invoke(
        &ix,
        &[
            signer.to_account_info(), // Chuyển đổi Signer thành AccountInfo để truyền vào hàm invoke
            destination,
            system_program.to_account_info(),
        ],
    )?;
    Ok(())
}

// transfer sol from PDA
pub fn sol_transfer_from_pda<'info>(
    source: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    signers_seeds: &[&[&[u8]]], // Mảng 3 chiều chứa các seeds để chứng minh quyền sở hữu của PDA (bump cũng phải nằm trong seeds này)
    amount: u64,
) -> Result<()> {
    let ix = transfer(source.key, destination.key, amount);
    invoke_signed(
        &ix,
        &[
            source,// Nguồn tiền là PDA, nên không phải Signer mà chỉ là AccountInfo
            destination,// Đích đến là ví người dùng, cũng chỉ cần AccountInfo
            system_program.to_account_info(),
        ],
        signers_seeds,// Cung cấp seeds để chứng minh quyền sở hữu của PDA, cho phép invoke_signed chấp nhận instruction này
    )?;
    Ok(())
}
