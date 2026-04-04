# Phần Hai - Triển khai, Kiểm tra, Nâng cấp và Đóng

Ở phần trước, chúng ta đã khởi tạo my-first-anchor-project. Bây giờ, chúng ta sẽ tiến thêm một bước bằng cách tìm hiểu cách:

✅ Triển khai chương trình đến Devnet  
✅ Viết và chạy các trường hợp kiểm tra bằng Anchor  
✅ Nâng cấp chương trình sau khi thực hiện các thay đổi  
✅ Và cuối cùng, đóng chương trình để lấy lại SOL bị khóa trong các tài khoản bộ đệm  

Hãy bắt tay vào công việc và hoàn thành vòng đời đầy đủ của chương trình Anchor đầu tiên của bạn!

### 1. Triển khai

Sau khi dự án Anchor của bạn được khởi tạo, Anchor sẽ tạo ra một chương trình ví dụ cơ bản để giúp bạn bắt đầu. Chương trình mẫu này bao gồm một hàm khởi tạo đơn giản và sẵn sàng để triển khai lên mạng Solana.  

Đây là cách chương trình mặc định trông như thế:
```rust
use anchor_lang::prelude::*;

declare_id!("GDGNBNAhHGmMKcxVxXBTTJ8xytmdjNuFWsr2igqhck27");

#[program]
pub mod my_first_anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
```

Hãy phân tích chi tiết điều này.
Dòng đầu tiên bạn sẽ nhận thấy là ID được khai báo của chương trình:
```rust
declare_id!("GDGNBNAhHGmMKcxVxXBTTJ8xytmdjNuFWsr2igqhck27");
```


Đây là **ID chương trình** (giống như địa chỉ hợp đồng) sẽ được sử dụng sau khi triển khai. ID thực tế được xác định bởi keypair nằm tại:
```
my-first-anchor-project/target/deploy/my_first_anchor_project-keypair.json
```
ID chương trình của bạn có thể khác với ID được hiển thị ở trên, và bạn có thể tạo một keypair ngẫu nhiên mới nếu cần.

Tiếp theo, chúng ta có phần chính của chương trình:
```rust
#[program]
pub mod my_first_anchor_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}
```
Ví dụ này rất đơn giản. Nó chỉ định nghĩa một phương thức gọi là `initialize`, hiện tại không bao gồm bất kỳ logic nào - nó chỉ trả về `Ok(())` khi được gọi.

Bây giờ, để triển khai chương trình đến devnet, bạn cần xây dựng nó trước.
Chạy lệnh sau:

```bash
anchor build
```

Kết quả đầu ra sẽ trông giống như thế này:
```bash
warning: unused variable: `ctx`
 --> programs/my-first-anchor-project/src/lib.rs:9:23
  |
9 |     pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
  |                       ^^^ help: if this is intentional, prefix it with an underscore: `_ctx`
  |
  = note: `#[warn(unused_variables)]` on by default

warning: `my-first-anchor-project` (lib) generated 1 warning (run `cargo fix --lib -p my-first-anchor-project` to apply 1 suggestion)
    Finished release [optimized] target(s) in 37.40s
```
Bây giờ bạn có thể bỏ qua cảnh báo. 
Sau khi bản dựng hoàn thành, bạn sẽ tìm thấy tệp `.so` được tạo tại:

```
my-first-anchor-project/target/deploy/my_first_anchor_project.so
```

Tệp `.so` này là phiên bản được biên dịch của chương trình của bạn và sẽ được sử dụng để triển khai lên Solana Devnet.
Ngoài ra, IDL và các loại TypeScript cũng được tạo tại:
```
target/idl/my_first_anchor_project.json
target/types/my_first_anchor_project.ts
```
Chúng ta sẽ để các tệp này nguyên vẹn bây giờ và xem lại chúng trong phần kiểm tra.

Bây giờ bạn đã sẵn sàng triển khai chương trình! Chạy lệnh sau:
```bash
solana program deploy target/deploy/my_first_anchor_project.so --program-id target/deploy/my_first_anchor_project-keypair.json
```

Bạn sẽ thấy kết quả đầu ra tương tự như thế này:
```bash
Program Id: GDGNBNAhHGmMKcxVxXBTTJ8xytmdjNuFWsr2igqhck27
```

🎉 **Xin chúc mừng!** Bạn đã triển khai thành công chương trình Solana đầu tiên của mình lên Devnet.  

Bạn cũng có thể cấu hình `Anchor.toml` của mình để chỉ định cụm devnet:
```
cluster = "Devnet"
```
Sau đó, triển khai bằng Anchor CLI:
```bash
anchor deploy
```

Điều này thuận tiện cho phát triển và kiểm tra máy cục bộ và devnet, nhưng **không được khuyến khích cho** triển khai mainnet.


---

##### ⚠️ Tại sao không sử dụng `anchor deploy` trên Mainnet?

Trên mainnet, `anchor deploy` thường thất bại do các vấn đề độ tin cậy của RPC. Thay vào đó, tốt hơn là sử dụng lệnh `solana program deploy` với một nhà cung cấp RPC cụ thể.  

Ví dụ, sử dụng cờ `--use-rpc` với một điểm cuối RPC chất lượng cao, riêng tư:

```bash
solana program deploy target/deploy/my_first_anchor_project.so --program-id target/deploy/my_first_anchor_project-keypair.json --use-rpc
```

### 2. Kiểm tra

Sau khi xây dựng hợp đồng thông minh Solana của bạn bằng Anchor, điều quan trọng là kiểm tra nó và đảm bảo nó hoạt động như dự kiến. Anchor làm cho kiểm tra trở nên đơn giản bằng cách sử dụng TypeScript và Mocha.

Hãy đi qua cách chạy một bài kiểm tra cơ bản bằng cách sử dụng hàm `initialize()` mà chúng ta đã tạo trong chương trình của mình.

Anchor tự động tạo tệp kiểm tra khi bạn khởi tạo dự án của mình. Bạn có thể tìm thấy nó trong thư mục `tests/`.

Tệp: `tests/my-first-anchor-project.ts`

Đây là nội dung của nó:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyFirstAnchorProject } from "../target/types/my_first_anchor_project";

describe("my-first-anchor-project", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MyFirstAnchorProject as Program<MyFirstAnchorProject>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
```

Hãy xem xét tệp này.

Trước tiên, hãy lưu ý tệp client TypeScript được tạo bằng cách chạy `anchor build` trước đó được nhập vào tệp kiểm tra:
```typescript
import { MyFirstAnchorProject } from "../target/types/my_first_anchor_project";
```
Quá trình nhập này cho phép mã kiểm tra của bạn hiểu cấu trúc của chương trình và sử dụng nó với đầy đủ an toàn kiểu.

Tiếp theo, bài kiểm tra thiết lập nhà cung cấp Anchor bằng cách sử dụng cấu hình môi trường:
```typescript
anchor.setProvider(anchor.AnchorProvider.env());
```
Điều này thông báo cho Anchor biết sử dụng điểm cuối RPC và cài đặt ví mà bạn đã định nghĩa trong `Anchor.toml` — ví dụ, kết nối với Devnet và sử dụng cặp khóa cục bộ của bạn.

Cuối cùng, đây là bài kiểm tra thực tế chạy chương trình của bạn:
```typescript
  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
```
Điều này gọi phương thức `initialize()` từ chương trình của bạn. Hàm `.rpc()` sẽ gửi giao dịch đến Solana Devnet, chờ xác nhận và trả về mã băm giao dịch.

Bây giờ bạn đã sẵn sàng kiểm tra chương trình, sử dụng lệnh này để chạy bài kiểm tra:
```bash
anchor run test
```

Bạn sẽ thấy kết quả đầu ra giống như thế này trong terminal của bạn:
```bash
  my-first-anchor-project
Your transaction signature 3iFa2ASp4mcivVr2RjiqvUeVDwe1vcasp31A9vxperVRvPttcod9DqLyaY8kWu5d5owS6QuoJw5zfFDpBvb1jFqU
    ✔ Is initialized! (1362ms)


  1 passing (1s)
```

✅ Chúc mừng! Bài kiểm tra của bạn đã vượt qua, và chương trình của bạn đã được khởi tạo thành công.  

Bạn thậm chí có thể sao chép mã băm giao dịch và xem trên [Solscan](https://solscan.io/tx/3iFa2ASp4mcivVr2RjiqvUeVDwe1vcasp31A9vxperVRvPttcod9DqLyaY8kWu5d5owS6QuoJw5zfFDpBvb1jFqU?cluster=devnet) để xem nó hoạt động

### 3. Nâng cấp

Sau khi triển khai chương trình Anchor của bạn, bạn có thể muốn thực hiện các thay đổi hoặc thêm các tính năng mới. Thay vì tạo một chương trình mới từ đầu, Anchor cho phép bạn nâng cấp chương trình hiện có của mình — miễn là bạn là người có thẩm quyền nâng cấp.

Hãy đi qua cách nâng cấp chương trình của bạn sau khi thực hiện những thay đổi nhỏ.

Trong hàm `initialize()` của bạn, hãy thêm một số ghi nhạp để thể hiện cách `msg!()` hoạt động:
```rust
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let name = "Nhat";
    let age = 23;

    msg!("My name is {}", name);
    msg!("I'm {} years old", age);
    msg!("This is my first anchor project!");

    Ok(())
}
```
Các ghi nhạp này sẽ xuất hiện trong kết quả đầu ra giao dịch và vô cùng hữu ích để gỡ lỗi, kiểm tra, và theo dõi hành vi của chương trình của bạn trong quá trình thực hiện. Bạn sẽ thấy mình thường xuyên sử dụng `msg!()` khi dự án của bạn phát triển.

Ngoài ra, các ghi nhạp này cũng có thể được thu thập bởi cơ sở hạ tầng phía sau của bạn để lưu trữ những thông tin quan trọng hoặc kích hoạt các quá trình ngoài chuỗi dựa trên các sự kiện trên chuỗi.

Bây giờ, hãy làm một đánh giá nhanh về những gì bạn đã học trong Phần 1 😄

Nâng cấp chương trình Anchor của bạn hầu như giống nhau như triển khai nó lần đầu tiên. Đơn giản chỉ cần xây dựng chương trình được cập nhật của bạn bằng Anchor CLI, sau đó triển khai phiên bản mới bằng Solana CLI — giống như chúng ta đã làm trước!

Miễn là bạn là thẩm quyền nâng cấp, quá trình này là thẳng băng và không có rắc rối.

Everything seemed to go well, right? But now you're seeing an error like this:
```bash
================================================================================
Recover the intermediate account's ephemeral keypair file with
`solana-keygen recover` and the following 12-word seed phrase:
================================================================================
stereo chair because cigar taxi stem celery embrace render autumn question quote
================================================================================
To resume a deploy, pass the recovered keypair as the
[BUFFER_SIGNER] to `solana program deploy` or `solana program write-buffer'.
Or to recover the account's lamports, pass it as the
[BUFFER_ACCOUNT_ADDRESS] argument to `solana program close`.
================================================================================
Error: Deploying program failed: RPC response error -32002: Transaction simulation failed: Error processing Instruction 0: account data too small for instruction [3 log messages]
```

Lỗi này có nghĩa là tài khoản miễn tiền thuê được sử dụng để lưu trữ dữ liệu chương trình của bạn không còn có đủ không gian để chứa phiên bản mới của chương trình. Thậm chí một nâng cấp nhỏ cũng có thể làm cho tệp nhị phân chương trình của bạn lớn hơn một chút, yêu cầu thêm dung lượng lưu trữ.

Nếu bạn chưa quen với cơ chế tiền thuê của Solana, đừng lo lắng — đó là một khái niệm quan trọng đảm bảo chi phí lưu trữ được phân phối công bằng trên chuỗi. Bạn có thể tìm hiểu thêm về nó tại đây:

👉 [What is Rent on Solana and How to Calculate it](https://www.quicknode.com/guides/solana-development/getting-started/understanding-rent-on-solana)

Bây giờ câu hỏi lớn là: **Chúng ta thực sự cần mở rộng bao nhiêu không gian?**

Chắc chắn, nếu bạn cảm thấy hào phóng (hoặc chỉ là giàu 😄), bạn có thể dự trữ nhiều không gian hơn cần thiết — nhưng hãy nhận ra rằng không gian bổ sung sẽ tốn nhiều SOL hơn, vì tiền thuê dựa trên kích thước lưu trữ.

Vì vậy, biết yêu cầu kích thước chính xác là rất quan trọng.

Trước tiên, bạn có thể kiểm tra kích thước hiện tại của chương trình triển khai của mình bằng cách chạy:
```bash
solana program show <YOUR_PROGRAM_ID>
```

Bạn sẽ thấy kết quả đầu ra tương tự như thế này:
```bash
Program Id: GDGNBNAhHGmMKcxVxXBTTJ8xytmdjNuFWsr2igqhck27
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: 3i6z1Wi9oFXEU2NdVVeNf89DdNKJdwhuHRcGb2MMdUT4
Authority: jixspQw81GQVo969PPNeK7WteDhvWVFWhcLfLoMiPo2
Last Deployed In Slot: 380934198
Data Length: 180408 (0x2c0b8) bytes
Balance: 1.25684376 SOL
```
Ở đây, độ dài dữ liệu hiện tại là 180.408 byte.

Tiếp theo, hãy tìm kích thước của tệp `.so` mới được xây dựng bởi Anchor:
```bash
stat -f%z target/deploy/my_first_anchor_project.so 
```

trên Linux nó là
```bash
stat -c %s target/deploy/bank_app.so 
```

Điều này sẽ trả về 181.272 byte. Điều đó có nghĩa là phiên bản mới của chương trình của bạn lớn hơn một chút. Vì vậy, bạn sẽ cần mở rộng tài khoản chương trình của mình thêm `181272 - 180408 = 864` byte

Bây giờ bạn có thể mở rộng không gian được phân bổ của chương trình trước khi nâng cấp:
```bash
solana program extend <YOUR_PROGRAM_ID> 864
```
Và bạn đã sẵn sàng!

Bây giờ bạn đã sẵn sàng để nâng cấp chương trình — hãy tiếp tục chạy lệnh triển khai lại.
Nếu mọi thứ diễn ra suôn sẻ, chương trình của bạn nên được nâng cấp thành công!

Để xác minh rằng phiên bản mới đang hoạt động, hãy chạy bài kiểm tra của bạn lại: `anchor run test`

Bạn sẽ thấy kết quả đầu ra tương tự như:
```bash
  my-first-anchor-project
Your transaction signature hnN1ePkVLiKTQ1XT1NZbMyZZhzMnSEpUBiojSN2NVEDiUAdCQQkwbWDYDm74aWksUD7wMqo9EufFfwDw92PPenx
    ✔ Is initialized! (1525ms)


  1 passing (2s)
```

Điều này xác nhận rằng nâng cấp của bạn đã thành công và mã mới — bao gồm hàm `initialize()` được cập nhật của bạn — đang chạy đúng cách.

Nếu bạn muốn xem lại kết quả đầu ra ghi nhạp, bạn có thể kiểm tra giao dịch trên [Solscan](https://solscan.io/txhnN1ePkVLiKTQ1XT1NZbMyZZhzMnSEpUBiojSN2NVEDiUAdCQQkwbWDYDm74aWksUD7wMqo9EufFfwDw92PPenx?cluster=devnet)  

<img src="../Example Images/02-UpgradeProgramLog.png" alt="upgrade program log" width="1000" height="300">

### 4. Close
Tại một số thời điểm, bạn có thể muốn hủy hoặc dọn dẹp một chương trình triển khai — đặc biệt là khi làm việc trong môi trường phát triển hoặc kiểm tra. Solana cho phép bạn đóng một chương trình và lấy lại SOL được sử dụng cho lưu trữ miễn tiền thuê. Điều này hữu ích khi:

- Bạn đã kết thúc kiểm tra và không còn cần chương trình nữa.
- Bạn muốn triển khai lại từ đầu.
- Bạn đang quản lý lưu trữ trên chuỗi và chi phí.

Khi bạn đóng một chương trình, các lamports miễn tiền thuê được giữ bởi tài khoản dữ liệu chương trình được trả lại cho một người nhận của bạn lựa chọn (thường là ví của bạn), và chương trình trở nên không thể thực thi. Điều quan trọng cần lưu ý:

- Chỉ **thẩm quyền nâng cấp** có thể đóng một chương trình.
- Sau khi đóng, chương trình **không thể được thực thi hoặc nâng cấp lại**. Điều này có nghĩa là bạn không thể tái sử dụng cùng ID chương trình trên chuỗi. Nếu bạn muốn triển khai chương trình đó lại, bạn sẽ phải tạo một cặp khóa mới và triển khai nó dưới một ID chương trình mới.

Bạn còn nhớ thông báo cảnh báo này không? 👇
```bash
================================================================================
Recover the intermediate account's ephemeral keypair file with
`solana-keygen recover` and the following 12-word seed phrase:
================================================================================
stereo chair because cigar taxi stem celery embrace render autumn question quote
================================================================================
To resume a deploy, pass the recovered keypair as the
[BUFFER_SIGNER] to `solana program deploy` or `solana program write-buffer'.
Or to recover the account's lamports, pass it as the
[BUFFER_ACCOUNT_ADDRESS] argument to `solana program close`.
================================================================================
Error: Deploying program failed: RPC response error -32002: Transaction simulation failed: Error processing Instruction 0: account data too small for instruction [3 log messages]
```

Nhớ thông báo cảnh báo này không? 👇

Ở Phần 3 (Nâng cấp), chúng ta đã gặp vấn đề này khi triển khai phiên bản mới của chương trình. Mặc dù chúng ta đã khắc phục vấn đề gốc, nhưng SOL đã được chuyển đến một tài khoản bộ đệm tạm thời — và nếu bạn không đóng nó theo cách thủ công, SOL đó sẽ nằm đó mãi mãi.

Đây không phải là vấn đề lớn trên Devnet, nơi bạn có thể chỉ cần chạy `solana airdrop 5` để nhận thêm SOL (mặc dù có giới hạn tỷ lệ 🐢). Nhưng trên Mainnet, đây là tiền thật! Tính đến tháng 5 năm 2025, 1 SOL có giá khoảng $180 — vì vậy để lại tiền là một sai lầm tốn kém.

Để lấy lại SOL, trước tiên bạn cần phục hồi cặp khóa của bộ đệm bằng cách sử dụng cụm từ hạt giống được hiển thị trong thông báo lỗi.
```bash
solana-keygen recover -o /path/buffer-keypair.json
```

Sau đó nhập cụm từ 12 từ khi được nhắc. Trong trường hợp của tôi, nó là `stereo chair because cigar taxi stem celery embrace render autumn question quote`. Nó không sử dụng cụm từ độc lập, vì vậy chỉ cần nhấn ENTER khi được hỏi.

Bạn sẽ thấy điều gì đó như thế này:
```bash
[recover] seed phrase: 
[recover] If this seed phrase has an associated passphrase, enter it now. Otherwise, press ENTER to continue: 
Recovered pubkey `"HjbPTpkuANicPYtKE3WXfMARTQbqn5fsqx5Bmedr6vUt"`. Continue? (y/n): 
```

Bạn có thể chọn "y" để lưu tệp cặp khóa để sử dụng trong tương lai, nhưng vì tôi đã có địa chỉ bộ đệm rồi, tôi sẽ tiếp tục và nhấn "n" và tiến hành để đóng nó ngay lập tức.

Bây giờ bạn đã có địa chỉ tài khoản bộ đệm, bạn có thể đóng nó và lấy lại SOL của bạn:
```bash
solana program close <YOUR_BUFFER_ADDRESS>
```

Thành công! Bạn sẽ thấy xác nhận như thế này:
```bash
Buffer Address                               | Authority                                    | Balance
HjbPTpkuANicPYtKE3WXfMARTQbqn5fsqx5Bmedr6vUt | jixspQw81GQVo969PPNeK7WteDhvWVFWhcLfLoMiPo2  | 1.2628572 SOL
```

Bạn có thể xác minh số dư ví của bạn lại bằng cách chạy:
```bash
solana balance
```
Và thế là xong — bạn đã dọn dẹp thành công và lấy lại SOL của bạn! 🧹💰








