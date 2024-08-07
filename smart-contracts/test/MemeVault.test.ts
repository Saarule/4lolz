import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MemeVault, MemeToken, MemeVaultFactory } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MemeVault", function () {
  let memeVault: MemeVault;
  let memeToken: MemeToken;
  let memeVaultFactory: MemeVaultFactory;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const initialSupply = ethers.utils.parseEther("1000000");
  const depositAmount = ethers.utils.parseEther("1000");
  const initialYieldRate = 100; // 1% daily yield

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MemeToken
    const MemeTokenFactory = await ethers.getContractFactory("MemeToken");
    memeToken = await MemeTokenFactory.deploy(
      "Meme Token",
      "MEME",
      initialSupply,
      "uri",
      "This is a test meme token",
      owner.address
    ) as MemeToken;
    await memeToken.deployed();

    // Deploy MemeVaultFactory
    const MemeVaultFactoryFactory = await ethers.getContractFactory("MemeVaultFactory");
    memeVaultFactory = await MemeVaultFactoryFactory.deploy() as MemeVaultFactory;
    await memeVaultFactory.deployed();

    // Create a MemeVault
    await memeVaultFactory.createMemeVault(memeToken.address);
    const memeVaultAddress = await memeVaultFactory.getVault(memeToken.address);
    memeVault = await ethers.getContractAt("MemeVault", memeVaultAddress) as MemeVault;

    // Approve MemeVault to spend tokens
    await memeToken.approve(memeVault.address, ethers.constants.MaxUint256);
    await memeToken.transfer(user1.address, depositAmount.mul(2));
    await memeToken.connect(user1).approve(memeVault.address, ethers.constants.MaxUint256);
  });

  it("Should deploy correctly", async function () {
    expect(await memeVault.asset()).to.equal(memeToken.address);
    expect(await memeVault.name()).to.equal("Meme Vault");
    expect(await memeVault.symbol()).to.equal("mVAULT");
    expect(await memeVault.yieldRate()).to.equal(initialYieldRate);
  });

  it("Should allow deposits", async function () {
    await memeVault.deposit(depositAmount, owner.address);
    expect(await memeVault.balanceOf(owner.address)).to.equal(depositAmount);
    expect(await memeVault.totalAssets()).to.equal(depositAmount);
  });

  it("Should allow withdrawals", async function () {
    await memeVault.deposit(depositAmount, owner.address);
    const sharesBefore = await memeVault.balanceOf(owner.address);
    await memeVault.withdraw(sharesBefore, owner.address, owner.address);
    const sharesAfter = await memeVault.balanceOf(owner.address);
    expect(sharesAfter).to.be.closeTo(ethers.BigNumber.from(0), ethers.utils.parseEther("0.001"));
  });

  it("Should calculate yield correctly", async function () {
    await memeVault.deposit(depositAmount, owner.address);
    
    await time.increase(86400); // Increase time by 1 day

    const expectedYield = depositAmount.mul(initialYieldRate).div(10000); // 1% daily yield
    const totalAssets = await memeVault.totalAssets();
    
    expect(totalAssets).to.be.closeTo(depositAmount.add(expectedYield), ethers.utils.parseEther("0.1"));
  });

  it("Should update lastUpdateTime on deposit", async function () {
    const tx = await memeVault.deposit(depositAmount, owner.address);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    expect(await memeVault.lastUpdateTime()).to.equal(block.timestamp);
  });

  it("Should update lastUpdateTime on withdrawal", async function () {
    await memeVault.deposit(depositAmount, owner.address);
    
    await time.increase(86400);
    
    const tx = await memeVault.withdraw(depositAmount, owner.address, owner.address);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    
    expect(await memeVault.lastUpdateTime()).to.equal(block.timestamp);
  });

  it("Should handle multiple deposits and withdrawals correctly", async function () {
    await memeVault.deposit(depositAmount, owner.address);
    await memeVault.connect(user1).deposit(depositAmount.mul(2), user1.address);
    
    await time.increase(86400);
    
    const totalAssetsBeforeWithdrawal = await memeVault.totalAssets();
    
    const ownerShares = await memeVault.balanceOf(owner.address);
    const user1Shares = await memeVault.balanceOf(user1.address);

    await memeVault.withdraw(ownerShares.div(2), owner.address, owner.address);
    await memeVault.connect(user1).withdraw(user1Shares.div(2), user1.address, user1.address);
    
    const totalAssetsAfterWithdrawals = await memeVault.totalAssets();
    
    expect(totalAssetsAfterWithdrawals).to.be.lt(totalAssetsBeforeWithdrawal);
    expect(totalAssetsAfterWithdrawals).to.be.gt(depositAmount.mul(3).div(2));
  });

  it("Should allow owner to change yield rate", async function () {
    const newYieldRate = 200; // 2% daily yield
    await memeVaultFactory.setVaultYieldRate(memeVault.address, newYieldRate);
    expect(await memeVault.yieldRate()).to.equal(newYieldRate);
  });
  
  it("Should not allow non-owner to change yield rate", async function () {
    const newYieldRate = 200; // 2% daily yield
    const initialYieldRate = await memeVault.yieldRate();
    
    try {
      await memeVaultFactory.connect(user1).setVaultYieldRate(memeVault.address, newYieldRate);
      // If the above doesn't throw, the test should fail
      expect.fail("Transaction did not revert");
    } catch (error: any) {
      // Check if the error is an instance of Error
      expect(error).to.be.an.instanceOf(Error);
      // Check if the error message contains "OwnableUnauthorizedAccount"
      expect(error.message).to.include("OwnableUnauthorizedAccount");
      // You can also log the full error message for debugging
      console.log("Full error message:", error.message);
    }
    
    // Check that the yield rate didn't change
    expect(await memeVault.yieldRate()).to.equal(initialYieldRate);
  });

  it("Should not allow setting yield rate higher than MAX_YIELD_RATE", async function () {
    const tooHighYieldRate = 1001; // 10.01% daily yield
    await expect(memeVaultFactory.setVaultYieldRate(memeVault.address, tooHighYieldRate))
      .to.be.revertedWith("Yield rate too high");
  });

  it("Should correctly calculate yield for multiple users", async function () {
    await memeVault.deposit(depositAmount, owner.address);
    await memeVault.connect(user1).deposit(depositAmount.mul(2), user1.address);

    await time.increase(86400 * 2); // Increase time by 2 days

    const expectedYieldOwner = depositAmount.mul(initialYieldRate).mul(2).div(10000); // 2% yield over 2 days
    const expectedYieldUser1 = depositAmount.mul(2).mul(initialYieldRate).mul(2).div(10000); // 2% yield over 2 days

    const ownerAssets = await memeVault.convertToAssets(await memeVault.balanceOf(owner.address));
    const user1Assets = await memeVault.convertToAssets(await memeVault.balanceOf(user1.address));

    expect(ownerAssets).to.be.closeTo(depositAmount.add(expectedYieldOwner), ethers.utils.parseEther("0.1"));
    expect(user1Assets).to.be.closeTo(depositAmount.mul(2).add(expectedYieldUser1), ethers.utils.parseEther("0.1"));
  });
});