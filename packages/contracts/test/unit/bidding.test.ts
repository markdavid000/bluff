import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { startFreeGame } from "../helpers/tables";
import { deployGameFixture } from "../fixtures";

const PLAYING = 3n;
const WAITING = 1n;
const TURN_LIMIT = 45n;

describe("bidding", function () {
  it("records a bid, passes the turn and resets the deadline", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    await time.increase(10);
    await expect(bluff.connect(alice).placeBid(id, 2, 5))
      .to.emit(bluff, "BidPlaced")
      .withArgs(id, 1n, alice.address, 2, 5, 1, (deadline: bigint) => deadline > 0n);
    const [table] = await bluff.getTable(id);
    expect(table.bidQuantity).to.equal(2n);
    expect(table.bidFace).to.equal(5n);
    expect(table.bidder).to.equal(0n);
    expect(table.turn).to.equal(1n);
    expect(table.deadline - BigInt(await time.latest())).to.equal(TURN_LIMIT);
  });

  it("goes round the table and wraps back to seat 0", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    await bluff.connect(alice).placeBid(id, 1, 2);
    await bluff.connect(bob).placeBid(id, 1, 3);
    await bluff.connect(carol).placeBid(id, 1, 4);
    expect((await bluff.getTable(id))[0].turn).to.equal(0n);
    await expect(bluff.connect(alice).placeBid(id, 2, 2)).to.emit(bluff, "BidPlaced");
  });

  it("lets only the player on turn bid", async function () {
    const { alice, bob, carol, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob, carol]);
    await expect(bluff.connect(bob).placeBid(id, 1, 2))
      .to.be.revertedWithCustomError(bluff, "NotYourTurn")
      .withArgs(id, 0);
    await bluff.connect(alice).placeBid(id, 1, 2);
    await expect(bluff.connect(alice).placeBid(id, 2, 2))
      .to.be.revertedWithCustomError(bluff, "NotYourTurn")
      .withArgs(id, 1);
  });

  it("refuses bids on ones and on faces outside 2 to 6", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    for (const face of [0, 1, 7]) {
      await expect(bluff.connect(alice).placeBid(id, 1, face))
        .to.be.revertedWithCustomError(bluff, "InvalidFace")
        .withArgs(face);
    }
  });

  it("refuses a quantity of zero or more than the dice in play", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await expect(bluff.connect(alice).placeBid(id, 0, 3))
      .to.be.revertedWithCustomError(bluff, "InvalidQuantity")
      .withArgs(0, 8);
    await expect(bluff.connect(alice).placeBid(id, 9, 3))
      .to.be.revertedWithCustomError(bluff, "InvalidQuantity")
      .withArgs(9, 8);
    await expect(bluff.connect(alice).placeBid(id, 8, 3)).to.emit(bluff, "BidPlaced");
  });

  it("needs each bid to beat the last one", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await bluff.connect(alice).placeBid(id, 3, 4);
    await expect(bluff.connect(bob).placeBid(id, 3, 4))
      .to.be.revertedWithCustomError(bluff, "BidNotHigher")
      .withArgs(3, 4, 3, 4);
    await expect(bluff.connect(bob).placeBid(id, 3, 3))
      .to.be.revertedWithCustomError(bluff, "BidNotHigher")
      .withArgs(3, 3, 3, 4);
    await expect(bluff.connect(bob).placeBid(id, 2, 6))
      .to.be.revertedWithCustomError(bluff, "BidNotHigher")
      .withArgs(2, 6, 3, 4);
    await expect(bluff.connect(bob).placeBid(id, 3, 5)).to.emit(bluff, "BidPlaced");
    await expect(bluff.connect(alice).placeBid(id, 4, 2)).to.emit(bluff, "BidPlaced");
  });

  it("leaves no higher bid after every die showing six", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await bluff.connect(alice).placeBid(id, 8, 6);
    for (const [quantity, face] of [
      [8, 6],
      [8, 5],
      [7, 6],
    ]) {
      await expect(bluff.connect(bob).placeBid(id, quantity, face)).to.be.revertedWithCustomError(
        bluff,
        "BidNotHigher"
      );
    }
    await expect(bluff.connect(bob).placeBid(id, 9, 6)).to.be.revertedWithCustomError(
      bluff,
      "InvalidQuantity"
    );
  });

  it("refuses bids before the game starts", async function () {
    const { alice, bluff } = await deployGameFixture();
    await bluff.connect(alice).createFreeTable(3, false);
    const id = await bluff.tableOf(alice.address);
    await expect(bluff.connect(alice).placeBid(id, 1, 2))
      .to.be.revertedWithCustomError(bluff, "WrongStatus")
      .withArgs(id, WAITING);
  });

  it("refuses bids on an unknown table", async function () {
    const { alice, bluff } = await deployGameFixture();
    const unknown = 2n ** 48n;
    await expect(bluff.connect(alice).placeBid(unknown, 1, 2))
      .to.be.revertedWithCustomError(bluff, "TableNotFound")
      .withArgs(unknown);
  });

  it("keeps the game playing while bids go round", async function () {
    const { alice, bob, bluff } = await deployGameFixture();
    const id = await startFreeGame(bluff, [alice, bob]);
    await bluff.connect(alice).placeBid(id, 1, 2);
    expect((await bluff.getTable(id))[0].status).to.equal(PLAYING);
  });
});
