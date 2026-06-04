import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("exercise", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Exercise;

  // ---------------- Part 1: Instruction Ordering ----------------

  it("fails to execute without approval", async () => {
    try {
      await program.methods
        .execute(new BN(1000)) // Đã sửa: Dùng trực tiếp BN độc lập
        .accounts({
          authority: provider.wallet.publicKey,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();

      expect.fail("Should have failed");
    } catch (err: any) {
      expect(err.message).to.include("MustApproveFirst");
    }
  });

  it("succeeds with approval in same transaction", async () => {
    // 1. Tạo instruction approve
    const approveIx = await program.methods
      .approve()
      .accounts({ authority: provider.wallet.publicKey })
      .instruction();

    // 2. Tạo instruction execute 
    const executeIx = await program.methods
      .execute(new BN(1000))
      .accounts({
        authority: provider.wallet.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    // 3. Gộp cả 2 instruction vào 1 transaction theo đúng thứ tự (approve trước, execute sau)
    const tx = new anchor.web3.Transaction().add(approveIx).add(executeIx);
    await provider.sendAndConfirm(tx);
  });

  it("fails with wrong order (execute before approve)", async () => {
    // 1. Tạo instruction approve và execute
    const approveIx = await program.methods
      .approve()
      .accounts({ authority: provider.wallet.publicKey })
      .instruction();

    const executeIx = await program.methods
      .execute(new BN(1000))
      .accounts({
        authority: provider.wallet.publicKey,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();

    // 2. Xếp sai thứ tự vào transaction (execute chạy trước approve)
    const tx = new anchor.web3.Transaction().add(executeIx).add(approveIx);

    try {
      await provider.sendAndConfirm(tx);
      expect.fail("Should have failed due to wrong instruction order");
    } catch (err: any) {
      // Hệ thống sẽ bắt được lỗi kiểm tra thứ tự từ Sysvar Instructions
      expect(err.message).to.include("MustApproveFirst");
    }
  });

  // ---------------- Part 2: Regular Account<T> vs Zero-Copy ----------------

  it("initializes and uses large approval data with regular Account<T>", async () => {
    // 1. Derive PDA cho tài khoản "regular"
    const [regularPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("approval_regular"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    // 2. Gọi hàm khởi tạo tài khoản Regular
    await program.methods
      .initializeLargeApprovalRegular()
      .accounts({
        approvalData: regularPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // 3. Gọi hàm xử lý ghi dữ liệu / timestamp vào tài khoản Regular
    await program.methods
      .processLargeApprovalRegular()
      .accounts({
        approvalData: regularPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    // 4. Lấy thông tin tài khoản on-chain để assert (kiểm tra điều kiện)
    const accountInfo = await provider.connection.getAccountInfo(regularPda);
    expect(accountInfo).to.not.be.null;
    expect(accountInfo!.data.length).to.be.greaterThan(8);
  });

  it("initializes and uses large approval data with zero-copy AccountLoader<T>", async () => {
    const [zcPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("approval_zero_copy"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeLargeApprovalZeroCopy()
      .accounts({
        approvalData: zcPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .processLargeApprovalZeroCopy()
      .accounts({
        approvalData: zcPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const accountInfo = await provider.connection.getAccountInfo(zcPda);
    expect(accountInfo).to.not.be.null;
    // Tài khoản Zero-copy chứa dữ liệu thô cực lớn được mapping trực tiếp từ bộ nhớ
    expect(accountInfo!.data.length).to.be.greaterThan(4096);
  });
});