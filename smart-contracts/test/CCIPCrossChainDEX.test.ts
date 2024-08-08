import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CCIPCrossChainDEX, MockRouter, MockToken } from "../typechain-types";

describe("CCIPCrossChainDEX", function () {
  let ccipDex: CCIPCrossChainDEX;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let mockRouter: MockRouter;
  let mockToken: MockToken;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock router
    const MockRouter = await ethers.getContractFactory("MockRouter");
    mockRouter = await MockRouter.deploy();

    // Deploy mock token
    const MockToken = await ethers.getContractFactory("MockToken");
    mockToken = await MockToken.deploy("MockToken", "MTK");

    // Deploy CCIPCrossChainDEX
    const CCIPCrossChainDEX = await ethers.getContractFactory("CCIPCrossChainDEX");
    ccipDex = await CCIPCrossChainDEX.deploy(mockRouter.address);

    // Whitelist a chain
    await ccipDex.whitelistChain(1);

    // Set DEX address for the whitelisted chain
    await ccipDex.setDEXAddress(1, addr2.address);

    // Mint some tokens to addr1
    await mockToken.mint(addr1.address, ethers.utils.parseEther("1000"));

    // Approve DEX to spend tokens
    await mockToken.connect(addr1).approve(ccipDex.address, ethers.utils.parseEther("1000"));
  });

  it("Should whitelist a chain", async function () {
    expect(await ccipDex.whitelistedChains(1)).to.equal(true);
  });

  it("Should set DEX address for a chain", async function () {
    expect(await ccipDex.dexAddresses(1)).to.equal(addr2.address);
  });

  it("Should transfer tokens cross-chain", async function () {
    const amount = ethers.utils.parseEther("100");
    
    await expect(ccipDex.connect(addr1).transferTokens(1, addr2.address, mockToken.address, amount, { value: ethers.utils.parseEther("1") }))
      .to.not.be.reverted;

    // Check if tokens were transferred to the contract
    expect(await mockToken.balanceOf(ccipDex.address)).to.equal(amount);
  });

  it("Should allow owner to withdraw ETH", async function () {
    await owner.sendTransaction({ to: ccipDex.address, value: ethers.utils.parseEther("1") });
    
    const initialBalance = await ethers.provider.getBalance(owner.address);
    await ccipDex.withdraw(owner.address);
    const finalBalance = await ethers.provider.getBalance(owner.address);

    expect(finalBalance.sub(initialBalance)).to.be.closeTo(
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("0.01") // Account for gas costs
    );
  });

  it("Should allow owner to withdraw tokens", async function () {
    const amount = ethers.utils.parseEther("100");
    await mockToken.mint(ccipDex.address, amount);

    const initialBalance = await mockToken.balanceOf(owner.address);
    await ccipDex.withdrawToken(owner.address, mockToken.address);
    const finalBalance = await mockToken.balanceOf(owner.address);

    expect(finalBalance.sub(initialBalance)).to.equal(amount);
  });

  it("Should not allow non-owner to withdraw ETH", async function () {
    await owner.sendTransaction({ to: ccipDex.address, value: ethers.utils.parseEther("1") });
    
    await expect(ccipDex.connect(addr1).withdraw(addr1.address))
      .to.be.revertedWith("Only callable by owner");
  });

  it("Should not allow non-owner to withdraw tokens", async function () {
    const amount = ethers.utils.parseEther("100");
    await mockToken.mint(ccipDex.address, amount);

    await expect(ccipDex.connect(addr1).withdrawToken(addr1.address, mockToken.address))
      .to.be.revertedWith("Only callable by owner");
  });
  it("Should revert when transferring to non-whitelisted chain", async function () {
    const amount = ethers.utils.parseEther("100");
    
    await expect(ccipDex.connect(addr1).transferTokens(2, addr2.address, mockToken.address, amount, { value: ethers.utils.parseEther("1") }))
      .to.be.reverted;
  });

  it("Should revert when trying to withdraw 0 ETH", async function () {
    await expect(ccipDex.withdraw(owner.address))
      .to.be.reverted;
  });

  it("Should revert when trying to withdraw 0 tokens", async function () {
    await expect(ccipDex.withdrawToken(owner.address, mockToken.address))
      .to.be.reverted;
  });
});