import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BankApp } from "../target/types/bank_app";
import { PublicKey, SystemProgram, TransactionInstruction, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";
// FIX: Make sure to import all required token functions
import { createAssociatedTokenAccountInstruction, createMint, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  before(async () => {
    // Get the latest blockhash to confirm transactions (prevents deprecation errors)
    const latestBlockHash = await provider.connection.getLatestBlockhash();

    // Airdrop SOL to 2 users to cover transaction fees
    const sig1 = await provider.connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig1,
    });

    const sig2 = await provider.connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig2,
    });
  });

  // ------------------------------------------------------------------------
  // TEST: INITIALIZE
  // ------------------------------------------------------------------------
  // Initializes the bank app by creating the `bankInfo` and `bankVault` PDAs.
  // We only pass `authority` because Anchor automatically resolves the PDAs and SystemProgram.
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
  // Calls the `deposit` instruction to transfer native SOL to the bank vault.
  // Anchor handles resolving all the required PDAs (like `bankVault` and `userReserve`).
  
  let last_time: number; // FIX: Removed the Rust 'mut' keyword

  it("Is deposited!", async () => {
    // User 1 deposits 1,000,000 SOL (lamports)
    const tx = await program.methods.deposit(new BN(1_000_000))
      .accounts({
        user: user1.publicKey,
      })
      .signers([user1])
      .rpc();
    console.log("Deposit signature (User1): ", tx);
    
    last_time = new Date().getTime();
    const userReserve1 = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user1.publicKey))
    console.log("User1 reserve (shares): ", userReserve1.shares.toString())

    // Pause the program for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // User 2 deposits 2,000,000 SOL (lamports)
    const tx2 = await program.methods.deposit(new BN(2_000_000))
      .accounts({
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();
    console.log("Deposit signature (User2): ", tx2);
    
    last_time = new Date().getTime();
    const userReserve2 = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user2.publicKey))
    console.log("User2 reserve (shares): ", userReserve2.shares.toString())
  });

  // ------------------------------------------------------------------------
  // TEST: CHECK BALANCES
  // ------------------------------------------------------------------------
  it("Check actual SOL balances after 2 seconds", async () => {
    console.log("\n⏳ Waiting for 2 seconds...");
    // Pause the program for 2 seconds securely
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 1. Find the PDA of the Bank Asset account (Where total shares are stored)
    const bankAssetPda = PublicKey.findProgramAddressSync(
      [Buffer.from("BANK_ASSET_SEED")],
      program.programId
    )[0];

    // 2. Fetch the Bank's overall data
    const bankAsset = await program.account.bankAsset.fetch(bankAssetPda);
    const totalShares = bankAsset.totalShares;
    
    // Get the actual SOL balance currently sitting in the Vault
    const vaultBalance = await provider.connection.getBalance(BANK_APP_ACCOUNTS.bankVault);

    console.log("🏦 --- BANK OVERVIEW ---");
    console.log("Total Issued Shares: ", totalShares.toString());
    console.log("Total SOL in Vault (lamports): ", vaultBalance.toString());

    // 3. Calculate and convert for User 1
    const userReserve1 = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user1.publicKey));
    const user1Shares = userReserve1.shares;
    
    // Formula: (User 1 Shares * Total SOL in Vault) / Total Shares
    const user1ActualSol = (user1Shares.mul(new BN(vaultBalance))).div(totalShares);

    console.log("\n👤 --- CHECKING USER 1 ---");
    console.log("Shares currently held: ", user1Shares.toString());
    console.log("💰 Actual converted asset value: ", user1ActualSol.toString(), " lamports");

    // 4. Calculate and convert for User 2
    const userReserve2 = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user2.publicKey));
    const user2Shares = userReserve2.shares;
    
    // Formula: (User 2 Shares * Total SOL in Vault) / Total Shares
    const user2ActualSol = (user2Shares.mul(new BN(vaultBalance))).div(totalShares);

    console.log("\n👤 --- CHECKING USER 2 ---");
    console.log("Shares currently held: ", user2Shares.toString());
    console.log("💰 Actual converted asset value: ", user2ActualSol.toString(), " lamports");
    console.log("------------------------------------------\n");
  });

  // ------------------------------------------------------------------------
  // TEST: DEPOSIT SPL TOKEN
  // ------------------------------------------------------------------------
  // Deposits SPL tokens. We construct the pre-instructions to create the Bank's ATA
  // if it doesn't exist yet, then we call `depositToken`.
  it("Is deposited token!", async () => {
    // 1. Mint a brand new test Token on the network
    const tokenMint = await createMint(
      provider.connection,
      user1, // user1 pays the fee to create the token
      user1.publicKey, // user1 is the mint authority
      null,
      6 // Decimals
    );
    console.log("Created test Token Mint: ", tokenMint.toBase58());
    
    // 2. Create an ATA for user1 and mint 5 billion tokens to it for testing
    const userAtaAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user1,
      tokenMint,
      user1.publicKey
    );
    const userAta = userAtaAccount.address;

    await mintTo(
      provider.connection,
      user1,
      tokenMint,
      userAta,
      user1.publicKey, // Mint authority belongs to user1
      5_000_000_000 // Mint 5 billion tokens
    );

    // 3. Create an ATA for the Bank's Vault (if it doesn't exist)
    let bankAta = getAssociatedTokenAddressSync(tokenMint, BANK_APP_ACCOUNTS.bankVault, true);

    let preInstructions: TransactionInstruction[] = []
    if (await provider.connection.getAccountInfo(bankAta) == null) {
      preInstructions.push(createAssociatedTokenAccountInstruction(
        user1.publicKey, // user1 pays for the ATA creation
        bankAta,
        BANK_APP_ACCOUNTS.bankVault,
        tokenMint
      ))
    }

    // 4. Call the depositToken instruction
    const tx = await program.methods.depositToken(new BN(1_000_000_000))
      .accounts({
        tokenMint: tokenMint,
        user: user1.publicKey, // Switch to user1 instead of provider
      })
      .preInstructions(preInstructions)
      .signers([user1]) // user1 must sign
      .rpc();
    console.log("Deposit token signature: ", tx);

    // 5. Verify the user's reserve
    const userReserve = await program.account.userReserve.fetch(BANK_APP_ACCOUNTS.userReserve(user1.publicKey, tokenMint))
    console.log("User reserve (Shares): ", userReserve.shares.toString())
  });
});