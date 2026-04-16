# Phần Bốn - Tài khoản Token Được Liên Kết (ATA)

Bây giờ bạn đã học cách sử dụng PDA để quản lý các tài khoản tùy chỉnh, đã đến lúc ủy thác một khối xây dựng cơ bản khác của phát triển Solana - Các Tài khoản Token Được Liên Kết (ATA). Đây là các tài khoản đặc biệt được sử dụng để lưu trữ các token SPL bằng cách có thể dự đoán và thân thiện với ví.

Cho dù bạn đang xây dựng một vòi token, một giao thức cho vay, hoặc một kho tàng DAO, bạn sẽ cần hiểu cách ATA hoạt động để xử lý các chuyển giao hợp đồng một cách an toàn và hiệu quả.

Trong phần này, bạn sẽ:  
✅ Hiểu ATA là gì và tại sao chúng lại quan trọng  
✅ Hãy khai thác token SPL đầu tiên của bạn từ đầu  
✅ Tìm hiểu cách lấy và tạo ATA bằng Anchor TS client  
✅ Tích hợp ATA vào Ứng dụng Ngân hàng để cho phép gửi và rút token  

Cho đến cuối phần này, bạn sẽ có thể tạo, quản lý và tương tác với các tài khoản token SPL giống như một chuyên gia - đặt nền tảng cho bất cứ điều gì liên quan đến chuyển giao token, phần thưởng hoặc thanh toán.  
Hãy bắt đầu! 💰🚀

### Hãy nhớ ví dụ trước đây: Ứng dụng Ngân hàng 🏦
Trong phiên này, chúng tôi sẽ mở rộng Ứng dụng Ngân hàng để hỗ trợ các token SPL. Cụ thể, chúng tôi sẽ thêm hai lệnh mới:
+ `DepositToken` — cho phép người dùng gửi bất kỳ token SPL nào vào ngân hàng
+ `WithdrawToken` — cho phép người dùng rút token tương tự mà họ đã gửi trước đó

Nâng cấp này biến Ứng dụng Ngân hàng của bạn từ chỉ SOL thành một Vault đầy đủ nhận thức về token — một bước lớn hướng tới chức năng DeFi thực tế. Hãy xây dựng nó! 🧱💸

### 1. ATA là gì?
Một ATA thực chất là một PDA (Program Derived Address) — nó không được tạo ngẫu nhiên. Nó được lấy một cách xác định bằng cách sử dụng seeds:
```ts
[
  wallet_address,                 // The token owner's wallet address
  token_program_id,              // the SPL token program ID
  mint_address                   // The mint address of the SPL token
]
```
Các seeds này được chuyển đến hàm `find_program_address` của chương trình token được liên kết, với ID chương trình token được liên kết làm ID chương trình. Vì vậy, trong mã, nó giống như:
```ts
Pubkey.findProgramAddressSync(
  [
    wallet_address.toBuffer(),                       
    TOKEN_PROGRAM_ID.toBuffer(),             
    mint_address.toBuffer(),                         
  ],
  ASSOCIATED_TOKEN_PROGRAM_ID
)
```
Điều này có nghĩa là địa chỉ ATA có thể được tính toán ngoài chuỗi, không cần truy vấn blockchain.

✅ Giống như các PDA khác, ATA không có khóa riêng, và chỉ có thể được tạo hoặc ký bởi Chương trình Token Được Liên Kết. Đó là những gì làm cho ATA có thể dự đoán được và an toàn.

#### 🤔 Tại sao chúng ta cần ATA?
Trên Solana, người dùng không giữ token trực tiếp trong địa chỉ ví của họ. Thay vào đó, mỗi token SPL (như USDC, wSOL, v.v.) được lưu trữ trong Tài khoản Token — một tài khoản đặc biệt theo dõi số dư của một token cụ thể.

Tuy nhiên, một ví có thể tạo nhiều tài khoản token cho cùng một khoảng token mint. Điều này dẫn đến UX lộn xộn và nhầm lẫn cho cả người dùng và nhà phát triển.

💡 Đó là nơi Các Tài khoản Token Được Liên Kết (ATA) phát huy tác dụng.

Một Tài khoản Token Được Liên Kết (ATA) là một tài khoản token tiêu chuẩn được lấy cho một ví và một khoảng token mint cụ thể. Nó đảm bảo:
+ 1 ví 👤
+ 1 khoảng token mint 💰
+ 1 tài khoản token chính thức 📦

Không có bản sao. Không có nhầm lẫn. Nó trở thành tài khoản token chuẩn cho cặp (ví, mint) đó.

### 2. Mint SPL token đầu tiên của bạn
Bây giờ bạn đã hiểu ATA là gì, bạn có thể tự hỏi: "Chờ... trước khi tôi nhận ATA, tôi không cần một token trước không?" 😄

Chính xác!

May mắn thay, tạo một token SPL tùy chỉnh trên Solana rất dễ dàng — CLI `spl-token` thực hiện hầu hết công việc nặng cho bạn.

#### 🪙 Bước 1: Tạo Token Mới
Chạy lệnh sau để tạo token SPL của riêng bạn:
```bash
spl-token create-token
```

Bạn sẽ thấy kết quả đầu ra như:
```bash
Creating token FBUoe8bLbPBh4VcF4jwg1L53XZBdSJoERry16u26UnNL under program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

Address:  FBUoe8bLbPBh4VcF4jwg1L53XZBdSJoERry16u26UnNL
Decimals:  9

Signature: 2rdLqDZxCEkknspKLcPs1qmhg3CcPcsmAdeoKNRekEfqpLDGiHzSZwUQMNjxH3zYneDCLWbNDGGD2EqG6uqvcjpk
```

🎉 Chúc mừng! Bạn đã tạo thành công token SPL đầu tiên — rất dễ dàng phải không?! 😄

Muốn xem nó có thể làm gì khác không? Hãy thử:
```bash
spl-token create-token --help
```

#### 🧾 Bước 2: Tạo ATA của bạn

Trước khi bạn có thể nhận token, bạn cần một nơi để đặt chúng. Đó là nơi Tài khoản Token Được Liên Kết (ATA) phát huy tác dụng.

Tạo nó bằng cách chạy:
```bash
spl-token create-account <TOKEN_MINT_ADDRESS>
```
Example output:
```bash
Creating account 5jLc6jKV2ggRDRQXveSnYBZZ4PWqzadFVfsyuBEYgSAh

Signature: 4APfm58fXbbiPDUzFdsXoXXe8ojsPqRiYddbQBdX17mFHyCExUofQEW6i6NX7SMUfvVra59SjP5MxW6kCsnToFPa
```
Chỉ như vậy, bạn đã sẵn sàng nhận các token mới được tạo ra!

#### 💰 Bước 3: Mint Một Số Token!

Bây giờ bạn có thể mint token vào ATA của bạn:
```bash
spl-token mint <TOKEN_MINT_ADDRESS> <TOKEN_AMOUNT> <RECIPIENT_TOKEN_ACCOUNT_ADDRESS>
```
Ví dụ:
```bash
spl-token mint FBUoe8bLbPBh4VcF4jwg1L53XZBdSJoERry16u26UnNL 1000000 5jLc6jKV2ggRDRQXveSnYBZZ4PWqzadFVfsyuBEYgSAh
```
Output:
```bash
Minting 1000000 tokens
  Token: FBUoe8bLbPBh4VcF4jwg1L53XZBdSJoERry16u26UnNL
  Recipient: 5jLc6jKV2ggRDRQXveSnYBZZ4PWqzadFVfsyuBEYgSAh

Signature: 5WQEjynd3vD7zuwWSrLcksttdvnFWTJtPHpNK3WpJMNZ29ucW3uhiJTNX7QNdiF2EDpQfEyfGHou1euXusXcm1HU
```

#### 🧮 Bước 4: Kiểm tra Số dư Token của bạn

Để xác nhận rằng các token đã đến ATA của bạn:
```bash
spl-token balance <TOKEN_MINT_ADDRESS>
```

#### 🎉 Thế là xong!
Bạn vừa:

+ Tạo một token SPL tùy chỉnh
+ Thiết lập Tài khoản Token Được Liên Kết của bạn
+ Mint token vào đó

Bây giờ bạn đã sẵn sàng sử dụng token này trong dApp, hợp đồng thông minh hoặc chỉ gửi nó xung quanh 🚀

### 3. Derive and Create ATAs với Anchor TypeScript
Bây giờ bạn đã hiểu ATAs là gì, tại sao chúng quan trọng, và thành công trong việc tạo token SPL đầu tiên của bạn bằng CLI, đã đến lúc tiến hành bước tiếp theo — làm việc với ATAs theo cách lập trình bằng **Anchor TypeScript**.  

Gói `@solana/spl-token` cung cấp các công cụ bạn sẽ cần. Gói này được tự động bao gồm khi bạn chạy `anchor init`, vì vậy bạn có thể đơn giản nhập những gì bạn cần. Hãy xem xét các import trong `test/bank-app.ts`:
```ts
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
```

#### 🧮 Hiểu `getAssociatedTokenAddressSync`
Hàm này cho phép bạn một cách xác định tính toán địa chỉ ATA từ khoảng token mint và một chủ sở hữu:
```ts
export function getAssociatedTokenAddressSync(
    mint: PublicKey,
    owner: PublicKey,
    allowOwnerOffCurve = false,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): PublicKey {
    if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) throw new TokenOwnerOffCurveError();

    const [address] = PublicKey.findProgramAddressSync(
        [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
        associatedTokenProgramId,
    );

    return address;
}
```
+ `mint`: Địa chỉ mint token.
+ `owner`: Ví hoặc PDA sẽ sở hữu tài khoản token được liên kết.
+ `allowOwnerOffCurve`: Nếu `true`, cho phép địa chỉ off-curve (a.k.a PDA hoặc không phải địa chỉ ký) làm chủ sở hữu. Mặc định là `false`.
+ `programId`: Chỉ định chương trình token nào sẽ sử dụng. Mặc định là `TOKEN_PROGRAM_ID` (SPL Token v1 cổ điển). Nếu bạn đang làm việc với các token sử dụng các tính năng như phí chuyển, siêu dữ liệu hoặc chuyển bí mật, bạn nên sử dụng `TOKEN_2022_PROGRAM_ID` mới hơn.
+ `associatedTokenProgramId`: ID chương trình token được liên kết. Thường được để là mặc định `ASSOCIATED_TOKEN_PROGRAM_ID` cho cả hai tiêu chuẩn token.

Nếu bạn đang tạo một ATA cho một PDA (như một Vault), hãy chắc chắn đặt `allowOwnerOffCurve = true`, vì PDA ở ngoài đường cong theo thiết kế.

Ví dụ:
```ts
let tokenMint = new PublicKey("FBUoe8bLbPBh4VcF4jwg1L53XZBdSJoERry16u26UnNL") //bạn nên đặt khoảng token mint của bạn ở đây
let userAta = getAssociatedTokenAddressSync(tokenMint, provider.publicKey)
let bankAta = getAssociatedTokenAddressSync(tokenMint, BANK_APP_ACCOUNTS.bankVault, true)
```

#### 🏗️ Tạo ATA với `createAssociatedTokenAccountInstruction`
Hàm này tạo một hướng dẫn để khởi tạo một ATA trên chuỗi:
```ts
export function createAssociatedTokenAccountInstruction(
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): TransactionInstruction {
    return buildAssociatedTokenAccountInstruction(
        payer,
        associatedToken,
        owner,
        mint,
        Buffer.alloc(0),
        programId,
        associatedTokenProgramId,
    );
}
```

Các tham số chính:
+ `payer`: ví sẽ trả phí tiền thuê (phải ký giao dịch).
+ `associatedToken`: ATA được lấy (từ `getAssociatedTokenAddressSync`).
+ Phần còn lại giống như những gì chúng tôi giải thích ở trên 

#### 🧪 Gộp Tất cả Lại Với Nhau: Ví dụ trong bank-app.ts
Trong tệp kiểm tra của bạn, bạn có thể thấy điều gì đó như thế này:
```ts
if (await provider.connection.getAccountInfo(bankAta) == null) {
  preInstructions.push(createAssociatedTokenAccountInstruction(
    provider.publicKey,
    bankAta,
    BANK_APP_ACCOUNTS.bankVault,
    tokenMint
  ))
}

const tx = await program.methods.depositToken(new BN(1_000_000_000))
  .accounts({
    bankInfo: BANK_APP_ACCOUNTS.bankInfo,
    bankVault: BANK_APP_ACCOUNTS.bankVault,
    tokenMint,
    userAta,
    bankAta,
    userReserve: BANK_APP_ACCOUNTS.userReserve(provider.publicKey, tokenMint),
    user: provider.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId
  }).preInstructions(preInstructions).rpc();
console.log("Deposit token signature: ", tx);
```

Đây là những gì đang xảy ra:
+ Trước khi chạy `depositToken`, mã kiểm tra xem `bankAta` có tồn tại trên chuỗi hay không.
+ Nếu nó không tồn tại, hướng dẫn tạo ATA sẽ được thêm vào `preInstructions`.
+ Các `preInstructions` này chạy trước hướng dẫn `depositToken` chính, đảm bảo mọi thứ được thiết lập đúng cách.

⚠️ Nếu bạn bỏ qua bước `createAssociatedTokenAccountInstruction` và ATA không tồn tại, chương trình của bạn sẽ trả về một lỗi — token không thể được ký gửi vào một tài khoản không tồn tại.

🎉 Chúc mừng! Bây giờ bạn đã:
✅ Học cách buồn ATA bằng `@solana/spl-token`
✅ Tạo ATA cho cả người dùng và PDA được kiểm soát bởi chương trình
✅ Tích hợp hướng dẫn tạo ATA vào giao dịch Anchor

### 4. Đến lúc Xây dựng 💪
Bây giờ là lúc áp dụng mọi thứ bạn đã học! bạn sẽ hoàn thành một bộ bài tập có hướng dẫn để hoàn thành xây dựng ứng dụng Ngân hàng. Bạn sẽ thêm logic để xử lý rút token và hoàn thành dòng gửi/rút đầy đủ bằng cách sử dụng ATA — làm cho ứng dụng của bạn sẵn sàng làm việc với token SPL thực trên Solana.

🛠️ Các Tác vụ của bạn:
1. **Thực hiện `token_transfer_from_pda` trong `transfer_helper.rs`**
Hàm này nên chuyển bất kỳ token SPL nào (hiện tại, chỉ là Token V1 cổ điển) từ một PDA (như `BankInfo`) trở lại cho một người dùng.
Hãy chắc chắn sử dụng `invoke_signed()` (giống như trong quá trình chuyển SOL từ PDA) và bao gồm `signer_seeds` chính xác.

2. **Hoàn thành Hướng dẫn `WithdrawToken`**
Cho phép người dùng rút token SPL được ký gửi của họ từ Vault (`BankInfo` PDA) vào tài khoản token của chính họ.

3. **Viết Xét nghiệm trong `bank-app.ts`**
Và cuối cùng, đừng bao giờ quên viết xét nghiệm! Xác thực rằng logic rút của bạn hoạt động như mong đợi bằng cách sử dụng bộ xét nghiệm Anchor của bạn.

Sau khi bạn hoàn thành những tác vụ này, ứng dụng Ngân hàng của bạn sẽ hỗ trợ đầy đủ các khoản gửi và rút token SPL thông qua ATA.
🚀 Hãy bắt tay vào xây dựng!

bank-app/
├── Anchor.toml           # Cấu hình Anchor project
├── Cargo.toml            # Dependencies cho TypeScript/Node.js
├── package.json          # NPM packages
├── tsconfig.json         # TypeScript config
├── migrations/
│   └── deploy.ts         # Script deploy program lên Solana
├── programs/
│   └── bank-app/
│       ├── Cargo.toml    # Dependencies Rust cho program
│       ├── Xargo.toml    # Extended Rust config
│       └── src/
│           ├── lib.rs         # Entry point chính
│           ├── constant.rs    # Hằng số
│           ├── error.rs       # Định nghĩa lỗi tùy chỉnh
│           ├── state.rs       # Struct state (account data)
│           ├── transfer_helper.rs  # Helper functions
│           └── instructions/
│               ├── mod.rs              # Module definition
│               ├── initialize.rs       # Init bank
│               ├── deposit.rs          # Deposit SOL
│               ├── deposit_token.rs    # Deposit token SPL
│               ├── withdraw.rs         # Withdraw SOL
│               ├── withdraw_token.rs   # Withdraw token SPL
│               └── pause.rs            # Pause/unpause
└── tests/
    └── bank-app.ts       # Test file TypeScript