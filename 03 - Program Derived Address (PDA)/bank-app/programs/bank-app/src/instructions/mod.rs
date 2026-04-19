pub mod deposit;
pub mod initialize;
pub mod pause;
pub mod withdraw;

pub use deposit::*;
pub use initialize::*;
pub use pause::*;
pub use withdraw::*;
// Tập hợp tất cả các class xử lý (Deposit, Initialize, Pause, Withdraw) vào một namespace chung 'instructions' để tiện sử dụng ở phần Controller (lib.rs).