import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BankApp } from "../target/types/bank_app";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { BN } from "bn.js";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { StakingApp } from "../target/types/staking_app";

describe("bank-app", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.BankApp as Program<BankApp>;
  const stakingProgram = anchor.workspace.StakingApp as Program<StakingApp>;

  const BANK_APP_ACCOUNTS = {
    bankInfo: PublicKey.findProgramAddressSync(
      [Buffer.from("BANK_INFO_SEED")],
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

  const STAKING_APP_ACCOUNTS = {
    stakingVault: PublicKey.findProgramAddressSync(
      [Buffer.from("STAKING_VAULT")],
      stakingProgram.programId
    )[0],
    userInfo: PublicKey.findProgramAddressSync(
      [Buffer.from("USER_INFO"), BANK_APP_ACCOUNTS.bankVault.toBuffer()],
      stakingProgram.programId
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

  it("Invests through the CPI crate generated from IDL!", async () => {
    const before = await provider.connection.getBalance(STAKING_APP_ACCOUNTS.stakingVault);

    const tx = await program.methods.invest(new BN(1_000), true)
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
        bankVault: BANK_APP_ACCOUNTS.bankVault,
        stakingVault: STAKING_APP_ACCOUNTS.stakingVault,
        stakingInfo: STAKING_APP_ACCOUNTS.userInfo,
        stakingProgram: stakingProgram.programId,
        authority: provider.publicKey,
        systemProgram: SystemProgram.programId,
      }).rpc();
    console.log("Invest CPI signature: ", tx);

    const after = await provider.connection.getBalance(STAKING_APP_ACCOUNTS.stakingVault);
    if (after < before + 1_000) {
      throw new Error("staking vault balance did not increase after CPI invest");
    }
  });

  it("Invests through a raw instruction built from IDL!", async () => {
    const before = await provider.connection.getBalance(STAKING_APP_ACCOUNTS.stakingVault);

    const tx = await program.methods.investRaw(new BN(1_000), true)
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
        bankVault: BANK_APP_ACCOUNTS.bankVault,
        stakingVault: STAKING_APP_ACCOUNTS.stakingVault,
        stakingInfo: STAKING_APP_ACCOUNTS.userInfo,
        stakingProgram: stakingProgram.programId,
        authority: provider.publicKey,
        systemProgram: SystemProgram.programId,
      }).rpc();
    console.log("Invest raw signature: ", tx);

    const after = await provider.connection.getBalance(STAKING_APP_ACCOUNTS.stakingVault);
    if (after < before + 1_000) {
      throw new Error("staking vault balance did not increase after raw invest");
    }
  });

  it.skip("Is deposited token!", async () => {
    let tokenMint = new PublicKey("") // Điền token mint của bạn vào
    let userAta = getAssociatedTokenAddressSync(tokenMint, provider.publicKey)
    let bankAta = getAssociatedTokenAddressSync(tokenMint, BANK_APP_ACCOUNTS.bankVault, true)

    let preInstructions: TransactionInstruction[] = []
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

    const userReserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(provider.publicKey, tokenMint))
    console.log("User reserve: ", userReserve.depositedAmount.toString())
  });
});
