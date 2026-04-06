# Phần Năm - Lệnh Gọi Chương Trình Chéo (CPI)

Bây giờ bạn đã biết cách làm việc với các token và ATA, đã đến lúc khám phá một trong những tính năng mạnh mẽ nhất của các hợp đồng thông minh Solana - Các Lệnh Gọi Chương Trình Chéo (CPI).

Các CPI cho phép một chương trình gọi và thực thi một cách an toàn các hướng dẫn trong một chương trình khác. Đây là cách các ứng dụng DeFi tích hợp với các chương trình token, oracle, staking Vault, và hơn thế nữa - cho phép các ứng dụng mô-đun, có thể kết hợp được trên toàn bộ hệ sinh thái Solana.

Trong phần này, bạn sẽ:  
✅ Hiểu CPI là gì và cách nó hoạt động bên dưới trong Anchor  
✅ Đi qua một ví dụ: cơn cơn cơo SOL từ Ứng dụng Ngân hàng bằng CPI  
✅ Xây dựng một Ứng dụng Staking SPL đơn giản và tích hợp nó với Ứng dụng Ngân hàng bằng CPI  

Cho đến cuối phần này, bạn sẽ có thể tương tác với các chương trình bên ngoài và xây dựng các giao thức có thể sáng tác với phần còn lại của hệ sinh thái Solana - một siêu năng lực cơ bản cho phát triển Solana nghiêm túc.

Hãy bắt đầu! 🔄💡

### 🏦 Mở rộng Ứng dụng Ngân hàng: Đầu tư qua CPI
Bạn đã biết rằng trong thế giới thực, các ngân hàng không chỉ nắm giữ tiền gửi của người dùng - họ sử dụng tiền đó, đầu tư nó để kiếm lợi nhuận. Ứng dụng Ngân hàng của chúng tôi sắp làm điều tương tự.

Trong phiên này, chúng tôi sẽ nâng cấp Ứng dụng Ngân hàng bằng khả năng đầu tư quỹ của người dùng vào các giao thức bên ngoài bằng cách sử dụng Cross-Program Invocation (CPI). Đây là cách các Vault DeFi thực tế, các nền tảng cho vay và DAO phát triển vốn trong khi giữ mọi thứ trên chuỗi và có thể kiểm toán được.

Chúng tôi sẽ hỗ trợ hai chức năng mới giúp cấp quyền cho cấp quyền Ngân hàng quản lý khoản đầu tư:
+ Cho phép cấp quyền ngân hàng đầu tư SOL từ Bank Vault vào một dApp khác
+ Cho phép cấp quyền ngân hàng rút SOL đã đầu tư trước đó từ dApp trở lại Vault

💡 Mô hình này tạo thành nền tảng cho các chiến lược lợi suất, Vault tự động và các hệ thống quản lý Vault trong DeFi Solana.

### 1. CPI là gì?
CPI, hoặc Cross-Program Invocation, là một tính năng trong Solana cho phép một chương trình gọi và thực thi một cách an toàn các hướng dẫn trong một chương trình khác - một cách an toàn và không yêu cầu phép.

Hãy nghĩ về nó như gọi một hàm từ một mô-đun khác — ngoại trừ cả hai "mô-đun" đều là các chương trình trên chuỗi. Điều này cho phép khả năng kết hợp, có nghĩa là bạn có thể xây dựng các ứng dụng tái sử dụng logic từ các chương trình hiện có như Chương trình Token, các giao thức staking, các thị trường cho vay, v.v.

#### 🧠 Tại sao CPI lại quan trọng?
✅ Tái sử dụng - Không cần phải phát minh lại bánh xe; chỉ cần gọi các chương trình hiện có.
✅ Mô-đunhóa - Xây dựng các ứng dụng sạch, có thể bảo trì bằng cách chia logic trên các chương trình.
✅ Khả năng tương tác - Chương trình của bạn có thể tương tác với các giao thức DeFi, DAO hoặc các ứng dụng tùy chỉnh khác.  

#### 🧩 CPI hoạt động như thế nào?
Khi một chương trình muốn gọi chương trình khác, nó thực hiện một Cross-Program Invocation:
1. Nó chuẩn bị các tài khoản cần thiết và bất kỳ dữ liệu hướng dẫn nào.
2. Nó gói chúng vào một `CpiContext`, tùy chọn bao gồm seeds ký nếu chương trình gọi sử dụng PDA làm Authority.
3. Nó gọi hàm trợ giúp CPI của chương trình đích. Anchor nội bộ xây dựng và gửi hướng dẫn CPI bằng cách sử dụng thời gian chạy của Solana.
4. Anchor nội bộ xây dựng và gửi hướng dẫn CPI bằng cách sử dụng thời gian chạy của Solana.

Trong Rust cấp thấp, điều này sẽ liên quan đến `invoke()` hoặc `invoke_signed()`, nhưng với Anchor, bạn thường không bao giờ cần gọi trực tiếp các chương trình đó — Anchor sẽ xử lý nó cho bạn bên dưới.
Đây là một cách sạch, an toàn và ergonomic để thực hiện CPI trong Anchor.

Trong hướng dẫn này, **Ứng dụng Ngân hàng** của bạn sẽ gọi **Ứng dụng Staking** của bạn bằng CPI để cơn cơo hoặc rút SOL thay mặt cho người dùng. Đây chính xác là cách các giao thức DeFi thực tế như yield Vault hoặc autocompounders hoạt động.

### 2. Ví dụ thực tế: Đầu tư SOL từ Ứng dụng Ngân hàng vào Ứng dụng Staking
Hãy xem CPI hoạt động như thế nào với một trường hợp sử dụng thực tế.

Trong phần này, chúng tôi sẽ nâng cấp Ứng dụng Ngân hàng để cấp quyền ngân hàng có thể đầu tư SOL từ Bank Vault vào một Ứng dụng Staking bên ngoài — bằng cách sử dụng lệnh gọi CPI. Điều này phản ánh cách các giao thức DeFi thực tế đưa vốn nhàn rỗi vào hoạt động để tạo lợi suất.

#### 🧱 Overview of the Staking App

Before we wire up the CPI, let’s first walk through the Staking App — a simple program that allows users (or another program) to stake and unstake SOL.  

Đây là cách nó hoạt động:
+ Users interact with a single `Stake` instruction that supports both staking and unstaking, depending on the `is_stake` boolean.
+ The app pays out a fixed APR of 5% to stakers.
+ The contract uses PDAs to store `UserInfo` accounts to track stake balance

📂 You can find the code in programs/staking-app:
```rust
    pub fn stake(ctx: Context<Stake>, amount: u64, is_stake: bool) -> Result<()> {
        ...
    }

    #[derive(Accounts)]
    pub struct Stake<'info> {
        /// CHECK:
        #[account(
            init_if_needed,
            payer = payer,
            seeds = [b"STAKING_VAULT"],
            bump,
            space = 0,
            owner = system_program::ID
        )]
        pub staking_vault: UncheckedAccount<'info>,

        #[account(
            init_if_needed,
            seeds = [b"USER_INFO", user.key().as_ref()],
            bump,
            payer = payer,
            space = 8 + std::mem::size_of::<UserInfo>(),
        )]
        pub user_info: Box<Account<'info, UserInfo>>,

        #[account(mut)]
        pub user: Signer<'info>,
        #[account(mut)]
        pub payer: Signer<'info>,
        pub system_program: Program<'info, System>,
    }
```
> 📝 Note: There’s only one instruction `Stake` used for both staking and unstaking — controlled by the `is_stake` flag. This keeps the code DRY, since the logic is nearly identical for both actions.  

Notice there are two signer accounts:
+ `user`: The logical owner of the stake (this will be our Bank Vault PDA)
+ `payer`: The signer who pays the account creation fee (rent fee)  

Sự tách biệt này là hoàn hảo cho Ứng dụng Ngân hàng của chúng tôi vì PDA Bank Vault (được sử dụng làm người dùng) sẽ không phải tài trợ rent, và Authority ngân hàng (một người ký thực sự) có thể bao trùm chi phí rent trong quá trình CPI. Điều này làm cho tích hợp trơn tru — không cần tiền ứng trước kho tiền bằng lamport chỉ để tạo một tài khoản thông tin người dùng mới.

#### 🚀 Sẵn sàng tích hợp
With the Staking App already deployed on devnet, there’s no need to redeploy or modify it. You can simply reuse the code and reference the same program ID when wiring up CPI from the Bank App.  
Bây giờ chúng ta đã chọn ứng dụng đầu tư mục tiêu (Ứng dụng Kho tiền cược), hãy tích hợp nó vào Ứng dụng Ngân hàng bằng Cross-Program Invocation (CPI).

First, add the staking-app as a dependency in the Bank App’s `Cargo.toml`:
```toml
[dependencies]
...
staking-app = {  path = "../staking-app", features = ["cpi"] }
```

Điều này cung cấp cho Ứng dụng Ngân hàng quyền truy cập vào giao diện CPI của Ứng dụng Kho tiền cược, cho phép chúng tôi gọi hướng dẫn cược của nó trực tiếp từ chương trình của chúng tôi.

#### 🧱 Tái cấu trúc nhỏ: Sắp xếp Hướng dẫn theo Vai trò
Khi Ứng dụng Ngân hàng của chúng tôi phát triển, đã đến lúc làm một chút làng sạch.
Trong phần này, chúng tôi sẽ tái cấu trúc cấu trúc dự án để tổ chức tốt hơn các hướng dẫn dựa trên ai được phép thực thi chúng:
+ `instructions/user/` — đối với các hướng dẫn mà người dùng thường xuyên có thể gọi (ví dụ: gửi, rút)
+ `instructions/authority/` — đối với các hướng dẫn được ưu tiên mà thẩm quyền ngân hàng có thể thực thi  

Điều này làm cho codebase có thể mở rộng hơn và dễ đọc hơn. Hướng dẫn `invest` mới — nơi thẩm quyền ngân hàng đặt cược hoặc đặt cược hủy SOL — sẽ nằm tại:
```bash
instructions/authority/invest.rs
```

#### 🛠️ Viết Hướng dẫn `invest`
Bây giờ Ứng dụng Ngân hàng của chúng tôi đã sẵn sàng CPI, hãy thực hiện hướng dẫn `invest` thực tế, cho phép thẩm quyền Ngân hàng đặt cược hoặc đặt cược hủy SOL vào Ứng dụng Kho tiền cược bên ngoài.  
Đây là mã đầy đủ:
```rust
#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(
        seeds = [BANK_INFO_SEED],
        bump
    )]
    pub bank_info: Box<Account<'info, BankInfo>>,

    /// CHECK: Bank Vault (PDA) that holds SOL deposits
    #[account(
        mut,
        seeds = [BANK_VAULT_SEED],
        bump,
        owner = system_program::ID
    )]
    pub bank_vault: UncheckedAccount<'info>,

    /// CHECK: CPI target staking vault
    #[account(mut)]
    pub staking_vault: UncheckedAccount<'info>,

    /// CHECK: CPI target user staking info (PDA)
    #[account(mut)]
    pub staking_info: UncheckedAccount<'info>,

    /// The Staking App program to invoke via CPI
    pub staking_program: Program<'info, StakingApp>,

    /// Bank authority — only this signer can invest
    #[account(mut, address = bank_info.authority)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```
**👇 Hãy phân tích một vài tài khoản liên quan đến CPI:**
+ `staking_vault`: Tài khoản kho tiền sở hữu bởi Ứng dụng Kho tiền cược. Đây là nơi lưu trữ SOL sau khi được đổ.

+ `staking_info`: Đây là tài khoản siêu dữ liệu đổ của người dùng trong Ứng dụng Kho tiền cược. Trong trường hợp của chúng tôi, "người dùng" là Bank Vault PDA — vì vậy điều này hoạt động như một bản ghi `UserInfo` được liên kết với kho tiền của ngân hàng.

+ `staking_program`: Một tham chiếu đến chính Ứng dụng Kho tiền cược, vì vậy Ứng dụng Ngân hàng có thể thực hiện Lệnh Gọi Chương Trình Chéo (CPI)

#### 🧠 Inside the Logic:`process()`
Đây là phần quan trọng nhất — lệnh gọi CPI chính nó:
```rust
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
```

##### `cpi::stake(...)`
Đây là một hàm trợ giúp được tạo bởi Anchor cho phép bạn gọi một hướng dẫn từ một chương trình khác (trong trường hợp này, Ứng dụng Kho tiền cược):
- Tên hàm `stake` tương ứng với hướng dẫn `stake` có thể truy cập CPI trong chương trình ứng dụng staking.
- Nó được nhập thông qua giao diện CPI nhờ vào cách thiết lập phụ thuộc trong `Cargo.toml`.
- Bên dưới, Anchor tạo ra một hàm ở đây làm:
  1. Xây dựng hướng dẫn.
  2. Chuẩn bị các siêu dữ liệu tài khoản.
  3. Sử dụng `invoke_signed` để thực hiện lệnh gọi CPI thực tế nếu có đặt hạt giống ký.

> ✅ Ý tưởng chính: Điều này trông giống như một lệnh gọi hàm Rust thông thường — nhưng nó thực sự là thực hiện một chương trình khác trên chuỗi!

Khối code nhỏ này là nơi tương tác chương trình chéo thực tế xảy ra — sử dụng chỉ một vài dòng, chúng tôi có thể an toàn và bảo mật quản lý quỹ từ Ứng dụng Ngân hàng thành một chiến lược đổ tạo lợi suất.

##### `CpiContext::new_with_signer(...)`
Đây là cách bạn xây dựng ngữ cảnh thực hiện cho một lệnh gọi CPI khi chương trình của bạn cần ký thay mặt một PDA.

Các tham số:
+ `program`: AccountInfo của chương trình đích — trong trường hợp của chúng tôi, staking_program.
+ `accounts`: Phiên bản có thể truy cập CPI của cấu trúc tài khoản mà chương trình đích mong đợi. Ở đây chúng tôi đang sử dụng `cpi::accounts::Stake`, đó là một cấu trúc khớp với cái được xác định trong staking-app.
+ `signer_seeds`: Một tham chiếu đến các hạt giống PDA được sử dụng để tái lấy và ký thay mặt PDA `bank_vault`.

##### `cpi::accounts::Stake`
Đây là phiên bản CPI của ngữ cảnh `Stake` được xác định trong `staking-app`:
```rust
#[derive(Accounts)]
pub struct Stake<'info> {
    pub staking_vault: AccountInfo<'info>,
    pub user_info: AccountInfo<'info>,
    pub user: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}
```
> Anchor tự động tạo một mod cpi::accounts cho mỗi chương trình bạn nhập có features = ["cpi"].
Bạn chịu trách nhiệm lắp ghép các tài khoản phù hợp ở đây bằng cách sử dụng `.to_account_info()` từ ngữ cảnh của bạn.

#### ✅ Tóm tắt
Khối này:
```rust
cpi::stake(CpiContext::new_with_signer(...), amount, is_stake)?;
```
là cách Ứng dụng Ngân hàng gọi an toàn vào Ứng dụng Kho tiền cược để đổ hoặc bỏ đổ SOL. Nó:
+ Xây dựng một ngữ cảnh CPI (`CpiContext`)
+ Cung cấp hạt giống ký để PDA `bank_vault` có thể ủy quyền giao dịch
+ Chuyển các dữ liệu tài khoản cấu trúc phù hợp với những gì ứng dụng staking mong đợi
+ Gọi hướng dẫn `stake` trong chương trình kia — như thể nó là một phần của chương trình hiện tại

Mẫu này minh họa sức mạnh của khả năng kết hợp trên Solana — chương trình của bạn có thể gọi vào bất kỳ chương trình nào và xây dựng logic phong phú, kết nối

#### 🧑‍💻 Điều tiếp theo là gì
Vì vậy, bạn đã thấy một ví dụ thế giới thực về cách Ứng dụng Ngân hàng có thể đầu tư tiền gửi của người dùng vào một chương trình trên chuỗi khác — Ứng dụng Kho tiền cược — bằng cách sử dụng Lệnh Gọi Chương Trình Chéo (CPI). Điều này phản ánh cách các ngân hàng truyền thống đầu tư quỹ nhàn rỗi.

Bây giờ đến lượt bạn.

### 3. Bạn Xây dựng Nó: Kho tiền cược Token bằng CPI 💼
Bạn đã học khái niệm về CPI và thấy nó hoạt động với kho tiền cược SOL — bây giờ là lúc áp dụng kiến thức đó và xây dựng một cái gì đó của riêng bạn.

Trong phần này, bạn sẽ mở rộng Ứng dụng Ngân hàng để hỗ trợ đầu tư token SPL thông qua CPI. Mục tiêu là phản ánh quy trình kho tiền cược tương tự mà bạn vừa tìm hiểu, nhưng với token SPL thay vì SOL.

Điều này sẽ cung cấp cho bạn kinh nghiệm thực tế viết các tích hợp CPI, quản lý tài khoản token và xây dựng logic kiểu DeFi trên Solana.

🛠️ Các Tác vụ của bạn: 
1. **Viết Các xét nghiệm cho Tích hợp CPI SOL Hiện tại**
Hướng dẫn `invest` đã được triển khai — tác vụ đầu tiên của bạn là viết một bài kiểm tra đảm bảo nó chính xác đổ và bỏ đổ SOL thông qua Ứng dụng Kho tiền cược.
Kiểm tra cả dòng đổ và bỏ đổ cẩn thận.  

2. **Xây dựng Chương trình Kho tiền cược Dựa trên Token**
Tạo một ứng dụng kho tiền cược đơn giản mới hỗ trợ bất kỳ token SPL nào và cung cấp APR cố định 5%, tương tự như phiên bản kho tiền cược SOL.
+ Hỗ trợ Đổ và Bỏ đổ thông qua một lệnh
+ Sử dụng đúng ATAs và PDA để lưu trữ token
+ Xử lý logic phần thưởng kho tiền cược một cách sạch sẽ  

3. **Mở rộng Ứng dụng Ngân hàng bằng Đầu tư Token**
Thêm một hướng dẫn mới vào Ứng dụng Ngân hàng của bạn:
+ `InvestToken` — điều này cho phép cơ quan ngân hàng đầu tư token SPL được gửi vào chương trình kho tiền cược mới của bạn bằng cách sử dụng CPI
+ Điều này sẽ giống như hướng dẫn `invest` mà bạn đã thấy, nhưng cho token thay vì SOL

4. **🧪 Viết Xét nghiệm cho Tất cả**
🔁 Và như mọi khi — đừng quên viết xét nghiệm cho:
+ Chương trình Kho tiền cược Token SPL mới của bạn
+ Hướng dẫn `InvestToken` trong Ứng dụng Ngân hàng

#### 🚀 Sẵn sàng Xây dựng?
Phần này là tất cả về việc áp dụng những gì bạn đã học — ghép lại với nhau PDA, ATA, CPI và kiểm tra để xây dựng một tính năng hoàn chỉnh từ đầu đến cuối.

Bạn đang xây dựng các mẫu DeFi thực tế bây giờ — và các kỹ năng bạn sử dụng ở đây chính xác là những gì các giao thức sản xuất trên Solana được xây dựng với.

Hãy xem bạn có thể tạo cái gì. 💪🌐























