// In Rust, a mod.rs file is used to declare all the files in a folder as modules.
// This allows other parts of our application (like lib.rs) to import and use them.

// First, we declare the modules (files) that exist in this folder.
pub mod deposit;
pub mod deposit_token;
pub mod initialize;
pub mod pause;
pub mod withdraw;
pub mod withdraw_token;

// Then, we use the `pub use` syntax to "re-export" everything inside those files.
// This means when someone imports `instructions::*`, they get access to all these structs and functions directly.
pub use deposit::*;
pub use deposit_token::*;
pub use initialize::*;
pub use pause::*;
pub use withdraw::*;
pub use withdraw_token::*;
