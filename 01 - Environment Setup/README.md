# Phần Một - Thiết lập Môi trường
Trước khi viết hoặc triển khai hợp đồng thông minh trên Solana, chúng ta cần thiết lập môi trường phát triển thích hợp. Phần này sẽ hướng dẫn bạn qua tất cả những gì bạn cần để bắt đầu, từ cài đặt các công cụ chính đến tạo dự án Anchor đầu tiên của bạn.

### Trong phần này, bạn sẽ:
✅ Cài đặt Rust, ngôn ngữ lập trình được sử dụng để viết các chương trình Solana  
✅ Cài đặt Solana CLI, cho phép bạn tương tác với blockchain  
✅ Cài đặt framework Anchor, bộ công cụ phổ biến nhất cho phát triển Solana  

Tới cuối phần này, bạn sẽ có mọi thứ cần thiết để xây dựng, kiểm tra và triển khai hợp đồng thông minh Solana trên Devnet.

Hãy bắt đầu! 🚀
### MỘT LỆNH CÀI ĐẶT TẤT CẢ
```
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
```
Một lần cài đặt thành công sẽ trả về kết quả như sau:
```
Installed Versions:
Rust: rustc 1.91.0 
Solana CLI: solana-cli 2.3.13 (src:5466f459; feat:2142755730, client:Agave)
Anchor CLI: 0.32.1
Node.js: v24.10.0
Yarn: 1.22.22
```
xác minh lại bằng:

```
rustc --version && solana --version && anchor --version && node --version && yarn --version
```
Cái này sẽ cài đặt PHIÊN BẢN MỚI NHẤT, không phải PHIÊN BẢN ỔNĐỊNH. Để cài đặt các phiên bản ổn định, hãy dán và chạy các lệnh sau:
```bash
rustup default 1.90.0
agave-install init 2.3.0
avm use 0.31.1

```
### 1. Cài đặt Rust

Chạy lệnh sau để cài đặt Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

Sau khi cài đặt, bạn cần tải lại biến môi trường PATH để bao gồm thư mục bin của Cargo
Chạy lệnh sau:
```bash
. "$HOME/.cargo/env"
```
Điều này đảm bảo rằng các lệnh cargo và rustc có sẵn toàn cầu trong phiên terminal của bạn.

Sau đó, kiểm tra xem Rust đã được cài đặt thành công chưa:
```bash
rustc --version
```

Để đảm bảo tương thích với phiên bản ổn định của framework Anchor (sẽ được cài đặt trong phần tiếp theo), chúng ta nên đặt phiên bản Rust thành 1.90.0:
```bash
rustup default 1.90.0
```

### 2. Cài đặt Solana CLI 

Để tương tác với blockchain Solana, bạn cần cài đặt Solana Command Line Interface (CLI). Solana CLI cung cấp các lệnh để tạo ví, triển khai chương trình và gửi giao dịch.

Chạy lệnh sau để tải xuống và cài đặt Solana CLI:
```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v2.3.0/install)"
```

Sau khi cài đặt, hãy cập nhật môi trường của bạn để lệnh `solana` có sẵn:
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Kiểm tra phiên bản để xác nhận mọi thứ đã được thiết lập chính xác:
```bash
solana --version
```

Bây giờ Solana CLI đã cài đặt thành công, bạn có thể tạo ví đầu tiên của mình bằng cách:
```bash
solana-keygen new 
```
Bạn sẽ thấy kết quả như sau:
```bash
Wrote new keypair to /Users/nhatbui97/.config/solana/id.json
====================================================================
pubkey: jixspQw81GQVo969PPNeK7WteDhvWVFWhcLfLoMiPo2
====================================================================
Save this seed phrase and your BIP39 passphrase to recover your new keypair:
cloud taxi flash truth rug pill bronze duck bread month patch behave
====================================================================
```
⚠️ Quan trọng: Lưu trữ cụm từ seed của bạn một cách an toàn. Bất cứ ai có quyền truy cập vào nó đều có thể kiểm soát quỹ của bạn.


Sau đó, chuyển URL RPC sang devnet và nhận một số SOL cho phí giao dịch:
```bash
solana config set -u https://api.devnet.solana.com 
solana airdrop 5
```

Để dễ dàng truy cập và tương tác UI, bạn có thể nhập ví của mình vào [Phantom Wallet](https://phantom.com/download)
Chạy:
```bash
cat $HOME/.config/solana/id.json
```

Cái này in ra một mảng các số như:
```bash
[25,250,185,230,65,229,210,243,20,209,26,80,240,226,48,97,145,15,119,43,132,245,62,210,12,180,144,72,190,100,81,104,10,241,215,149,189,41,158,148,184,110,49,69,150,197,128,112,249,223,130,24,115,123,92,77,83,180,100,176,19,136,114,173]
```

Nhập cái này vào Phantom Wallet và bật chế độ Testnet:
<p float="left">
  <img src="../Example Images/01-ImportPhantom1.png" alt="Step 1" width="240" height="400" style="margin-right: 10px;"/>
  <img src="../Example Images/01-ImportPhantom2.png" alt="Step 2" width="240" height="400" style="margin-right: 10px;"/>
  <img src="../Example Images/01-ImportPhantom3.png" alt="Step 3" width="240" height="400" style="margin-right: 10px;"/>
  <img src="../Example Images/01-ImportPhantom4.png" alt="Step 4" width="240" height="400"/>
</p>

### 3. Cài đặt Anchor CLI

Anchor là một framework để phát triển các chương trình Solana. Framework Anchor tận dụng các macro Rust để đơn giản hóa quá trình viết các chương trình Solana.
Trình quản lý phiên bản Anchor (AVM) cho phép bạn cài đặt và quản lý các phiên bản Anchor khác nhau trên hệ thống của bạn và dễ dàng cập nhật các phiên bản Anchor trong tương lai.

Cài đặt AVM bằng lệnh sau:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --force
```

Xác nhận rằng AVM đã cài đặt thành công:
```bash
avm --version
```

Hầu hết các giao thức Solana chính (tính đến ngày 14 tháng 5 năm 2025) - như Jito, Jupiter, Raydium, Orca,... - vẫn sử dụng Anchor 0.29.0 làm bản phát hành ổn định của họ.
Cập nhật, cái này đã cũ (11 tháng 11 năm 25), chúng ta cần sử dụng v0.30 trở lên, phiên bản ổn định nhất là 0.31.1.
```bash
avm use 0.31.1
```

Xác nhận phiên bản Anchor của bạn:
```bash
anchor --version
```
Xin chúc mừng! Bạn đã cài đặt thành công framework Anchor.
Bây giờ bạn có thể khởi tạo dự án Anchor đầu tiên của mình bằng cách chạy:
```bash
anchor init my-first-anchor-project
```

Sau khi hoàn tất, kết quả sẽ trông giống như sau:
```bash
yarn install v1.22.22
warning package.json: No license field
info No lockfile found.
warning No license field
[1/4] 🔍  Resolving packages...
warning mocha > glob@7.2.0: Glob versions prior to v9 are no longer supported
warning mocha > glob > inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
warning "@coral-xyz/anchor > @solana/web3.js > @solana/codecs-numbers@2.1.1" has incorrect peer dependency "typescript@>=5.3.3".
warning "@coral-xyz/anchor > @solana/web3.js > @solana/codecs-numbers > @solana/errors@2.1.1" has incorrect peer dependency "typescript@>=5.3.3".
warning "@coral-xyz/anchor > @solana/web3.js > @solana/codecs-numbers > @solana/codecs-core@2.1.1" has incorrect peer dependency "typescript@>=5.3.3".
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 8.05s.
Initialized empty Git repository in /Users/nhatbui97/Documents/Solana Program/solana-tutorials/01 - Environment Setup/my-first-anchor-project/.git/
my-first-anchor-project initialized
```
Bây giờ bạn đã sẵn sàng để bắt đầu xây dựng trên Solana với Anchor!






# Đối với những người sử dụng Windows để chạy cái này
Tôi là một người thích Windows, rất thích, tôi đã sử dụng Linux vài năm nhưng luôn gặp lỗi. Vì vậy tôi đã viết điều này để giúp một số người gặp rắc rối khi thiết lập Solana trên Windows.
Nếu bạn không muốn chạy wsl trên Windows, và chạy Rust trực tiếp, tôi sẽ không khuyến khích, mặc dù tôi đã chạy nó hoàn hảo 1,5 năm với chocolatey (tôi chạy cosmwasm, không phải solana), hãy kiểm tra lại. Nhưng tôi gợi ý bạn nên thiết lập wsl, dễ dàng hơn nhiều.

https://solana.com/docs/intro/installation - Đây là hướng dẫn chính thức cho bạn, nhưng tôi sẽ tóm tắt lại các bước dưới đây
1. Trước tiên, bạn cần cài đặt WSL2 (WSL) trên Windows. Điều này để giúp bạn chạy terminal Linux trực tiếp trên windows.
2. Thứ hai, hãy truy cập Windows Store trên Windows 10/11 của bạn, tìm kiếm "Ubuntu". Bạn có thể cài đặt bất kỳ distro (phiên bản) nào bạn muốn nhưng tôi đề xuất chọn cái có điểm đánh giá cao nhất.
3. Sau đó, hãy mở tìm kiếm windows, tìm kiếm "Ubuntu", terminal sẽ xuất hiện, bạn gõ tên người dùng, mật khẩu, v.v... sẵn sàng để đi!



## Một số lỗi tôi gặp phải, hoặc chỉ là ghi chú
- Nếu ổ đĩa C của bạn (nơi bạn cài đặt windows) quá nhỏ, không đủ dung lượng hoặc có vấn đề khác, bạn có thể muốn thay đổi vị trí cài đặt distro (ubuntu), hãy làm như sau 

1. Chỉ cần nhấp vào nút cài đặt Ubuntu 22.04 trong Ứng dụng Microsoft Store (chỉ tải xuống gói appx, cài đặt sẽ được kích hoạt khi chúng ta nhấp vào Ubuntu lần đầu tiên trong StartMenu).

2. Sau đó, tìm kiếm `install.tar.gz` thông qua ứng dụng Everything, kết quả như sau: Expand-appx từ Macrosoft Store

3. Sao chép tất cả các tệp vào `D:\WSL\appx` hoặc nơi bạn thích, nhấp vào <distribution>.exe để cài đặt, sau đó tệp ext4.vhdx sẽ được tạo như sau: sau khi cài đặt

4. Cuối cùng, kích hoạt gỡ cài đặt từ StartMenu sẽ xóa các gói trên ổ đĩa C.

contact me if this unclear.


- Access your local (in Windows directory):
  - use cd mnt/<what_drive_you_want_to_access>. Example drive c: cd mnt/c/, ls to see list of all folder in that
  - use symlink to easy link a "shortcut" to your work folder, example:  ln -s <path_to_where_the_folder_you_want_to_link> ./Work, this will create a symlink at the current folder where the terminal at as name "Work"
- linker "cc" not found when install whatever in the setup step - as for me when install avm
```
sudo apt-get update
sudo apt install build-essential
```
then rerun the error command



- If you run into error: version GLIBC_2.39' not found (required by /home/bill/.avm/bin/anchor-0.32.1) or similar
which mean your distro outdated, which use older glibc version. It can be handled by: Reinstall the lastest distro. You can do this by install thru windows store by downloading another distro version. But for me im lazy, when already install bunch of packages. So do this if you're in same shoes as me:
```
sudo apt update && sudo apt upgrade -y
sudo apt install update-manager-core -y
sudo do-release-upgrade
```
this three commands will update to the latest ubuntu version (for me 24.04)
then you free to run without error.

1. If you run into error "Checking for a new Ubuntu release In /etc/update-manager/release-upgrades Prompt is set to never so upgrading is not possible." then:
```
sudo nano /etc/update-manager/release-upgrades
```
2. find : Prompt=never change it to Prompt=normal then you can install new version


DO THIS IN WINDOWS TERMINAL, NOT VSCODE TERMINAL



- Right now solana-cli version above 0.30 is recommended, 0.31.0 specifically, install 0.29.0 is a bit tricky, and messy. If forced, can still do this but contact me.
- When running `anchor build` with lower solana version like 0.29, this problem can occured: "rustc v1.75 or above ... bla bla bla" but when you check your rustc version, its 1.83, 1.90, so why its still error? it is because the solana-install, anchor use it own rustc version and it is outdated.  If this happen then you must install the agave-install 
follow this instruction https://docs.anza.xyz/cli/install, change v3.0.8 to v2.3.0 - the most stable version. Then proceed to anchor build, again.

If you run into build-sbf not found, the most likely you have not listened to me - and install both v0.29.0 and v0.30, then uninstall v0.29.0, or check agave-install/solana-install whether if it 1.18 or above v2, if it v2 then your solana-cli outdated, if v1.18 or under v2, then update to above v2. your problem will be solved. If not then contact me.

If you must stay on Anchor 0.29, lock Solana back to 1.18.13 and Rust 1.73-1.78 and `cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 avm --locked`