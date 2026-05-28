import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BankApp } from "../target/types/bank_app";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { StakingApp } from "../target/types/staking_app";
import * as fs from "fs";

function getOrGenerateKeypair(filename: string): Keypair {
  try {
    if (fs.existsSync(filename)) {
      const secretKeyString = fs.readFileSync(filename, "utf8");
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      return Keypair.fromSecretKey(secretKey);
    }
  } catch (e) {
    console.warn(
      `Could not read keypair from ${filename}, generating a new one.`
    );
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(filename, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

describe("bank-app", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
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
    userReserve: (pubkey: PublicKey) => {
      const SEEDS = [Buffer.from("USER_RESERVE_SEED"), pubkey.toBuffer()];

      return PublicKey.findProgramAddressSync(SEEDS, program.programId)[0];
    },
  };

  const STAKING_APP_ACCOUNTS = {
    stakingVault: PublicKey.findProgramAddressSync(
      [Buffer.from("STAKING_VAULT")],
      stakingProgram.programId
    )[0],
    stakingInfo: PublicKey.findProgramAddressSync(
      [Buffer.from("USER_INFO"), BANK_APP_ACCOUNTS.bankVault.toBuffer()],
      stakingProgram.programId
    )[0],
  };

  const user1 = getOrGenerateKeypair("user1.json");
  const user2 = getOrGenerateKeypair("user2.json");
  const depositAmount = new BN(1_000_000);
  const bankAsset = PublicKey.findProgramAddressSync(
    [Buffer.from("BANK_ASSET_SEED")],
    program.programId
  )[0];

  const invest = async (amount: BN, isStake: boolean) => {
    return program.methods
      .invest(amount, isStake)
      .accounts({
        bankInfo: BANK_APP_ACCOUNTS.bankInfo,
        bankVault: BANK_APP_ACCOUNTS.bankVault,
        stakingVault: STAKING_APP_ACCOUNTS.stakingVault,
        stakingInfo: STAKING_APP_ACCOUNTS.stakingInfo,
        stakingProgram: stakingProgram.programId,
        authority: provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  };

  const deposit = async (user: Keypair, amount: BN) => {
    return program.methods
      .deposit(amount)
      .accounts({
        user: user.publicKey,
        stakingInfo: STAKING_APP_ACCOUNTS.stakingInfo,
      })
      .signers([user])
      .rpc();
  };

  const withdraw = async (user: Keypair, shares: BN) => {
    return (program.methods as any)
      .withdraw(shares)
      .accounts({
        user: user.publicKey,
        stakingInfo: STAKING_APP_ACCOUNTS.stakingInfo,
      })
      .signers([user])
      .rpc();
  };

  const getBankTotalAssets = async () => {
    const vaultBalance = await provider.connection.getBalance(BANK_APP_ACCOUNTS.bankVault);
    const vaultRent = await provider.connection.getMinimumBalanceForRentExemption(0);
    const liquidValue = new BN(Math.max(vaultBalance - vaultRent, 0));

    let stakedValue = new BN(0);
    try {
      const stakingInfo = await stakingProgram.account.userInfo.fetch(STAKING_APP_ACCOUNTS.stakingInfo);
      stakedValue = stakingInfo.amount;
    } catch (e) {
      // Staking info account not initialized yet
    }

    return {
      liquidValue,
      stakedValue,
      totalAssets: liquidValue.add(stakedValue)
    };
  };

  before(async () => {
    console.log("👤 User 1 Address:", user1.publicKey.toBase58());
    console.log("👤 User 2 Address:", user2.publicKey.toBase58());

    // Create a transaction to transfer SOL from the provider's main account to user1 and user2
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: user1.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: user2.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      })
    );

    // Send and confirm the transaction using the provider
    await provider.sendAndConfirm(transaction);
  });

  // ------------------------------------------------------------------------
  // TEST: INITIALIZE
  // ------------------------------------------------------------------------
  it("Is initialized!", async () => {
    try {
      const bankInfo = await program.account.bankInfo.fetch(
        BANK_APP_ACCOUNTS.bankInfo
      );
      console.log("Bank info: ", bankInfo);
    } catch {
      const tx = await program.methods
        .initialize()
        .accounts({
          authority: provider.publicKey,
        })
        .rpc();
      console.log("Initialize signature: ", tx);
    }
  });

  // ------------------------------------------------------------------------
  // TEST: DEPOSITS, STAKES, UPDATES BANK VALUE
  // ------------------------------------------------------------------------
  it("Deposits, stakes, and updates bank value", async () => {
    console.log("\n--- STEP 1: User 1 Deposits 1,000,000 lamports ---");
    await deposit(user1, depositAmount);
    let user1Reserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user1.publicKey));
    console.log("User 1 Shares:", user1Reserve.shares.toString());

    console.log("\n--- STEP 2: Bank stakes User 1's deposit ---");
    await invest(depositAmount, true);
    let assets = await getBankTotalAssets();
    console.log("Bank Liquid SOL:", assets.liquidValue.toString());
    console.log("Bank Staked SOL:", assets.stakedValue.toString());
    console.log("Bank Total Assets:", assets.totalAssets.toString());

    console.log("\n--- STEP 3 & 4: Wait 1s, trigger yield calculation, and return Bank Balance (1) ---");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Trigger on-chain yield calculation by sending a 0-SOL stake update
    await invest(new BN(0), true);
    assets = await getBankTotalAssets();
    console.log("Updated Bank Liquid SOL:", assets.liquidValue.toString());
    console.log("Updated Bank Staked SOL (including yield):", assets.stakedValue.toString());
    console.log("Bank Balance (1) (Total Assets):", assets.totalAssets.toString());

    console.log("\n--- STEP 5 & 6: User 2 deposits 1,000,000 lamports ---");
    await deposit(user2, depositAmount);
    let user2Reserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user2.publicKey));
    console.log("User 2 Shares (calculated using new Bank value):", user2Reserve.shares.toString());

    console.log("\n--- STEP 7: Bank stakes the combined capital (User 2's deposit) ---");
    await invest(depositAmount, true);
    assets = await getBankTotalAssets();
    console.log("Bank Liquid SOL:", assets.liquidValue.toString());
    console.log("Bank Staked SOL:", assets.stakedValue.toString());
    console.log("Bank Total Assets:", assets.totalAssets.toString());

    console.log("\n--- STEP 8 & 9: Wait 1s, trigger yield calculation, and return Bank Balance after staking ---");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Trigger on-chain yield calculation
    await invest(new BN(0), true);
    assets = await getBankTotalAssets();
    console.log("Updated Bank Liquid SOL:", assets.liquidValue.toString());
    console.log("Updated Bank Staked SOL (after 2nd stake):", assets.stakedValue.toString());
    console.log("Bank Balance (2) (Total Assets):", assets.totalAssets.toString());
  });

  // ------------------------------------------------------------------------
  // TEST: WITHDRAW AND COMPARE
  // ------------------------------------------------------------------------
  it("Withdraws both users and compares results", async () => {
    let assets = await getBankTotalAssets();
    let currentStaked = assets.stakedValue;

    console.log("\n--- STEP 10: Unstake everything back to bank_vault ---");
    console.log("Initial staked balance to unstake:", currentStaked.toString());
    while (currentStaked.gt(new BN(0))) {
      await invest(currentStaked, false);
      assets = await getBankTotalAssets();
      currentStaked = assets.stakedValue;
      console.log("Remaining staked balance after unstake step:", currentStaked.toString());
    }
    console.log("Bank Liquid SOL (all returned):", assets.liquidValue.toString());
    console.log("Bank Staked SOL (should be 0):", assets.stakedValue.toString());
    console.log("Bank Total Assets:", assets.totalAssets.toString());

    console.log("\n--- STEP 11: Withdraw all funds for User 1 and User 2 and compare with formulas ---");
    const bankAssetData = await program.account.bankAsset.fetch(bankAsset);
    const totalShares = bankAssetData.totalShares;
    const finalTotalAssets = assets.liquidValue;

    // Fetch user reserves
    let user1Reserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user1.publicKey));
    let user2Reserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user2.publicKey));

    // Calculate theoretical withdraw amounts based on pool formula:
    // Amount = (User Shares * Total Assets) / Total Shares
    const expectedUser1Received = user1Reserve.shares.mul(finalTotalAssets).div(totalShares);
    const expectedUser2Received = user2Reserve.shares.mul(finalTotalAssets).div(totalShares);

    console.log("\n--- Theoretical Calculations ---");
    console.log("Total Pool Shares:", totalShares.toString());
    console.log("Total Pool Assets:", finalTotalAssets.toString());
    console.log("Expected User 1 Withdraw Amount:", expectedUser1Received.toString(), "lamports");
    console.log("Expected User 2 Withdraw Amount:", expectedUser2Received.toString(), "lamports");

    // Perform withdrawals
    const balanceBeforeWithdraw1 = new BN(await provider.connection.getBalance(user1.publicKey));
    const tx1 = await withdraw(user1, user1Reserve.shares);
    console.log("User 1 withdraw tx signature:", tx1);
    const balanceAfterWithdraw1 = new BN(await provider.connection.getBalance(user1.publicKey));

    const balanceBeforeWithdraw2 = new BN(await provider.connection.getBalance(user2.publicKey));
    const tx2 = await withdraw(user2, user2Reserve.shares);
    console.log("User 2 withdraw tx signature:", tx2);
    const balanceAfterWithdraw2 = new BN(await provider.connection.getBalance(user2.publicKey));

    // Calculate actual change in wallet (excluding tx fee to show clean payout comparison)
    const actualPayout1 = balanceAfterWithdraw1.sub(balanceBeforeWithdraw1);
    const actualPayout2 = balanceAfterWithdraw2.sub(balanceBeforeWithdraw2);

    console.log("\n--- Payout Comparison ---");
    console.log("User 1 Expected Payout:", expectedUser1Received.toString());
    console.log("User 1 Actual Payout (inc. tx fee):", actualPayout1.toString());
    console.log("User 2 Expected Payout:", expectedUser2Received.toString());
    console.log("User 2 Actual Payout (inc. tx fee):", actualPayout2.toString());
  });
});
