import { Idl, Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idlRaw from "./ticket_registry.json";
import { TicketRegistry } from "./ticket_registry";

export const idl = idlRaw as TicketRegistry;

export const PROGRAM_ID = new PublicKey(idlRaw.address);

export function getProgram(connection: Connection, wallet: any) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(idl, provider);
}
