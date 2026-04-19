use anchor_lang::{prelude::*, system_program};

// Import các nhãn dán (Seed) và cấu trúc dữ liệu (BankInfo) từ các file khác
use crate::{
    constant::{BANK_INFO_SEED, BANK_VAULT_SEED},
    state::BankInfo,
};

// ==============================================================================
// BƯỚC 1: ĐỊNH NGHĨA KHUNG KIỂM DUYỆT TÀI KHOẢN (TÚI HỒ SƠ 'CTX')
// ==============================================================================
// #[derive(Accounts)] biến struct này thành một trạm kiểm duyệt. 
// Bất kỳ ai gọi hàm initialize đều phải đưa đủ và đúng các tài khoản này.
#[derive(Accounts)]
pub struct Initialize<'info> {
    
    // 1. TẠO TÀI KHOẢN: THÔNG TIN NGÂN HÀNG (BANK INFO)
    #[account(
        init, // Lệnh: Tự động tạo tài khoản này trên mạng Solana
        seeds = [BANK_INFO_SEED], // Dùng nhãn dán "BANK_INFO_SEED" để tìm PDA
        bump, // Tự động tìm con số Bump hợp lệ (từ 255 lùi về)
        payer = authority, // Ai là người trả tiền phí mạng (rent) để tạo tài khoản này? -> Là authority
        // Kích thước tài khoản: 8 byte mặc định của Anchor (để chống hack) + kích thước thực tế của struct BankInfo
        space = 8 + std::mem::size_of::<BankInfo>(), 
    )]
    // Khai báo kiểu dữ liệu: Đây là tài khoản chứa dữ liệu BankInfo
    pub bank_info: Box<Account<'info, BankInfo>>,

    // 2. TẠO TÀI KHOẢN: KÉT SẮT CHỨA SOL (BANK VAULT)
    // /// CHECK: Đây là comment BẮT BUỘC của Anchor khi dùng UncheckedAccount để báo rằng: 
    // "Tôi biết tôi đang làm gì, đừng báo lỗi bảo mật nữa".
    ///CHECK: 
    #[account(
        init, 
        seeds = [BANK_VAULT_SEED], 
        bump, 
        payer = authority, 
        space = 0, // Két sắt chỉ chứa SOL (Native token), không chứa chữ nghĩa hay dữ liệu gì cả -> Kích thước = 0
        owner = system_program::ID // Vì nó không chứa data Anchor, ta giao quyền sở hữu nó cho Hệ điều hành Solana (System Program)
    )]
    // UncheckedAccount: Anchor sẽ không cố gắng đọc dữ liệu bên trong tài khoản này (vì space = 0 làm gì có gì mà đọc)
    pub bank_vault: UncheckedAccount<'info>,

    // 3. NGƯỜI DÙNG GỌI LỆNH (GIÁM ĐỐC / AUTHORITY)
    #[account(mut)] // mut (mutable): Phải cho phép trừ tiền trong ví người này (để trả phí tạo 2 PDA ở trên)
    pub authority: Signer<'info>, // Signer: Bắt buộc người này phải cắm ví (Phantom) vào và ký xác nhận.

    // 4. HỆ ĐIỀU HÀNH SOLANA
    // Bắt buộc phải có System Program đi kèm thì mới có quyền cấp phép tạo tài khoản mới trên mạng lưới.
    pub system_program: Program<'info, System>,
}


// ==============================================================================
// BƯỚC 2: LOGIC XỬ LÝ (KHI HỒ SƠ ĐÃ HỢP LỆ)
// ==============================================================================
impl<'info> Initialize<'info> {
    pub fn process(ctx: Context<Initialize>) -> Result<()> {
        // Lấy quyển sổ BankInfo ra để bắt đầu ghi chép
        let bank_info = &mut ctx.accounts.bank_info;

        // 1. Ghi tên Giám đốc: Gán địa chỉ ví của người vừa tạo lệnh thành 'authority'
        bank_info.authority = ctx.accounts.authority.key();
        
        // 2. Mở cửa ngân hàng: Đặt trạng thái khóa = false
        bank_info.is_paused = false;
        
        // 3. LƯU Ý CHỖ NÀY: Lưu số Bump của Két sắt (Vault) vào sổ BankInfo!
        // Giải thích: Việc này rất thông minh. Nó lưu lại số bump của BankVault 
        // để sau này hàm Withdraw có thể dùng ngay con số này để mở két chuyển tiền 
        // mà không cần mạng lưới phải tính toán lại từ 255 xuống nữa (giúp tiết kiệm phí gas).
        bank_info.bump = ctx.bumps.bank_vault;

        // In ra một dòng log trên blockchain để thông báo thành công
        msg!("bank app initialized!");
        
        Ok(())
    }
}