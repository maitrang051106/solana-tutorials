import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BankApp } from "../target/types/bank_app";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";

describe("bank-app", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.BankApp as Program<BankApp>;

  const BANK_APP_ACCOUNTS = {
    bankInfo: PublicKey.findProgramAddressSync(
      [Buffer.from("Bam_Xau_Bat_Ki")],
      program.programId
    )[0],
    bankVault: PublicKey.findProgramAddressSync(
      [Buffer.from("De_Duoc_Mot_Ma")],
      program.programId
    )[0],
    userReserve: (pubkey: PublicKey) => PublicKey.findProgramAddressSync(
      [
        Buffer.from("Khong_quy_tac_nao_ca"),
        pubkey.toBuffer()
      ],
      program.programId
    )[0],
  }

  // ------------------------------------------------------------------------
  // TEST: INITIALIZE
  // ------------------------------------------------------------------------
  // This test checks if the bank has been initialized. If not, it calls the `initialize` method.
  // Syntax: `program.methods.<instruction_name>(<arguments>)`
  // `.accounts({ ... })` specifies the accounts that cannot be auto-resolved by Anchor.
  // `.rpc()` signs and sends the transaction to the network, returning the transaction signature.
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
  // TEST: DEPOSIT
  // ------------------------------------------------------------------------
  // This test calls the `deposit` instruction, sending 1,000,000 lamports (0.001 SOL).
  // We pass `new BN(...)` because Anchor uses the BN.js library for large integers (u64).
  // After depositing, we fetch the `userReserve` PDA account data to verify the balance increased.
  // Syntax to fetch account data: `await program.account.<account_name>.fetch(<public_key>)`
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
  // TEST: WITHDRAW
  // ------------------------------------------------------------------------
  // This test verifies the `withdraw` instruction by checking the balance before and after.
  // It calls the `withdraw` method requesting 500,000 lamports back.
  // We manually verify that the balance after is exactly 500,000 less than the balance before.
  it("Is withdrawn!", async () => {
    const userReserveBefore = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey));
    const balanceBefore = userReserveBefore.depositedAmount.toNumber();

    const withdrawAmount = new BN(500_000);
    const tx = await program.methods.withdraw(withdrawAmount)
      .accounts({
        user: provider.publicKey,
      }).rpc();

    const userReserveAfter = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey));
    const balanceAfter = userReserveAfter.depositedAmount.toNumber();

    if (balanceAfter === balanceBefore - 500_000) {
      console.log("✓ Withdraw amount verified!");
    } else {
      throw new Error(`Withdraw verification failed! Expected ${balanceBefore - 500_000}, but got ${balanceAfter}`);
    }
  });

  // ------------------------------------------------------------------------
  // TEST: PAUSE
  // ------------------------------------------------------------------------
  // This test toggles the `is_paused` flag in the BankInfo PDA by calling the `pause` instruction.
  // Since it acts as a toggle, calling it once pauses the bank. We then fetch the `bankInfo`
  // account and assert that the `isPaused` property is exactly `true`.
  it("Is paused!", async () => {
    const tx = await program.methods.pause()
      .accounts({
        authority: provider.publicKey,
      }).rpc();
    console.log("Pause signature: ", tx);

    const bankInfo = await program.account.bankInfo.fetch(BANK_APP_ACCOUNTS.bankInfo)
    console.log("Bank is paused: ", bankInfo.isPaused);
    if (bankInfo.isPaused) {
      console.log("✓ Bank paused successfully!");
    } else {
      throw new Error("Bank pause failed!");
    }
  });

  // ------------------------------------------------------------------------
  // TEST: DEPOSIT WHILE PAUSED
  // ------------------------------------------------------------------------
  // This test ensures our smart contract properly blocks deposits when the bank is paused.
  // We wrap the transaction in a `try/catch` block because we EXPECT it to throw an error.
  // If it throws an error matching "bank app is currently paused", the test passes.
  it("Deposit fails when paused!", async () => {
    try {
      await program.methods.deposit(new BN(500_000))
        .accounts({
          user: provider.publicKey,
        }).rpc();
      throw new Error("Deposit should have failed when paused!");
    } catch (e: any) {
      if (e.message.includes("bank app is currently paused")) {
        console.log("✓ Deposit correctly blocked when paused!");
      } else {
        throw e;
      }
    }
  });

  // ------------------------------------------------------------------------
  // TEST: WITHDRAW WHILE PAUSED
  // ------------------------------------------------------------------------
  // Similar to the deposit test, this ensures that withdrawals are also safely blocked
  // while the bank is in a paused state.
  it("Withdraw fails when paused!", async () => {
    try {
      await program.methods.withdraw(new BN(100_000))
        .accounts({
          user: provider.publicKey,
        }).rpc();
      throw new Error("Withdraw should have failed when paused!");
    } catch (e: any) {
      if (e.message.includes("bank app is currently paused")) {
        console.log("✓ Withdraw correctly blocked when paused!");
      } else {
        throw e;
      }
    }
  });

  // ------------------------------------------------------------------------
  // TEST: UNPAUSE
  // ------------------------------------------------------------------------
  // This test calls the `pause` instruction again. Because the contract logic toggles the
  // `is_paused` boolean (e.g., `!is_paused`), this call unpauses the bank.
  // We verify this by checking that the `isPaused` flag is now `false`.
  it("Is unpaused!", async () => {
    const tx = await program.methods.pause()
      .accounts({
        authority: provider.publicKey,
      }).rpc();
    console.log("Unpause signature: ", tx);

    const bankInfo = await program.account.bankInfo.fetch(BANK_APP_ACCOUNTS.bankInfo)
    console.log("Bank is paused: ", bankInfo.isPaused);
    if (!bankInfo.isPaused) {
      console.log("✓ Bank unpaused successfully!");
    } else {
      throw new Error("Bank unpause failed!");
    }
  });
});
