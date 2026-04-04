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

Trên mainnet, `anchor deploy` thường thất bại do các vấn đề độ tin cậy của RPC. Thay vào đó, tạ tốt hơn là sử dụng lệnh `solana program deploy` với một nhà cung cấp RPC cụ thể.  

For example, using the `--use-rpc` flag with a private, high-quality RPC endpoint:

```bash
solana program deploy target/deploy/my_first_anchor_project.so --program-id target/deploy/my_first_anchor_project-keypair.json --use-rpc
```

### 2. Kiểm tra
Sau khi xây dựng hợp đồng thông minh Solana của bạn bằng Anchor, điều quan trọng là kiểm tra nó và đảm bảo nó hoạt động như dự kinh thối lương. Anchor làm cho kiểm tra dễ dàng bằng cách sử dụng TypeScript và Mocha.  
Let's walk through how to run a basic test using a function called `initialize()` that we created in our program.  

Anchor automatically creates a test file when you initialize your project. You can find it in the `tests/` folder.  
File: `tests/my-first-anchor-project.ts`  
Here's what it looks like:

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

Let's have a look at this file.  
First, notice that the TypeScript client file generated by running `anchor build` before is being imported in the test file:
```typescript
import { MyFirstAnchorProject } from "../target/types/my_first_anchor_project";
```
This import allows your test code to understand the structure of your program and use it with full type safety.  

Next, the test sets up the Anchor provider using the environment configuration:
```typescript
anchor.setProvider(anchor.AnchorProvider.env());
```
This tells Anchor to use the RPC endpoint and wallet settings you defined in `Anchor.toml`—for example, connecting to Devnet and using your local keypair.  

Finally, here’s the test that actually runs your program:
```typescript
  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
```
This calls the `initialize()` method from your program. The `.rpc()` function will send the transaction to Solana Devnet, wait for confirmation, and return a transaction hash.  

Now you are ready to test the program, use this command to run the test:
```bash
anchor run test
```

You should see output like this in your terminal:
```bash
  my-first-anchor-project
Your transaction signature 3iFa2ASp4mcivVr2RjiqvUeVDwe1vcasp31A9vxperVRvPttcod9DqLyaY8kWu5d5owS6QuoJw5zfFDpBvb1jFqU
    ✔ Is initialized! (1362ms)


  1 passing (1s)
```

✅ Congrats! Your test passed, and your program was successfully initialized.  

You can even copy the transaction signature and view it on [Solscan](https://solscan.io/tx/3iFa2ASp4mcivVr2RjiqvUeVDwe1vcasp31A9vxperVRvPttcod9DqLyaY8kWu5d5owS6QuoJw5zfFDpBvb1jFqU?cluster=devnet) to see it in action

### 3. Upgrade

After deploying your Anchor program, you may want to make changes or add new features. Instead of creating a new program from scratch, Anchor allows you to upgrade your existing program — as long as you're the upgrade authority.  

Let’s go through how to upgrade your program after making minor change.  

In your `initialize()` function, let’s add some logging to show how `msg!()` works:
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
These logs will show up in the transaction output and are incredibly useful for debugging, auditing, and tracking the behavior of your program during execution. You’ll find yourself using `msg!()` frequently as your project grows.
Additionally, these logs can also be captured by your back-end infrastructure to store important information or trigger off-chain processes based on on-chain events.  

Now, let’s do a quick recap of what you learned in Part 1 😄  
Upgrading your Anchor program is almost the same as deploying it for the first time. Simply build your updated program using the Anchor CLI, then deploy the new version using the Solana CLI—just like we did before!  

As long as you're the upgrade authority, the process is straightforward and seamless.  

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

This error means that the rent-exempt account used to store your program data no longer has enough space to hold the new version of the program. Even a minor upgrade can cause your program binary to grow slightly, requiring more storage.  

If you're not yet familiar with Solana's rent mechanism, don't worry—it's an important concept that ensures storage costs are fairly distributed on-chain. You can learn more about it here:  
👉 [What is Rent on Solana and How to Calculate it](https://www.quicknode.com/guides/solana-development/getting-started/understanding-rent-on-solana)

Now the big question is: **How much space do we actually need to extend?**  
Sure, if you're feeling generous (or just rich 😄), you can reserve more space than necessary—but keep in mind that extra space costs more SOL, since rent is based on storage size.  

So, knowing the exact size requirement is important.  

First, you can check the current size of your deployed program by running:
```bash
solana program show <YOUR_PROGRAM_ID>
```

You'll see output similar to this:
```bash
Program Id: GDGNBNAhHGmMKcxVxXBTTJ8xytmdjNuFWsr2igqhck27
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: 3i6z1Wi9oFXEU2NdVVeNf89DdNKJdwhuHRcGb2MMdUT4
Authority: jixspQw81GQVo969PPNeK7WteDhvWVFWhcLfLoMiPo2
Last Deployed In Slot: 380934198
Data Length: 180408 (0x2c0b8) bytes
Balance: 1.25684376 SOL
```
Here, the current data length is 180,408 bytes.  

Next, let's find the size of the new `.so` file that was built by Anchor:
```bash
stat -f%z target/deploy/my_first_anchor_project.so 
```

in Linux it is
```bash
stat -c %s target/deploy/bank_app.so 
```

This should return 181,272 bytes. That means the new version of your program is slightly larger. So you’ll need to extend your program's account by `181272 - 180408 = 864` bytes  

You can now extend the program’s allocated space before upgrading:
```bash
solana program extend <YOUR_PROGRAM_ID> 864
```
And you’re good to go!  

Now you're ready to upgrade the program—go ahead and run the deploy command again.
If everything went smoothly, your program should now be successfully upgraded!  

To verify that the new version is working, run your test again: `anchor run test`  
You should see output similar to:
```bash
  my-first-anchor-project
Your transaction signature hnN1ePkVLiKTQ1XT1NZbMyZZhzMnSEpUBiojSN2NVEDiUAdCQQkwbWDYDm74aWksUD7wMqo9EufFfwDw92PPenx
    ✔ Is initialized! (1525ms)


  1 passing (2s)
```

This confirms that your upgrade was successful and the new code—including your updated `initialize()` function—is running properly.  
If you want to review the log output, you can inspect the transaction on [Solscan](https://solscan.io/txhnN1ePkVLiKTQ1XT1NZbMyZZhzMnSEpUBiojSN2NVEDiUAdCQQkwbWDYDm74aWksUD7wMqo9EufFfwDw92PPenx?cluster=devnet)  

<img src="../Example Images/02-UpgradeProgramLog.png" alt="upgrade program log" width="1000" height="300">

### 4. Close
At some point, you might want to retire or clean up a deployed program—especially when working in a development or test environment. Solana allows you to close a program and reclaim the SOL used for rent-exempt storage. This is useful when:

- You’ve finished testing and no longer need the program.
- You want to redeploy from scratch.
- You’re managing on-chain storage and costs.

When you close a program, the rent-exempt lamports held by the program data account are returned to a recipient of your choosing (usually your wallet), and the program becomes unavailable for execution. It’s important to note:

- Only the **upgrade authority** can close a program.
- Once closed, the program **cannot be executed or upgraded again**. This means you can't reuse the same on-chain Program ID. If you want to deploy that program again, you'll have to generate a new keypair and deploy it under a new program ID.

Remember this warning message? 👇
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

In Part 3 (Upgrade), we encountered this issue while deploying a new version of our program. Although we fixed the root problem, SOL was already transferred to a temporary buffer account—and if you don’t manually close it, that SOL will sit there forever.  

This isn’t a huge issue on Devnet, where you can just run `solana airdrop 5` to get more SOL (although there's a rate limit 🐢). But on Mainnet, this is real money! As of May 2025, 1 SOL is worth about $180—so leaving funds behind is a costly mistake.  

So, to reclaim the SOL, you first need to recover the buffer's keypair using the seed phrase shown in the error message.
```bash
solana-keygen recover -o /path/buffer-keypair.json
```

Then enter the 12-word seed phrase when prompted. In my case, it’s `stereo chair because cigar taxi stem celery embrace render autumn question quote`. It doesn't use a passphrase, so just press ENTER when asked.  

You should see something like this:
```bash
[recover] seed phrase: 
[recover] If this seed phrase has an associated passphrase, enter it now. Otherwise, press ENTER to continue: 
Recovered pubkey `"HjbPTpkuANicPYtKE3WXfMARTQbqn5fsqx5Bmedr6vUt"`. Continue? (y/n): 
```

You can choose "y" to save the keypair file for future use, but since I already have the buffer address, I’ll go ahead and press "n" and proceed to close it immediately.  

Now that you have the buffer account address, you can close it and reclaim your SOL:
```bash
solana program close <YOUR_BUFFER_ADDRESS>
```

Success! You’ll see confirmation like this:
```bash
Buffer Address                               | Authority                                    | Balance
HjbPTpkuANicPYtKE3WXfMARTQbqn5fsqx5Bmedr6vUt | jixspQw81GQVo969PPNeK7WteDhvWVFWhcLfLoMiPo2  | 1.2628572 SOL
```

You can verify your wallet balance again by running:
```bash
solana balance
```
And that’s it—you’ve successfully cleaned up and reclaimed your SOL! 🧹💰








