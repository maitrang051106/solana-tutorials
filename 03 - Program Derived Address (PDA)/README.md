# Phần Ba - Địa chỉ Chương trình Được Lấy (PDA)

Bây giờ bạn đã thoải mái viết các chương trình Solana cơ bản, đã đến lúc giới thiệu một trong những khái niệm quan trọng nhất trong phát triển Solana — Program Derived Addresses (PDA). Các tài khoản đặc biệt này là chìa khóa để xây dựng các chương trình an toàn, có trạng thái có thể lưu trữ dữ liệu người dùng, quản lý Vault, kiểm soát quyền, v.v.

### Trong phần này, bạn sẽ:
✅ Hiểu PDA là gì và có thể hoạt động như thế nào  
✅ Khởi tạo các tài khoản bằng các PDA với seeds và bump  
✅ Tìm hiểu cách lấy PDA trong Anchor TS Client.  
✅ Hoàn thành ví dụ thực tế đầu tiên: ứng dụng Ngân hàng  

Cho đến cuối phần này, bạn sẽ có thể tạo và quản lý các tài khoản PDA một cách tự tin trong các chương trình Solana của mình, mở khóa khả năng xây dựng các hợp đồng thông minh mạnh mẽ hơn và phức tạp hơn.  
Đây vào đi! 🧠✨

### Hãy bắt đầu với một ví dụ thực tế: Ứng dụng Ngân hàng 🏦
Để hiểu PDA hoạt động như thế nào trong thực hành, hãy xem xét một chương trình ngân hàng đơn giản trên Solana.  
Trong ứng dụng này:

👤 Người dùng có thể gửi và rút SOL  
🛑 Một quản trị viên có thể tạm dừng chương trình để dừng tất cả hoạt động trong trường hợp khẩn cấp  
💾 Chương trình nên lưu trữ:
- Trạng thái toàn cầu trong một tài khoản PDA đặc biệt gọi là `BankInfo`
- Số dư riêng của mỗi người dùng trong các tài khoản PDA riêng lẻ gọi là `UserReserve`


### 1. PDA là gì?
Một Program Derived Address (PDA) là một loại tài khoản Solana đặc biệt được sở hữu bởi một chương trình, không phải bởi một ví trên đường cong (ví của người dùng) có khóa riêng. Điều này làm cho PDA trở thành xương sống của hầu hết các hợp đồng thông minh Solana — chúng cho phép chương trình của bạn quản lý an toàn trạng thái, tài sản và quyền mà không phụ thuộc vào ví được sở hữu bên ngoài.

PDA là:  
🔐 *Được kiểm soát bởi chương trình của bạn* — không có khóa riêng, chỉ chương trình của bạn mới có thể truy cập các PDA của nó, và không ai có thể giả mạo chữ ký của nó.  
🧠 *Xác định được* — chúng được tạo ra bằng cách sử dụng các đầu vào cố định (gọi là `seeds`) cộng với ID chương trình của bạn  
✍️ *Có khả năng ký giao dịch* — nhưng chỉ bằng cách sử dụng `invoke_signed()` với `seeds` của PDA bên trong chương trình của bạn

Trong chương trình ngân hàng của chúng tôi, chúng tôi sử dụng hai PDA để lưu trữ dữ liệu trong `state.rs`:
```rust
#[account]
#[derive(Default)]
pub struct BankInfo {
    pub authority: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct UserReserve {
    pub deposited_amount: u64,
}
```

- `BankInfo` là một PDA toàn cầu lưu trữ trạng thái của chương trình: người `authority`, và giá trị `bump` của Bank Vault.
- `UserReserve` là một PDA dành riêng cho người dùng để theo dõi số SOL mà mỗi người dùng đã gửi.

Các PDA này được lấy đơn định bằng cách sử dụng các seeds và thứ gọi là bump. Nhưng bump chính xác là gì — và tại sao chúng ta lưu trữ nó?

Khi tạo PDA, Solana yêu cầu rằng địa chỉ được lấy không nằm trên đường cong ed25519 (vì nếu không, ai đó có thể tìm thấy khóa riêng cho nó). Tuy nhiên, không phải mọi kết hợp seed đều tạo ra một địa chỉ off-curve hợp lệ.  

Để khắc phục điều này, họ thêm một số nhỏ — bump (một số nguyên không dấu 8 bit từ 0–255) — được điều chỉnh tự động trong quá trình tạo PDA để đảm bảo có một địa chỉ hợp lệ. Anchor xử lý tính toán bump một cách tự động khi bạn khởi tạo PDA. Nhưng nếu chương trình của bạn cần tái tạo hoặc ký thay mặt PDA đó, bạn phải lưu trữ bump để có thể tái tạo các hạt giống hoặc địa chỉ chính xác.  

👉 Trong ví dụ của chúng tôi, chúng tôi lưu trữ bump trong `BankInfo` vì chương trình sẽ cần PDA Bank Vault để ký các lệnh sau đó.

### 2. Khởi tạo một PDA
Bây giờ chúng ta đã hiểu PDA là gì, hãy bước qua cách tạo và khởi tạo một PDA trong Anchor.
Trong ứng dụng ngân hàng của chúng tôi, chúng tôi khởi tạo PDA `BankInfo` toàn cầu khi chương trình được thiết lập lần đầu tiên. Đây là cách nó trông trong `instructions/initialize.rs`:
```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [BANK_INFO_SEED],
        bump,
        payer = authority,
        space = 8 + std::mem::size_of::<BankInfo>(),
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,
}
```

##### 🧪 Hãy phân tích chi tiết:
- `init`: Yêu cầu Anchor tạo một tài khoản PDA mới. Bạn chỉ có thể khởi tạo một PDA một lần — nếu nó đã tồn tại, giao dịch sẽ thất bại và bị hoàn nguyên. Nếu bạn cần sử dụng lại cùng một địa chỉ PDA, trước tiên bạn phải đóng tài khoản hiện có.
- `seeds` = [...]: Đây là các giá trị được sử dụng để lấy đơn định địa chỉ PDA. Bạn có thể bao gồm nhiều giá trị seed tùy thuộc vào trường hợp sử dụng của bạn. Trong ví dụ này, chúng tôi khởi tạo một tài khoản trạng thái toàn cầu duy nhất, vì vậy chúng tôi chỉ sử dụng một seed tĩnh: `BANK_INFO_SEED`.
- `bump`: Yêu cầu Anchor tự động tính toán một giá trị bump hợp lệ cho kết hợp seed này (chúng tôi đã đề cập đến bumps trong phần trước 😄),
- `payer`: Tạo PDA yêu cầu không gian lưu trữ, và trên Solana, lưu trữ có chi phí tiền thuê. Trường payer chỉ định người ký sẽ trả chi phí tạo tài khoản — trong trường hợp này, là `authority`.
- `space`: Có bao nhiêu không gian (tính bằng byte) để cấp phát cho tài khoản. Càng nhiều không gian PDA cần, chi phí người trả phải trả càng cao.  

Bank Vault được khởi tạo ngay sau tài khoản `BankInfo`, nhưng có một số khác biệt chính đáng lưu tâm:
```rust
    #[account(
        init,
        seeds = [BANK_VAULT_SEED],
        bump,
        payer = authority,
        space = 0,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,
```
##### 🧩 Điều gì khác biệt ở đây?
+ *Không có lưu trữ dữ liệu*: Khác với `BankInfo`, PDA này không lưu trữ bất kỳ dữ liệu nào — do đó `space = 0`, và chúng tôi không định nghĩa một cấu trúc cho nó.
+ *Quản lý bởi Chương trình Hệ thống*: Tài khoản được tạo bằng `owner = system_program::ID`, có nghĩa là nó được quản lý bởi Chương trình Hệ thống, chẺ phải chương trình Anchor của bạn. Điều này có vẽ lạ nhương là có ý đị nhược khi bắt đầu.
+ *Tại sao tạo PDA này?*  
Vault này hoạt động như một đơn vị giữ quỹ tập trung cho toàn bộ ứng dụng của bạn. Vì đó là một PDA được lấy từ ID chương trình của bạn và một seed được biết, chương trình của bạn vẫn có thể ký cho nó và kiểm soát số dư SOL của nó.

**⚠️ Ghi chú Quan trọng**: Lý do chúng tôi sử dụng PDA được sở hữu bởi Chương trình Hệ thống là vì chỉ những tài khoản được sở hữu bởi Chương trình Hệ thống mới có thể tham gia vào các chuyển SOL gốc. Khi chuyển SOL bằng lệnh transfer, cả người gửi và người nhận đều phải là những tài khoản được sở hữu bởi hệ thống. Đó là lý do tại sao chúng tôi cấu trúc Vault theo cách này — để đóng vai trò là một nhóm SOL an toàn, được kiểm soát bởi chương trình mà những người dùng có thể gửi quỹ hoặc rút quỹ từ đó. Chúng tôi sẽ tìm hiểu sâu hơn về cách hoạt động của nó khi chúng tôi triển khai logic chuyển SOL thực tế trong phần tiếp theo.

Bây giờ cả hai PDA đều được tạo, hãy chuyển sang hàm process nơi chúng ta khởi tạo các trường của tài khoản `BankInfo` của chúng ta:
```rust
pub fn process(ctx: Context<Initialize>) -> Result<()> {
    let bank_info = &mut ctx.accounts.bank_info;

    bank_info.authority = ctx.accounts.authority.key();
    bank_info.is_paused = false;
    bank_info.bump = ctx.bumps.bank_vault;

    msg!("Bank initialized!");
    Ok(())
}
```
Ở đây chúng tôi đang:
- Lưu khóa công khai của cơ quan cấp quyền
- Đặt is_paused thành false theo mặc định
- Lưu trữ giá trị bump cho ký và tái Derive PDA trong tương lai

Điều đó kết thúc hướng dẫn `Initialize`.

Bây giờ, hãy xem xét cách chúng tôi tạo các tài khoản PDA dành riêng cho người dùng — cụ thể là `UserReserve` — được xử lý trong tệp `instructions/deposit.rs`:
```rust
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        init_if_needed,
        seeds = [USER_RESERVE_SEED, user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + std::mem::size_of::<UserReserve>(),
    )]
    pub user_reserve: Box<Account<'info, UserReserve>>,
}
```
Thoạt nhìn, điều này trông giống với cách chúng tôi khởi tạo `BankInfo` phải không? Nhưng có một số sự khác biệt chủ chot:
- `init_if_needed`: Chỉ thị này kiểm tra xem PDA đã tồn tại hay chưa. Nếu nó không tồn tại, Anchor sẽ tự động tạo nó; nếu nó tồn tại, PDA hiện có sẽ được tải một cách có thể thay đổi. Điều này hoàn hảo cho một lệnh như `Deposit`, có thể được gọi nhiều lần bởi cùng một người dùng - không cần phải viết logic bổ sung để kiểm tra xem tài khoản có tồn tại hay không trước khi sử dụng nó.
- `seeds`: Lần này, chúng tôi sử dụng hai seeds - seed không đổi `USER_RESERVE_SEED` và khóa công khai của người dùng `user.key().as_ref()` (được chuyển đổi thành `&[u8]`). Mẫu này đảm bảo rằng mỗi người dùng nhận được PDA duy nhất của riêng họ — vì vậy không có hai người dùng nào chia sẻ cùng một tài khoản UserReserve. Nó cũng có nghĩa là mỗi người dùng chỉ có thể có một PDA UserReserve được lấy theo cách này, điều này giúp với tính nhất quán và bảo mật.

Sau đó, chúng tôi xử lý logic gửi trong hàm `process` như thế này:
```rust
pub fn process(ctx: Context<Deposit>, deposit_amount: u64) -> Result<()> {
    if ctx.accounts.bank_info.is_paused {
        return Err(BankAppError::BankAppPaused.into());
    }

    let user_reserve = &mut ctx.accounts.user_reserve;

    sol_transfer_from_user(
        &ctx.accounts.user,
        ctx.accounts.bank_info.to_account_info(),
        &ctx.accounts.system_program,
        deposit_amount,
    )?;

    user_reserve.deposited_amount += deposit_amount;

    Ok(())
}
```

Trong hàm này, trước khi cho phép bất kỳ khoản gửi nào, chương trình trước tiên kiểm tra trạng thái của `BankInfo`:
```rust
if ctx.accounts.bank_info.is_paused {
    return Err(BankAppError::BankAppPaused.into());
}
```
Nếu ngân hàng bị tạm dừng (có thể do tình huống khẩn cấp hoặc nâng cấp), giao dịch sẽ bị từ chối với thông báo lỗi thích hợp.

Chúng tôi sau đó chuyển SOL từ người dùng đến PDA `BankInfo` — hoạt động như một Vault toàn cầu lưu giữ tất cả các quỹ được ký gửi.

Quá trình chuyển thực tế được xử lý bằng một hàm trợ giúp được xác định trong `transfer_helper.rs`:
```rust
//  transfer SOL from user
pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: AccountInfo<'info>,
    system_program: &Program<'info, System>,
    amount: u64,
) -> Result<()> {
    let ix = transfer(signer.key, destination.key, amount);
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
```
Vì người dùng là người ký trong trường hợp này, chúng tôi có thể đơn giản sử dụng `invoke()` để thực hiện quá trình chuyển nhượng.

Sau đó, khi chúng tôi triển khai các khoản rút, chương trình sẽ cần ký thay mặt PDA Bank Vault — và để làm điều đó, chúng tôi sẽ sử dụng `invoke_signed()`.

Cuối cùng, chúng tôi cập nhật PDA UserReserve của người dùng để phản ánh số tiền ký gửi mới:
```rust
user_reserve.deposited_amount += deposit_amount;
```
Bây giờ bạn đã biết cách tạo, khởi tạo và tương tác với PDAs bên trong chương trình, hãy chuyển sang phía máy khách.

➡️ Trong phần tiếp theo, chúng tôi sẽ tìm hiểu cách Derive các địa chỉ PDA từ máy khách TypeScript của Anchor để chúng tôi có thể gọi những lệnh này một cách thích hợp từ giao diện máy tính tiền hoặc tập lệnh.

### 3. Derive PDA trên Máy khách
Để tương tác với chương trình của bạn từ giao diện máy tính tiền hoặc tập lệnh (như gọi `initialize` hoặc `deposit`), bạn sẽ cần Derive cùng các địa chỉ PDA mà chương trình mong đợi. May mắn thay, Anchor làm cho điều này dễ dàng trên phía máy khách TypeScript.

Hãy xem cách làm điều đó bằng cách sử dụng logic tương tự mà chúng tôi sử dụng trong chương trình.

Các địa chỉ PDA được Derive bằng công thức này:
```ts
PublicKey.findProgramAddressSync([SEEDS], PROGRAM_ID)
```
- `SEEDS` là một mảng byte (Buffer) phải khớp chính xác với những gì chương trình sử dụng.
- `PROGRAM_ID` là ID của chương trình triển khai của bạn.

Trong ứng dụng ngân hàng của chúng tôi, chúng tôi Derive hai PDA.

Đây là cách chúng được xác định trong `tests/bank-app.ts`:
```ts
const BANK_APP_ACCOUNTS = {
    bankInfo: PublicKey.findProgramAddressSync(
        [Buffer.from("BANK_INFO_SEED")],
        program.programId
    )[0],
    bankVault: PublicKey.findProgramAddressSync(
        [Buffer.from("BANK_VAULT_SEED")],
        program.programId
    )[0],
    userReserve: (pubkey: PublicKey) => PublicKey.findProgramAddressSync(
        [
            Buffer.from("USER_RESERVE_SEED"),
            pubkey.toBuffer()
        ],
    program.programId
    )[0],
  }
```
Lưu ý rằng `userReserve` là một hàm. Điều này cho phép bạn động sinh một PDA duy nhất cho mỗi người dùng dựa trên khóa công khai của họ.

Bằng cách Derive PDA theo cách này, bạn đảm bảo rằng máy khách của bạn luôn sử dụng các tài khoản chính xác — chính xác cơ với cách chương trình của bạn mong đợi.

### 4. Đến lúc Xây dựng 💪 (Lượt của bạn!)
Bây giờ bạn đã hiểu cách tạo và sử dụng PDAs, đã đến lúc bạn đưa nó vào thực hành.

🛠️ Các Tác vụ của bạn:
1. **Thực hiện `sol_transfer_from_pda` trong `transfer_helper.rs`**  
Hàm này nên chuyển SOL từ một PDA (như BankInfo) trở lại cho một người dùng.

Vì một PDA không thể ký chính nó, bạn sẽ cần sử dụng `invoke_signed()` và truyền `signers_seeds` chính xác

2. **Hoàn thành Lệnh `Withdraw`**  
Cho phép người dùng rút SOL được ký gửi của họ từ Vault (tức là từ Bank Vault PDA).

Chúng tôi đã cung cấp các seeds PDA cho lệnh này — chỉ cần cắm chúng vào để sử dụng `invoke_signed()` một cách thích hợp.

3. **Thực hiện Lệnh `Pause`**  
Thêm logic để dừng hoặc tiếp tục ứng dụng. Chỉ có Authority được xác định trong BankInfo mới có thể làm điều này.  
💡 Gợi ý: Sử dụng `#[account(address = ...)]` của Anchor để hạn chế quyền truy cập.

4. **Đừng quên viết Tests trong `bank-app.ts`**  
Tạo các bài kiểm tra cho các lệnh `Withdraw` và `Pause` mới của bạn.  
Hãy chắc chắn:
- Rút số tiền đúng và xác minh `UserReserve` được cập nhật.
- Kiểm tra tạm dừng và tiếp tục ứng dụng và đảm bảo gửi/rút bị chặn khi tạm dừng.  

Khi bạn hoàn thành các tác vụ này, bạn sẽ có kinh nghiệm thực tế trong quản lý Authority PDA, bảo mật hướng dẫn và ký tên thay mặt PDA — những khối xây dựng thiết yếu cho bất kỳ nhà phát triển Solana nghiêm túc nào.

🚀 Hãy bắt đầu xây dựng!














