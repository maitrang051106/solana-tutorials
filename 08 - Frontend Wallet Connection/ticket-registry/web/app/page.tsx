"use client";

import { useState, useEffect, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProgram, PROGRAM_ID } from "../anchor";
import * as anchor from "@coral-xyz/anchor";

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = useWallet();

  // Program instance
  const program = useMemo(() => {
    if (wallet.publicKey) {
      return getProgram(connection, wallet);
    }
    return null;
  }, [connection, wallet]);

  // State for Create Event
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("0.1");
  const [availableTickets, setAvailableTickets] = useState("100");
  const [startDate, setStartDate] = useState("");

  // State for Event List (simplified for this tutorial, just showing one event if found)
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    if (!program) return;
    setLoading(true);
    try {
      const allEvents = await program.account.eventAccount.all();
      setEvents(allEvents);
    } catch (e) {
      console.error("Error fetching events:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [program]);

  const createEvent = async () => {
    if (!program || !publicKey) return;
    try {
      const priceBN = new BN(parseFloat(ticketPrice) * anchor.web3.LAMPORTS_PER_SOL);
      const ticketsBN = new BN(availableTickets);
      const dateBN = new BN(new Date(startDate).getTime() / 1000);

      const [eventPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("event_account"),
          Buffer.from(eventName),
          publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      await program.methods
        .initialize(eventName, description, priceBN, ticketsBN, dateBN)
        .accounts({
          eventOrganizer: publicKey,
          eventAccount: eventPDA,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      alert("Event created successfully!");
      setEventName("");
      setDescription("");
      fetchEvents();
    } catch (e) {
      console.error("Error creating event:", e);
      alert("Failed to create event: " + e);
    }
  };

  const buyTicket = async (eventAccount: PublicKey, eventName: string, organizer: PublicKey) => {
    if (!program || !publicKey) return;
    try {
      const [ticketPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("ticket_account"),
          publicKey.toBuffer(),
          eventAccount.toBuffer(),
        ],
        PROGRAM_ID
      );

      await program.methods
        .buyTicket()
        .accounts({
          buyer: publicKey,
          ticketAccount: ticketPDA,
          eventAccount: eventAccount,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      alert("Ticket purchased!");
      fetchEvents();
    } catch (e) {
      console.error("Error buying ticket:", e);
      alert("Failed to buy ticket: " + e);
    }
  };

  const withdrawFunds = async (eventAccount: PublicKey, amountSol: string) => {
    if (!program || !publicKey) return;
    try {
      const amountBN = new BN(parseFloat(amountSol) * anchor.web3.LAMPORTS_PER_SOL);
      await program.methods
        .withdraw(amountBN)
        .accounts({
          eventOrganizer: publicKey,
          eventAccount: eventAccount,
        })
        .rpc();

      alert("Funds withdrawn!");
      fetchEvents();
    } catch (e) {
      console.error("Error withdrawing funds:", e);
      alert("Failed to withdraw funds: " + e);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-slate-50 text-slate-900">
      <div className="max-w-4xl w-full flex flex-col gap-8">
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">Ticket Registry</h1>
            <p className="text-slate-500">Decentralized Event Management</p>
          </div>
          <WalletMultiButton />
        </header>

        {publicKey ? (
          <>
            {/* Create Event Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Event Name"
                  className="p-2 border rounded"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Description"
                  className="p-2 border rounded"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Ticket Price (SOL)"
                  className="p-2 border rounded"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Available Tickets"
                  className="p-2 border rounded"
                  value={availableTickets}
                  onChange={(e) => setAvailableTickets(e.target.value)}
                />
                <input
                  type="datetime-local"
                  className="p-2 border rounded"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <button
                  onClick={createEvent}
                  className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition"
                >
                  Create Event
                </button>
              </div>
            </section>

            {/* Event List Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Live Events</h2>
                <button onClick={fetchEvents} className="text-indigo-600 text-sm hover:underline">
                  Refresh
                </button>
              </div>

              {loading ? (
                <p>Loading events...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.length === 0 && <p className="text-slate-500">No events found.</p>}
                  {events.map((evt) => (
                    <div key={evt.publicKey.toString()} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold">{evt.account.name}</h3>
                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
                          {evt.account.availableTickets.toString()} left
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm line-clamp-2">{evt.account.description}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-semibold text-slate-900">
                          {(evt.account.ticketPrice.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                        </span>
                        <span>•</span>
                        <span>{new Date(evt.account.startDate.toNumber() * 1000).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() => buyTicket(evt.publicKey, evt.account.name, evt.account.eventOrganizer)}
                          className="w-full bg-slate-900 text-white p-2 rounded hover:bg-slate-800 transition"
                          disabled={evt.account.availableTickets.toNumber() === 0}
                        >
                          Buy Ticket
                        </button>
                        
                        {/* Withdraw only visible or accessible if you are the organizer */}
                        {evt.account.eventOrganizer.toString() === publicKey.toString() && (
                          <div className="mt-2 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400 mb-2">Organizer Dashboard</p>
                            <button
                              onClick={() => {
                                const amt = prompt("Amount to withdraw in SOL:");
                                if (amt) withdrawFunds(evt.publicKey, amt);
                              }}
                              className="w-full border border-indigo-600 text-indigo-600 p-2 rounded hover:bg-indigo-50 transition"
                            >
                              Withdraw Funds
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-slate-300">
            <p className="text-slate-500 mb-4">Please connect your wallet to interact with the Ticket Registry</p>
            <WalletMultiButton />
          </div>
        )}
      </div>
    </main>
  );
}
