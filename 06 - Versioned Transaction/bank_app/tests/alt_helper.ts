import { 
  Connection, 
  PublicKey, 
  Keypair, 
  AddressLookupTableProgram, 
  VersionedTransaction, 
  TransactionMessage 
} from "@solana/web3.js";

// Optional: A cache to store created ALT addresses.
// This prevents us from creating a new ALT every time we run the script.
// In a real application, you would save this address in a database or environment variable.
export const ALTCache: Record<string, PublicKey> = {};

/**
 * Creates or extends an Address Lookup Table (ALT).
 * ALTs allow us to compress multiple 32-byte public keys into 1-byte indexes,
 * solving the "Transaction too large" error when doing batch operations.
 * 
 * @param connection - The Solana RPC Connection.
 * @param payer - The Keypair that will pay the fees for creating/extending the ALT.
 * @param newAddresses - The array of PublicKeys to add to the ALT.
 * @param lookupTableAddress - (Optional) The existing ALT address if we just want to extend it.
 */
export async function getOrCreateAndExtendALT(
  connection: Connection,
  payer: Keypair,
  newAddresses: PublicKey[],
  lookupTableAddress?: PublicKey
): Promise<PublicKey> {
  let altAddress = lookupTableAddress;

  // 1. Create a new ALT if one wasn't provided.
  if (!altAddress) {
    // Wait a brief moment to ensure the localtest validator has produced enough slots.
    await sleep(1000);
    
    // To create an ALT, we need a recent block slot.
    // We use "finalized" to ensure the network fully recognizes this slot.
    const slot = await connection.getSlot("finalized");
    
    // AddressLookupTableProgram provides the instruction to create the table.
    // It returns the instruction (to be sent) and the predicted address of the new ALT.
    const [createLookupTableInst, lookupTableAddr] =
      AddressLookupTableProgram.createLookupTable({
        authority: payer.publicKey, // Who has permission to add addresses later
        payer: payer.publicKey,     // Who pays for the account rent
        recentSlot: slot,           // A recent block slot
      });

    altAddress = lookupTableAddr;

    // Fetch the latest blockhash required to build a new Versioned Transaction.
    const latestBlockhash = await connection.getLatestBlockhash();
    
    // Build a Versioned Transaction Message (v0) containing our create instruction.
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [createLookupTableInst],
    }).compileToV0Message(); // Compile it into the v0 format

    // Wrap the message in a VersionedTransaction and sign it.
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([payer]);

    // Send the transaction to the network.
    const signature = await connection.sendTransaction(transaction);
    await connection.confirmTransaction({ signature, ...latestBlockhash });
    console.log(`Created ALT: ${altAddress.toBase58()}`);
    
    // CRITICAL: We must wait for the ALT to fully activate on the network 
    // before we can extend it or use it in other transactions.
    await sleep(2000); // Usually takes 1-2 seconds on a local network.
  }

  // 2. Extend the ALT by adding the new addresses to it.
  if (newAddresses.length > 0) {
    // Create the instruction to add addresses to the existing ALT.
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: payer.publicKey,
      authority: payer.publicKey, // Must match the authority set during creation
      lookupTable: altAddress,
      addresses: newAddresses,    // The public keys we want to store
    });

    const latestBlockhash = await connection.getLatestBlockhash();
    
    // Build another Versioned Transaction just for the extension.
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [extendInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([payer]);

    const signature = await connection.sendTransaction(transaction);
    await connection.confirmTransaction({ signature, ...latestBlockhash });
    console.log(`Extended ALT with ${newAddresses.length} addresses`);
    
    // Wait again for the network to process the new addresses 
    // before we try to reference them in our main deposit transactions.
    await sleep(2000); 
  }

  return altAddress;
}

// Utility function to pause execution for a given number of milliseconds.
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
