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
      [Buffer.from("BANK_INFO_SEED")],
      program.programId
    )[0],
    bankVault: PublicKey.findProgramAddressSync(
      [Buffer.from("BANK_VAULT_SEED")],
      program.programId
    )[0],
    userReserve: (pubkey: PublicKey) => PublicKey.findProgramAddressSync(
      [
        Buffer.from("USER_RESERVE_SEED"),
        pubkey.toBuffer()
      ],
      program.programId
    )[0],
  }

  it("Is initialized!", async () => {
    try {
      const bankInfo = await program.account.bankInfo.fetch(BANK_APP_ACCOUNTS.bankInfo)
      console.log("Bank info: ", bankInfo)
    } catch {
      const tx = await program.methods.initialize()
        .accounts({
          bankInfo: BANK_APP_ACCOUNTS.bankInfo,
          bankVault: BANK_APP_ACCOUNTS.bankVault,
          authority: provider.publicKey,
          systemProgram: SystemProgram.programId
        }).rpc();
      console.log("Initialize signature: ", tx);
    }
  });

  it("Is deposited!", async () => {
    const tx = await program.methods.deposit(new BN(1_000_000))
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
        bankVault: BANK_APP_ACCOUNTS.bankVault,
        userReserve: BANK_APP_ACCOUNTS.userReserve(provider.publicKey),
        user: provider.publicKey,
        systemProgram: SystemProgram.programId
      }).rpc();
    console.log("Deposit signature: ", tx);

    const userReserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey))
    console.log("User reserve: ", userReserve.depositedAmount.toString())
  });
it("Is withdrawn!", async () => {
    const userReserveBefore = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey));
    const balanceBefore = userReserveBefore.depositedAmount.toNumber();

    const withdrawAmount = new BN(500_000);
    const tx = await program.methods.withdraw(withdrawAmount)
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
        bankVault: BANK_APP_ACCOUNTS.bankVault,
        userReserve: BANK_APP_ACCOUNTS.userReserve(provider.publicKey),
        user: provider.publicKey,
        systemProgram: SystemProgram.programId
      }).rpc();
    
    const userReserveAfter = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey));
    const balanceAfter = userReserveAfter.depositedAmount.toNumber();

    if (balanceAfter === balanceBefore - 500_000) {
      console.log("✓ Withdraw amount verified!");
    } else {
      throw new Error(`Withdraw verification failed! Expected ${balanceBefore - 500_000}, but got ${balanceAfter}`);
    }
  });

  it("Is paused!", async () => {
    const tx = await program.methods.pause()
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
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

  it("Deposit fails when paused!", async () => {
    try {
      await program.methods.deposit(new BN(500_000))
        .accounts({
          bankInfo: BANK_APP_ACCOUNTS.bankInfo,
          bankVault: BANK_APP_ACCOUNTS.bankVault,
          userReserve: BANK_APP_ACCOUNTS.userReserve(provider.publicKey),
          user: provider.publicKey,
          systemProgram: SystemProgram.programId
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

  it("Withdraw fails when paused!", async () => {
    try {
      await program.methods.withdraw(new BN(100_000))
        .accounts({
          bankInfo: BANK_APP_ACCOUNTS.bankInfo,
          bankVault: BANK_APP_ACCOUNTS.bankVault,
          userReserve: BANK_APP_ACCOUNTS.userReserve(provider.publicKey),
          user: provider.publicKey,
          systemProgram: SystemProgram.programId
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

  it("Is unpaused!", async () => {
    const tx = await program.methods.pause()
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
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
