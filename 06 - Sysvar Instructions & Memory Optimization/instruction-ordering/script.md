# Instruction Ordering & Memory Optimization - Solution Guide

## Part 1: Instruction Ordering

### Mục tiêu
Đảm bảo rằng instruction `approve` phải được gọi trước `execute`.

### Bước 1: Thêm constraint vào `Execute` struct
```rust
#[derive(Accounts)]
pub struct Execute<'info> {
    pub authority: Signer<'info>,

    /// CHECK: Instructions sysvar
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,
}
```
**Giải thích:** Thêm constraint `#[account(address = ...)]` để xác minh rằng account là Solana's instructions sysvar.

### Bước 2: Implement logic trong `execute` function
```rust
pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
    // Lấy current instruction index
    let current_index = instructions::load_current_index_checked(&ctx.accounts.instructions)? as usize;
    require!(current_index > 0, ErrorCode::MustApproveFirst);

    // Load instruction trước đó
    let previous_ix = instructions::load_instruction_at_checked(
        (current_index - 1) as u16,
        &ctx.accounts.instructions,
    )?;

    // Verify program_id
    require!(
        previous_ix.program_id == crate::ID,
        ErrorCode::MustApproveFirst
    );

    // Verify discriminator (8 bytes đầu)
    let expected_discriminator = anchor_lang::hash(b"global:approve").to_bytes()[0..8].to_vec();
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
```
**Giải thích:**
- `load_current_index_checked()`: Lấy index của instruction hiện tại
- `load_instruction_at_checked()`: Lấy instruction tại vị trí cụ thể
- Verify `program_id` và discriminator của instruction trước phải khớp

---

## Part 2: Large Data – Regular vs Zero-Copy

### Khái niệm
- **Regular Account**: Load toàn bộ data vào stack (có giới hạn kích thước)
- **Zero-Copy**: Đọc data trực tiếp từ account buffer (không copy vào stack)

### Regular Account Implementation

#### Bước 1: Định nghĩa struct
```rust
#[account]
pub struct LargeApprovalDataRegular {
    pub authority: Pubkey,
    pub approval_history: [u64; REGULAR_HISTORY_LEN],
}
```

#### Bước 2: Cập nhật space trong InitializeLargeApprovalRegular
```rust
#[account(
    init,
    payer = authority,
    space = 8 + std::mem::size_of::<LargeApprovalDataRegular>(),
    seeds = [b"approval_regular", authority.key().as_ref()],
    bump
)]
pub approval_data: Account<'info, LargeApprovalDataRegular>,
```

#### Bước 3: Cập nhật seeds trong ProcessLargeApprovalRegular
```rust
#[account(
    mut,
    seeds = [b"approval_regular", authority.key().as_ref()],
    bump
)]
pub approval_data: Account<'info, LargeApprovalDataRegular>,
```

#### Bước 4: Implement initialization
```rust
pub fn initialize_large_approval_regular(
    ctx: Context<InitializeLargeApprovalRegular>,
) -> Result<()> {
    let approval_data = &mut ctx.accounts.approval_data;
    approval_data.authority = ctx.accounts.authority.key();
    approval_data.approval_history = [0; REGULAR_HISTORY_LEN];
    Ok(())
}
```

#### Bước 5: Implement processing
```rust
pub fn process_large_approval_regular(ctx: Context<ProcessLargeApprovalRegular>) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp as u64;
    let approval_data = &mut ctx.accounts.approval_data;
    
    // Tìm slot trống đầu tiên
    for i in 0..approval_data.approval_history.len() {
        if approval_data.approval_history[i] == 0 {
            approval_data.approval_history[i] = timestamp;
            break;
        }
    }
    Ok(())
}
```

### Zero-Copy Implementation

#### Bước 1: Định nghĩa zero-copy struct
```rust
#[account(zero_copy)]
#[repr(C)]
#[derive(Copy, Clone, Default)]
pub struct LargeApprovalData {
    pub authority: [u8; 32],
    pub approval_history: [u64; 512],
}
```
**Giải thích:**
- `#[account(zero_copy)]`: Cho phép zero-copy reading
- `#[repr(C)]`: Memory layout tương thích C
- `Copy, Clone, Default`: Traits cần thiết

#### Bước 2: Cập nhật InitializeLargeApprovalZeroCopy
```rust
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
```

#### Bước 3: Cập nhật ProcessLargeApprovalZeroCopy
```rust
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
```

#### Bước 4: Implement initialization
```rust
pub fn initialize_large_approval_zero_copy(
    ctx: Context<InitializeLargeApprovalZeroCopy>,
) -> Result<()> {
    let mut data = ctx.accounts.approval_data.load_init()?;
    data.authority = ctx.accounts.authority.key().to_bytes();
    data.approval_history = [0; 512];
    Ok(())
}
```

#### Bước 5: Implement processing
```rust
pub fn process_large_approval_zero_copy(
    ctx: Context<ProcessLargeApprovalZeroCopy>,
) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp as u64;
    let mut data = ctx.accounts.approval_data.load_mut()?;
    
    // Tìm slot trống đầu tiên
    for i in 0..data.approval_history.len() {
        if data.approval_history[i] == 0 {
            data.approval_history[i] = timestamp;
            break;
        }
    }
    Ok(())
}
```

---

## Part 3: Multi-Send (Transfer to Multiple Recipients)

### Implement MultiSend function
```rust
pub fn multi_send(ctx: Context<MultiSend>, amounts: Vec<u64>) -> Result<()> {
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
```

**Giải thích:**
- `remaining_accounts`: Chứa các recipient accounts
- Kiểm tra từng recipient có writable không
- Dùng `system_instruction::transfer` để transfer lamport
- `invoke` để thực hiện cross-program invocation
