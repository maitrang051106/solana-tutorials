import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BankApp } from "../target/types/bank_app";
import { 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  TransactionMessage, 
  VersionedTransaction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  TOKEN_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";
import { getOrCreateAndExtendALT, ALTCache } from "./alt_helper";
import { expect } from "chai";
import * as fs from 'fs';

function getOrGenerateKeypair(filename: string): Keypair {
  try {
    if (fs.existsSync(filename)) {
      const secretKeyString = fs.readFileSync(filename, 'utf8');
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      return Keypair.fromSecretKey(secretKey);
    }
  } catch (e) {
    console.warn(`Could not read keypair from ${filename}, generating a new one.`);
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(filename, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

describe("bank_app_batch", () => {
  // Configure the client to use the local cluster (solana-test-validator).
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BankApp as Program<BankApp>;
  const connection = provider.connection;

  // Derive the Bank Vault PDA (Program Derived Address).
  // This is the global account that will hold native SOL.
  const [bankVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("BANK_VAULT_SEED")],
    program.programId
  );

  // Generate new keypairs for testing.
  const admin = getOrGenerateKeypair('admin.json');
  const user = getOrGenerateKeypair('user.json');

  // Test setup variables for our SPL tokens.
  const NUM_TOKENS = 3;
  const tokenMints: PublicKey[] = [];
  const userAtas: PublicKey[] = [];
  const bankAtas: PublicKey[] = [];

  let lookupTableAddress: PublicKey;

  // before() runs once before any 'it' tests block.
  // We use this to set up the environment: airdropping SOL, initializing the bank, and minting tokens.

  before(async () => {
    console.log("👤 Admin Address:", admin.publicKey.toBase58());
    console.log("👤 User Address:", user.publicKey.toBase58());

    // Create a transaction to transfer SOL from the provider's main account to user1 and user2
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: admin.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: user.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      })
    );

    // Send and confirm the transaction using the provider
    await provider.sendAndConfirm(transaction);

    // 2. Initialize the Bank Smart Contract.
    // This creates the bank vault PDA on-chain.
    await program.methods.initialize()
      .accounts({ admin: admin.publicKey })
      .signers([admin])
      .rpc();

    // 3. Create SPL Tokens and Associated Token Accounts (ATAs).
    for (let i = 0; i < NUM_TOKENS; i++) {
      // Create a brand new token mint (like creating a new cryptocurrency).
      const mint = await createMint(connection, admin, admin.publicKey, null, 6);
      tokenMints.push(mint);

      // Create an ATA for the user so they can hold this new token.
      const userAta = await getOrCreateAssociatedTokenAccount(connection, user, mint, user.publicKey);
      userAtas.push(userAta.address);
      
      // Mint 1,000 tokens (adjusted for 6 decimals = 1,000,000,000) to the user.
      await mintTo(connection, admin, mint, userAta.address, admin, 1000000000); 

      // Derive the ATA address for the Bank Vault PDA.
      // Notice the 'true' parameter: it allows the owner to be a PDA instead of a regular keypair.
      const bankAta = getAssociatedTokenAddressSync(mint, bankVaultPda, true);
      bankAtas.push(bankAta);

      // Check if the Bank's ATA already exists on-chain, if not, create it.
      const bankAtaInfo = await connection.getAccountInfo(bankAta);
      if (!bankAtaInfo) {
        const tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            admin.publicKey, // Payer
            bankAta,         // The ATA to create
            bankVaultPda,    // The owner of the ATA
            mint             // The token mint
          )
        );
        await provider.sendAndConfirm(tx, [admin]);
      }
    }
  });

  it("Creates and extends ALT for Batch Transactions", async () => {
    // Collect all the public keys that we will be repeatedly using in our transactions.
    // Putting these into an ALT will save massive amounts of transaction space.
    const addressesToCache = [
      user.publicKey,
      bankVaultPda,
      TOKEN_PROGRAM_ID,
      anchor.web3.SystemProgram.programId,
      ...tokenMints,
      ...userAtas,
      ...bankAtas,
    ];

    // Call our helper to create a new Address Lookup Table on the network.
    lookupTableAddress = await getOrCreateAndExtendALT(
      connection,
      admin,
      addressesToCache
    );
    
    // Cache the lookup table address for future runs (simulating a production environment).
    ALTCache['bankApp'] = lookupTableAddress;
    expect(lookupTableAddress).to.not.be.null;
  });

  it("Batch SOL Deposits using Versioned Transaction", async () => {
    const depositInstructions = [];
    const NUM_DEPOSITS = 5;

    // We create 5 separate deposit instructions (just as a test).
    // In a legacy transaction, putting 5 complex instructions might hit size limits.
    for (let i = 0; i < NUM_DEPOSITS; i++) {
      // Notice we use `.instruction()` instead of `.rpc()`.
      // `.rpc()` sends it immediately. `.instruction()` just builds the object so we can bundle it.
      const ix = await program.methods.deposit(new anchor.BN(100000)) // 0.0001 SOL
        .accounts({
          user: user.publicKey,
        })
        .instruction();
      depositInstructions.push(ix);
    }

    // Fetch the latest blockhash and our newly created ALT.
    const latestBlockhash = await connection.getLatestBlockhash();
    const lookupTableAccount = (await connection.getAddressLookupTable(lookupTableAddress)).value;

    // Create a Versioned Transaction Message (v0).
    // This is the crucial step: we pass our instructions AND our `lookupTableAccount`.
    // The `compileToV0Message` function will automatically look at our instructions, 
    // find matching addresses in the ALT, and replace them with 1-byte indexes!
    const messageV0 = new TransactionMessage({
      payerKey: user.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: depositInstructions,
    }).compileToV0Message([lookupTableAccount]);

    // Wrap the message in a transaction and sign it.
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([user]);

    // Send the batched transaction to the network.
    const signature = await connection.sendTransaction(transaction);
    await connection.confirmTransaction({
    signature: signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }, "confirmed");

    console.log(`Batch SOL Deposit successful! Signature: ${signature}`);
  });

  it("Batch Token Deposits using Versioned Transaction", async () => {
    const depositInstructions = [];

    // Bundle 3 different SPL token deposits into a single transaction.
    for (let i = 0; i < NUM_TOKENS; i++) {
      const ix = await program.methods.depositToken(new anchor.BN(5000000)) // 5 tokens
        .accounts({
          user: user.publicKey,
          userAta: userAtas[i],
          bankAta: bankAtas[i],
          // tokenProgram is automatically inferred by Anchor when it recognizes the standard SPL token.
        })
        .instruction();
      depositInstructions.push(ix);
    }

    const latestBlockhash = await connection.getLatestBlockhash();
    const lookupTableAccount = (await connection.getAddressLookupTable(lookupTableAddress)).value;
    if (!lookupTableAccount) {
      throw new Error("Lookup Table account not found");
    }
    // Again, compile the V0 message using our lookup table.
    const messageV0 = new TransactionMessage({
      payerKey: user.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: depositInstructions,
    }).compileToV0Message([lookupTableAccount]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([user]);

    const signature = await connection.sendTransaction(transaction);
    await connection.confirmTransaction({
      signature: signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, "confirmed");

    console.log(`Batch Token Deposit successful! Signature: ${signature}`);
  });

  it("Handles Errors: Insufficient Token Balance", async () => {
    // Try to deposit 2000 tokens, but the user only has 1000.
    const massiveAmount = new anchor.BN(2000000000);

    const ix = await program.methods.depositToken(massiveAmount)
      .accounts({
        user: user.publicKey,
        userAta: userAtas[0],
        bankAta: bankAtas[0],
      })
      .instruction();

    const latestBlockhash = await connection.getLatestBlockhash();
    const lookupTableAccount = (await connection.getAddressLookupTable(lookupTableAddress)).value;

    const messageV0 = new TransactionMessage({
      payerKey: user.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message([lookupTableAccount]);

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([user]);

    try {
      await connection.sendTransaction(transaction);
      // If it reaches here, the test should fail because it was supposed to error out.
      expect.fail("Transaction should have failed due to insufficient balance");
    } catch (e) {
      // The RPC should throw an error containing the custom program error for insufficient funds.
      expect(e.message).to.not.equal("Transaction should have failed due to insufficient balance");
      console.log("Successfully caught insufficient balance error.");
    }
  });

  it("Legacy Transaction comparison (Size Limit)", async () => {
    // This test proves why we need Versioned Transactions.
    // We try to bundle 30 instructions into an old-school (Legacy) transaction.
    const massiveInstructions = [];
    
    for(let i=0; i<30; i++) {
        const ix = await program.methods.deposit(new anchor.BN(1000))
        .accounts({ user: user.publicKey })
        .instruction();
        massiveInstructions.push(ix);
    }

    const tx = new Transaction().add(...massiveInstructions);
    
    try {
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = user.publicKey;
        
        // When we attempt to serialize a massive legacy transaction, it throws an error 
        // because the size strictly exceeds 1232 bytes.
        const serialized = tx.serialize({requireAllSignatures: false});
        console.log(`Legacy Tx Size: ${serialized.length} bytes`);
        if (serialized.length > 1232) {
             throw new Error("Transaction too large");
        }
    } catch (e) {
        expect(e.message).to.include("too large");
        console.log("Legacy transaction failed as expected due to size limits.");
    }
  });
});