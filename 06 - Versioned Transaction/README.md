# Lesson 06: Versioned Transactions & Address Lookup Tables (ALTs)

Welcome to Lesson 06! In this tutorial, we will explore one of the most critical optimizations for scaling decentralized applications on Solana: **Versioned Transactions** and **Address Lookup Tables (ALTs)**. 

## Introduction: The Problem with Legacy Transactions

On the Solana blockchain, every transaction has a strict maximum size limit of **1232 bytes**. 

A significant portion of a transaction's size is consumed by account addresses (Public Keys), which take up **32 bytes each**. In a standard "Legacy" transaction, this means you can realistically only include about 15 to 20 unique accounts before you hit the maximum size limit.

**Why is this a problem?**
If you want to perform bulk or batch operations—such as sending tokens to 50 users simultaneously, claiming rewards from multiple staking pools, or depositing multiple assets into a bank in a single click—your transaction will fail with a `Transaction too large` error. You would be forced to ask the user to sign multiple separate transactions, ruining the user experience.

You can observe this limitation in our test file (`bank_app.ts`), where attempting to bundle 30 deposit instructions into a single Legacy Transaction throws an error.

## The Solution: Address Lookup Tables (ALTs)

To bypass this severe limitation, Solana introduced **Address Lookup Tables (ALTs)**.

Think of an ALT as an on-chain phonebook. Instead of passing full 32-byte Public Keys inside your transaction, you can create a table on the blockchain that stores an array of these Public Keys. 

Once the table is created, your transaction only needs to provide a **1-byte index** (e.g., index `0`, index `1`) that points to the correct Public Key inside that table. This compresses the space required for an address by **96%** (from 32 bytes to 1 byte)!

## Versioned Transactions (v0)

Because the old transaction format did not support reading from these lookup tables, Solana introduced a new transaction structure called **Versioned Transactions** (specifically, version `v0`). 

A `v0` transaction is specifically designed to accept an array of ALTs, allowing the transaction to decode those 1-byte indexes back into full Public Keys during execution.

---

## Tutorial: Implementing ALTs in our Bank App

In this project, we demonstrate how to use Versioned Transactions to perform **Batch Deposits** (sending multiple SOL and SPL tokens in one single transaction). Here is how the system works:

### 1. The Smart Contract (Rust)
Our Rust program (`programs/bank_app/src`) is built standardly using Anchor. We have separate instructions for `deposit` (native SOL) and `deposit_token` (SPL Tokens). The smart contract itself does not need to know about ALTs; the compression happens entirely on the client side (frontend) before the transaction reaches the program.

### 2. Managing the Lookup Table (`tests/alt_helper.ts`)
Creating and managing an ALT involves several specific steps, which we abstracted into a helper function:
* **Create:** We use `AddressLookupTableProgram.createLookupTable()`. **Important Note:** Creating a table requires a `recentSlot`. On local testing environments, you must wait a brief moment and fetch the slot using `connection.getSlot("finalized")` to prevent "invalid slot" errors.
* **Extend:** We use `AddressLookupTableProgram.extendLookupTable()` to push our frequently used addresses (User, Bank Vault, Token Mints, Token Accounts) into the table.
* **Wait for Activation:** Blockchain state changes take time. After creating or extending an ALT, we must `sleep()` for a few seconds to ensure the network fully registers the table before we try to use it in our main transactions.

### 3. Executing Batch Transactions (`tests/bank_app.ts`)
To perform batch operations using the ALT we created, follow this flow:

**Step A: Build your instructions**
Instead of immediately sending instructions via `.rpc()`, we build them using `.instruction()` and push them into an array:
```typescript
const ix1 = await program.methods.deposit(new anchor.BN(100)).accounts({...}).instruction();
const ix2 = await program.methods.deposit(new anchor.BN(200)).accounts({...}).instruction();
const instructions = [ix1, ix2];
```

**Step B: Fetch the ALT Account**
Retrieve the actual lookup table data from the blockchain:
```typescript
const lookupTableAccount = (await connection.getAddressLookupTable(lookupTableAddress)).value;
```

**Step C: Compile the v0 Message**
Create a `TransactionMessage` and compile it into the `v0` format, passing your lookup table as an argument. The Solana SDK will automatically scan your instructions, find matches in the ALT, and compress them into 1-byte indexes!
```typescript
const messageV0 = new TransactionMessage({
  payerKey: user.publicKey,
  recentBlockhash: latestBlockhash.blockhash,
  instructions: instructions,
}).compileToV0Message([lookupTableAccount]); // Attach the ALT here!
```

**Step D: Sign and Send**
Wrap the `v0` message into a `VersionedTransaction` and send it to the network.
```typescript
const transaction = new VersionedTransaction(messageV0);
transaction.sign([user]);
const signature = await connection.sendTransaction(transaction);
```

## Conclusion

By mastering Versioned Transactions and Address Lookup Tables, you can overcome Solana's strict transaction size limits. This enables you to build highly complex, gas-efficient decentralized applications that provide a seamless "one-click" experience for users, no matter how many instructions are executing under the hood.
