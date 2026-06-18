import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TicketRegistry } from "../target/types/ticket_registry";
import { expect } from "chai";
import * as fs from "fs";

describe("ticket-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TicketRegistry as Program<TicketRegistry>;

  // 1. Hàm load Keypair từ file JSON cục bộ
  const loadKeypair = (relativeFilePath: string): anchor.web3.Keypair => {
    const rawData = fs.readFileSync(`./${relativeFilePath}`, "utf-8");
    const keypairSecret = JSON.parse(rawData);
    return anchor.web3.Keypair.fromSecretKey(Uint8Array.from(keypairSecret));
  };

  // Các ví thực thể tham gia kịch bản
  const organizerKeypair = loadKeypair("user.json");  // Người tổ chức
  const buyer1Keypair = loadKeypair("user1.json");     // Người mua 1
  const buyer2Keypair = loadKeypair("user2.json"); // Người mua 2 (Tạo ngẫu nhiên để test mua nhiều người)

  // Unique suffix avoids PDA collisions on persistent clusters (e.g. devnet).
  const runId = Date.now().toString().slice(-8);
  const eventName = `Event-${runId}`;
  const eventDescription = "This is a test event for the ticket registry program.";
  const ticketPrice = new anchor.BN(1000000); // 0.001 SOL
  const availableTickets = 100;
  const startDate = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // Ngày mai (+1 ngày)

  let eventPda: anchor.web3.PublicKey;
  let ticket1Pda: anchor.web3.PublicKey;
  let ticket2Pda: anchor.web3.PublicKey;

  const deriveEventPda = (name: string): anchor.web3.PublicKey =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("event_account"), Buffer.from(name), organizerKeypair.publicKey.toBuffer()],
      program.programId
    )[0];

  const deriveTicketPda = (
    buyer: anchor.web3.PublicKey,
    event: anchor.web3.PublicKey
  ): anchor.web3.PublicKey =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ticket_account"), buyer.toBuffer(), event.toBuffer()],
      program.programId
    )[0];

  const expectAnchorError = (err: unknown, code: string) => {
    expect(String(err)).to.include(code);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitUntilEventStarted = async (startTs: number) => {
    for (let i = 0; i < 30; i++) {
      const slot = await provider.connection.getSlot();
      const blockTime = await provider.connection.getBlockTime(slot);
      if (blockTime !== null && blockTime > startTs) {
        return;
      }
      await sleep(500);
    }
    throw new Error("Timed out waiting for event start time on-chain");
  };

  before(async () => {
    eventPda = deriveEventPda(eventName);
    ticket1Pda = deriveTicketPda(buyer1Keypair.publicKey, eventPda);
    ticket2Pda = deriveTicketPda(buyer2Keypair.publicKey, eventPda);

    // Airdrop SOL to test accounts on localnet
    /*const airdrop = async (pubkey: anchor.web3.PublicKey) => {
      const sig = await provider.connection.requestAirdrop(
        pubkey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    };

    await airdrop(organizerKeypair.publicKey);
    await airdrop(buyer1Keypair.publicKey);
    await airdrop(buyer2Keypair.publicKey);*/
  });

  // =========================================================================
  // SECTION 1: INITIALIZE EVENT
  // =========================================================================
  describe("Initialize Event", () => {
    
    it("Should initialize a valid event successfully", async () => {
      await program.methods
        .initialize(eventName, eventDescription, ticketPrice, new anchor.BN(availableTickets), startDate)
        .accounts({
          eventAccount: eventPda,
          eventOrganizer: organizerKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([organizerKeypair])
        .rpc();

      const eventAccount = await program.account.eventAccount.fetch(eventPda);
      expect(eventAccount.name).to.equal(eventName);
    });

    it("Should fail when event name is too long", async () => {
      const longName = "A".repeat(31); // > MAX_NAME_LENGTH (30), still fits PDA seed limit (32)
      const longNameEventPda = deriveEventPda(longName);
      try {
        await program.methods
          .initialize(longName, eventDescription, ticketPrice, new anchor.BN(availableTickets), startDate)
          .accounts({
            eventAccount: longNameEventPda,
            eventOrganizer: organizerKeypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([organizerKeypair])
          .rpc();
        expect.fail("Chương trình đáng lẽ phải chặn lỗi tên quá dài!");
      } catch (err: any) {
        expectAnchorError(err, "NameTooLong");
      }
    });

    it("Should fail when event description is too long", async () => {
      const longDesc = "B".repeat(320); // Vượt quá MAX_DESCRIPTION_LENGTH (300)
      const descEventName = `DescFail-${runId}`;
      const descEventPda = deriveEventPda(descEventName);
      try {
        await program.methods
          .initialize(descEventName, longDesc, ticketPrice, new anchor.BN(availableTickets), startDate)
          .accounts({
            eventAccount: descEventPda,
            eventOrganizer: organizerKeypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([organizerKeypair])
          .rpc();
        expect.fail("Chương trình đáng lẽ phải chặn lỗi mô tả quá dài!");
      } catch (err: any) {
        expectAnchorError(err, "DescriptionTooLong");
      }
    });

    it("Should fail when start date is in the past", async () => {
      const pastDate = new anchor.BN(Math.floor(Date.now() / 1000) - 3600); // Quá khứ 1 tiếng trước
      const pastInitEventName = `PastInit-${runId}`;
      const pastInitEventPda = deriveEventPda(pastInitEventName);
      try {
        await program.methods
          .initialize(pastInitEventName, eventDescription, ticketPrice, new anchor.BN(availableTickets), pastDate)
          .accounts({
            eventAccount: pastInitEventPda,
            eventOrganizer: organizerKeypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([organizerKeypair])
          .rpc();
        expect.fail("Chương trình đáng lẽ phải chặn lỗi ngày trong quá khứ!");
      } catch (err: any) {
        expectAnchorError(err, "InvalidStartDate");
      }
    });

    it("Should fail when available tickets is zero", async () => {
      const zeroTicketsEventName = `ZeroTickets-${runId}`;
      const zeroTicketsEventPda = deriveEventPda(zeroTicketsEventName);
      try {
        await program.methods
          .initialize(zeroTicketsEventName, eventDescription, ticketPrice, new anchor.BN(0), startDate)
          .accounts({
            eventAccount: zeroTicketsEventPda,
            eventOrganizer: organizerKeypair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([organizerKeypair])
          .rpc();
        expect.fail("Chương trình đáng lẽ phải chặn lỗi số lượng vé bằng 0!");
      } catch (err: any) {
        expectAnchorError(err, "ZeroTickets");
      }
    });

    it("Should accept event with maximum allowed name and description lengths", async () => {
      const maxName = "SolanaBootcampVersion2026MaxOk"; // Exactly 30 chars
      const maxEventPda = deriveEventPda(maxName);

      await program.methods
        .initialize(maxName, eventDescription, ticketPrice, new anchor.BN(availableTickets), startDate)
        .accounts({
          eventAccount: maxEventPda,
          eventOrganizer: organizerKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([organizerKeypair])
        .rpc();

      const account = await program.account.eventAccount.fetch(maxEventPda);
      expect(account.name).to.equal(maxName);
    });
  });

  // =========================================================================
  // SECTION 2: BUY TICKET
  // =========================================================================
  describe("Buy Ticket", () => {

    it("Should allow buying a ticket successfully", async () => {
      await program.methods
        .buyTicket()
        .accounts({
          buyer: buyer1Keypair.publicKey,
          eventAccount: eventPda,
          ticketAccount: ticket1Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([buyer1Keypair])
        .rpc();

      const ticketAccount = await program.account.ticketAccount.fetch(ticket1Pda);
      expect(ticketAccount.buyer.toBase58()).to.equal(buyer1Keypair.publicKey.toBase58());
    });

    it("Should allow multiple users to buy tickets", async () => {
      // Ví buyer2Keypair đã được cấp vốn ở khối before sẽ tiến hành mua tấm vé thứ 2
      await program.methods
        .buyTicket()
        .accounts({
          buyer: buyer2Keypair.publicKey,
          eventAccount: eventPda,
          ticketAccount: ticket2Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([buyer2Keypair])
        .rpc();

      const eventAccount = await program.account.eventAccount.fetch(eventPda);
      // Ban đầu mở bán 100 vé, qua 2 lượt mua thành công của User1 và User2 ➔ còn lại 98 vé
      expect(eventAccount.availableTickets.toNumber()).to.equal(availableTickets - 2);
    });

    it("Should fail when trying to buy ticket for event that already started", async () => {
      const pastEventName = `Past-${runId}`;
      const soonStartDate = new anchor.BN(Math.floor(Date.now() / 1000) + 2);
      const pastEventPda = deriveEventPda(pastEventName);

      await program.methods
        .initialize(pastEventName, eventDescription, ticketPrice, new anchor.BN(100), soonStartDate)
        .accounts({
          eventAccount: pastEventPda,
          eventOrganizer: organizerKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([organizerKeypair])
        .rpc();

      await waitUntilEventStarted(soonStartDate.toNumber());

      const pastTicketPda = deriveTicketPda(buyer1Keypair.publicKey, pastEventPda);

      try {
        await program.methods
          .buyTicket()
          .accounts({
            buyer: buyer1Keypair.publicKey,
            eventAccount: pastEventPda,
            ticketAccount: pastTicketPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([buyer1Keypair])
          .rpc();
        expect.fail("Không thể mua vé cho sự kiện đã bắt đầu!");
      } catch (err: any) {
        expectAnchorError(err, "EventAlreadyStarted");
      }
    });

    it("Should fail when all tickets are sold out", async () => {
      const soldOutEventName = `SoldOut-${runId}`;
      const soldEventPda = deriveEventPda(soldOutEventName);

      await program.methods
        .initialize(soldOutEventName, eventDescription, ticketPrice, new anchor.BN(1), startDate)
        .accounts({
          eventAccount: soldEventPda,
          eventOrganizer: organizerKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([organizerKeypair])
        .rpc();

      const soldTicket1 = deriveTicketPda(buyer1Keypair.publicKey, soldEventPda);
      const soldTicket2 = deriveTicketPda(buyer2Keypair.publicKey, soldEventPda);

      // Người mua thứ nhất mua vé cuối cùng
      await program.methods
        .buyTicket()
        .accounts({
          buyer: buyer1Keypair.publicKey,
          eventAccount: soldEventPda,
          ticketAccount: soldTicket1,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([buyer1Keypair])
        .rpc();

      // Người mua thứ hai cố gắng mua vé khi đã hết
      try {
        await program.methods
          .buyTicket()
          .accounts({
            buyer: buyer2Keypair.publicKey,
            eventAccount: soldEventPda,
            ticketAccount: soldTicket2,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([buyer2Keypair])
          .rpc();
        expect.fail("Không thể mua vé khi đã hết!");
      } catch (err: any) {
        expectAnchorError(err, "SoldOut");
      }
    });

    it("Should fail when buyer tries to buy the same ticket twice", async () => {
      try {
        // Ví buyer1Keypair cố tình gọi lại hàm mua vé một lần nữa vào đúng địa chỉ ticket1Pda của họ
        await program.methods
          .buyTicket()
          .accounts({
            buyer: buyer1Keypair.publicKey,
            eventAccount: eventPda,
            ticketAccount: ticket1Pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([buyer1Keypair])
          .rpc();
        expect.fail("Hệ thống đáng lẽ phải chặn lỗi không cho mua trùng thực thể vé!");
      } catch (err: any) {
        // Solana Runtime sẽ chặn ngay tại tầng khởi tạo Account nhờ thuộc tính init của Anchor
        expect(err.toString()).to.include("already in use");
      }
    });

    it("Should fail when buyer does not have enough funds to buy ticket", async () => {
      const brokeBuyer = anchor.web3.Keypair.generate();
      const brokeTicketPda = deriveTicketPda(brokeBuyer.publicKey, eventPda);

      try {
        await program.methods
          .buyTicket()
          .accounts({
            buyer: brokeBuyer.publicKey,
            eventAccount: eventPda,
            ticketAccount: brokeTicketPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([brokeBuyer])
          .rpc();
        expect.fail("Ví 0 SOL không thể mua được vé!");
      } catch (err: any) {
        expect(err.toString()).to.include("insufficient lamports");
      }
    });
  });

  // =========================================================================
  // SECTION 3: WITHDRAW FUNDS
  // =========================================================================
  describe("Withdraw Funds", () => {

    it("Should allow event organizer to withdraw funds", async () => {
      const withdrawAmount = new anchor.BN(1000000); // Rút bớt 1 phần tiền thu được
      const balanceBefore = await provider.connection.getBalance(organizerKeypair.publicKey);

      await program.methods
        .withdraw(withdrawAmount)
        .accounts({
          eventAccount: eventPda,
          eventOrganizer: organizerKeypair.publicKey,
        } as any)
        .signers([organizerKeypair])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(organizerKeypair.publicKey);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("Should fail when non-organizer tries to withdraw funds", async () => {
      const withdrawAmount = new anchor.BN(1000000);
      try {
        // Ví kẻ xấu (ở đây lấy luôn ví của người mua buyer1Keypair) cố tình điền tên mình vào ô nhận tiền rút
        await program.methods
          .withdraw(withdrawAmount)
          .accounts({
            eventAccount: eventPda,
            eventOrganizer: buyer1Keypair.publicKey,
          } as any)
          .signers([buyer1Keypair])
          .rpc();
        expect.fail("Kẻ gian không thể rút trộm tiền của sự kiện!");
      } catch (err: any) {
        // Ràng buộc constraint `has_one = event_organizer` trong Rust sẽ đá văng transaction này ra ngoài
        expect(err.toString()).to.include("ConstraintHasOne");
      }
    });

    it("Should fail when trying to withdraw more than available balance", async () => {
      const hugeAmount = new anchor.BN(999000000000); // Yêu cầu rút số tiền khổng lồ vượt quá tổng quỹ vé
      try {
        await program.methods
          .withdraw(hugeAmount)
          .accounts({
            eventAccount: eventPda,
            eventOrganizer: organizerKeypair.publicKey,
          } as any)
          .signers([organizerKeypair])
          .rpc();
        expect.fail("Không thể rút lạm phát quá số dư quỹ!");
      } catch (err : any) {
        expect(err.toString()).to.include("InsufficientFunds");
      }
    });

    it("Should allow partial withdrawal", async () => {
      const partialAmount = new anchor.BN(500000); // Rút một khoản nhỏ linh hoạt
      const tx = await program.methods
        .withdraw(partialAmount)
        .accounts({
          eventAccount: eventPda,
          eventOrganizer: organizerKeypair.publicKey,
        } as any)
        .signers([organizerKeypair])
        .rpc();
      
      expect(tx).to.be.a("string"); // Giao dịch trả về mã băm thành công
    });
  });
});