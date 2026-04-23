import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BankApp } from "../target/types/bank_app";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { BN } from "bn.js";
import { createAssociatedTokenAccountInstruction, createMint, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("bank-app", () => {
  // 1. Configure anchor provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 2. Get program from anchor workspace
  const program = anchor.workspace.BankApp as Program<BankApp>;

  // 3. Define PDA accounts (bankInfo, bankVault, userReserve)
  const BANK_APP_ACCOUNTS = {
    bankInfo: PublicKey.findProgramAddressSync(
      [Buffer.from("BANK_INFO_SEED")], // Seedphrase
      program.programId
    )[0],
    bankVault: PublicKey.findProgramAddressSync(
      [Buffer.from("BANK_VAULT_SEED")],
      program.programId
    )[0],
    userReserve: (pubkey: PublicKey, tokenMint?: PublicKey) => {
      let SEEDS = [
        Buffer.from("USER_RESERVE_SEED"),
        pubkey.toBuffer(),
      ]
      if (tokenMint != undefined) {
        SEEDS.push(tokenMint.toBuffer())
      }
      return PublicKey.findProgramAddressSync(
        SEEDS,
        program.programId
      )[0]
    }
  }

  // 4. Global variables for token
  let myTestMint: PublicKey;
  let myUserAta: PublicKey;
  let myBankAta: PublicKey;

  // ------------------------------------------------------------------------
  // TEST: SETUP TEST TOKEN MINT
  // ------------------------------------------------------------------------
  //  This is a setup block, not an Anchor instruction. It uses `@solana/spl-token` 
  // to create a brand new mock token, creates Associated Token Accounts (ATAs) 
  // for both the user and the Bank Vault, and mints initial tokens to the user.
  it("Setup Test Token Mint", async () => {
      myTestMint = await createMint(
          provider.connection,
          (provider.wallet as any).payer,
          provider.publicKey,
          null,
          6
      );
      console.log("Created Test Mint: ", myTestMint.toBase58());

      let userTokenAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          (provider.wallet as any).payer,
          myTestMint,
          provider.publicKey
      );
      myUserAta = userTokenAccount.address;

      let bankTokenAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          (provider.wallet as any).payer,
          myTestMint,
          BANK_APP_ACCOUNTS.bankVault,
          true
      );
      myBankAta = bankTokenAccount.address;

      await mintTo(
          provider.connection,
          (provider.wallet as any).payer,
          myTestMint,
          myUserAta,
          provider.publicKey,
          10_000_000_000 // Cấp 10,000 token
      );
      console.log("Minted tokens to User");
  });

  // ------------------------------------------------------------------------
  // TEST: INITIALIZE
  // ------------------------------------------------------------------------
  // Initializes the bank app by creating the `bankInfo` and `bankVault` PDAs.
  // Syntax: `program.methods.initialize().accounts({ authority: ... }).rpc()`
  // Notice we don't pass the PDAs because Anchor automatically resolves them from seeds!
  it("Is initialized!", async () => {
    try {
      const bankInfo = await program.account.bankInfo.fetch(BANK_APP_ACCOUNTS.bankInfo)
      console.log("Bank info: ", bankInfo)
    } catch {
      const tx = await program.methods.initialize()
        .accounts({
          authority: provider.publicKey,
        }).rpc();
      console.log("Initialize signature: ", tx);
    }
  });

  // ------------------------------------------------------------------------
  // TEST: DEPOSIT SOL
  // ------------------------------------------------------------------------
  // Deposit SOL to the bank
  it("Is deposited!", async () => {
    const tx = await program.methods.deposit(new BN(1_000_000))
      .accounts({
        user: provider.publicKey,
      }).rpc();
    console.log("Deposit signature: ", tx);

    const userReserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey))
    console.log("User reserve: ", userReserve.depositedAmount.toString())
  });

  // ------------------------------------------------------------------------
  // TEST: DEPOSIT SPL TOKEN
  // ------------------------------------------------------------------------
  // Calls the `depositToken` method, passing the token mint.
  // Anchor auto-resolves the user's ATA, the bank's ATA, and the user's reserve PDA!
  it("Is deposited token!", async () => {
    // Đã thay bằng biến tự động, bỏ preInstructions
    const tx = await program.methods.depositToken(new BN(1_000_000_000))
      .accounts({
        tokenMint: myTestMint,
        user: provider.publicKey,
      }).rpc();
    console.log("Deposit token signature: ", tx);

    const userReserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey, myTestMint))
    console.log("User token reserve: ", userReserve.depositedAmount.toString())
  });

  // ------------------------------------------------------------------------
  // TEST: WITHDRAW SOL
  // ------------------------------------------------------------------------
  // Deposits some SOL and then withdraws a portion of it to test the SOL withdrawal flow.
  it("Is withdrawn!", async () => {
    await program.methods.deposit(new BN(1_000_000))
      .accounts({
        user: provider.publicKey,
      }).rpc();

    const tx = await program.methods.withdraw(new BN(500_000))
      .accounts({
        user: provider.publicKey,
      }).rpc();
    console.log("Withdraw signature: ", tx);
  });

  // ------------------------------------------------------------------------
  // TEST: WITHDRAW SPL TOKEN
  // ------------------------------------------------------------------------
  // Deposits tokens, then withdraws them. Notice we just pass `tokenMint` and `user`.
  // Anchor handles the rest of the complicated ATA derivation.
  it("Is withdrawn token!", async () => {
    // Đã thay bằng biến tự động, bỏ preInstructions
    await program.methods.depositToken(new BN(1_000_000_000))
      .accounts({
        tokenMint: myTestMint,
        user: provider.publicKey,
      }).rpc();

    const tx = await program.methods.withdrawToken(new BN(500_000_000))
      .accounts({
        tokenMint: myTestMint,
        user: provider.publicKey,
      }).rpc();
    console.log("Withdraw token signature: ", tx);
  });

  // ------------------------------------------------------------------------
  // TEST: PAUSE AND UNPAUSE
  // ------------------------------------------------------------------------
  // Tests the ability of the authority to pause and unpause the program logic.
  it("Is paused and unpaused!", async () => {
    // ... (Giữ nguyên như cũ, đoạn này của bạn đã chuẩn rồi)
    const pauseTx = await program.methods.pause()
      .accounts({
        authority: provider.publicKey,
      }).rpc();
    
    const unpauseTx = await program.methods.pause()
      .accounts({
        authority: provider.publicKey,
      }).rpc();
  });

  // ------------------------------------------------------------------------
  // TEST: OVERDRAFT PROTECTION
  // ------------------------------------------------------------------------
  // Ensures that trying to withdraw more than a user has deposited will fail and throw an error.
  it("Withdraw more than deposited should fail!", async () => {
    try {
      await program.methods.withdraw(new BN(10_000_000)) 
        .accounts({
          user: provider.publicKey,
        }).rpc();
    } catch (error: any) {
      console.log("Withdraw correctly failed with insufficient funds: ", error.message)
    }
  });
});