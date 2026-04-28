import { expect } from "chai";
import { ethers } from "hardhat";

describe("ObscuraAddressBook", function () {
  let book: any;
  let alice: any;
  let bob: any;

  beforeEach(async function () {
    [alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ObscuraAddressBook");
    book = await F.deploy();
    await book.waitForDeployment();
  });

  it("relabel/remove require an existing contact", async function () {
    await expect(
      book.connect(alice).relabel(0, ethers.id("x"))
    ).to.be.revertedWithCustomError(book, "ContactNotFound");

    await expect(
      book.connect(alice).removeContact(0)
    ).to.be.revertedWithCustomError(book, "ContactNotFound");
  });

  it("nextContactId starts at 0 per owner", async function () {
    expect(await book.nextContactId(alice.address)).to.equal(0n);
    expect(await book.nextContactId(bob.address)).to.equal(0n);
  });

  it("listContactIds returns empty for unknown owner", async function () {
    const ids = await book.listContactIds(alice.address);
    expect(ids.length).to.equal(0);
  });

  // addContact requires InEaddress (FHE mock); covered by the frontend
  // smoke tests rather than here, matching project test convention.
});
