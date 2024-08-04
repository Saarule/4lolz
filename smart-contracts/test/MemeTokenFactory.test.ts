import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MemeTokenFactory, MemeToken } from "../typechain-types";

describe("MemeTokenFactory", function () {
  let memeTokenFactory: MemeTokenFactory;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MemeTokenFactoryFactory = await ethers.getContractFactory("MemeTokenFactory");
    memeTokenFactory = await MemeTokenFactoryFactory.deploy() as MemeTokenFactory;
    await memeTokenFactory.deployed();
  });

  it("Should create a new meme token", async function () {
    const tokenName = "Doge Coin";
    const tokenSymbol = "DOGE";
    const initialSupply = ethers.utils.parseEther("1000000");
    const memeUri = "https://example.com/doge.jpg";
    const memeScore = 95;

    await memeTokenFactory.createMemeToken(tokenName, tokenSymbol, initialSupply, memeUri, memeScore);

    const creatorTokens = await memeTokenFactory.getCreatorTokens(owner.address);
    expect(creatorTokens.length).to.equal(1);
    expect(creatorTokens[0]).to.equal(1);
  });

  it("Should store correct token addresses", async function () {
    await memeTokenFactory.createMemeToken("Token1", "TK1", ethers.utils.parseEther("1000000"), "uri1", 90);
    const tokenAddress = await memeTokenFactory.memeTokens(1);
    const MemeTokenContractFactory = await ethers.getContractFactory("MemeToken");
    const token = MemeTokenContractFactory.attach(tokenAddress) as MemeToken;

    expect(await token.name()).to.equal("Token1");
    expect(await token.symbol()).to.equal("TK1");
    expect(await token.memeUri()).to.equal("uri1");
    expect(await token.memeScore()).to.equal(90);
  });

  it("Should allow transferring meme tokens", async function () {
    const initialSupply = ethers.utils.parseEther("1000");
    await memeTokenFactory.createMemeToken("Transfer Token", "TRF", initialSupply, "uri", 80);
    const tokenAddress = await memeTokenFactory.memeTokens(1);
    const MemeTokenContractFactory = await ethers.getContractFactory("MemeToken");
    const token = MemeTokenContractFactory.attach(tokenAddress) as MemeToken;

    const ownerBalance = await token.balanceOf(owner.address);
    console.log("Owner balance after creation:", ownerBalance.toString());
    expect(ownerBalance).to.equal(initialSupply);

    const transferAmount = ethers.utils.parseEther("100");
    await token.transfer(addr1.address, transferAmount);

    expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply.sub(transferAmount));
  });

  it("Should correctly increment token count", async function () {
    await memeTokenFactory.createMemeToken("Token1", "TK1", ethers.utils.parseEther("1000000"), "uri1", 90);
    await memeTokenFactory.createMemeToken("Token2", "TK2", ethers.utils.parseEther("500000"), "uri2", 85);
    await memeTokenFactory.createMemeToken("Token3", "TK3", ethers.utils.parseEther("750000"), "uri3", 80);

    expect(await memeTokenFactory.tokenCount()).to.equal(3);
  });

  it("Should not allow creating a token with zero initial supply", async function () {
    await expect(
      memeTokenFactory.createMemeToken("Zero Token", "ZERO", 0, "uri", 50)
    ).to.be.revertedWith("Initial supply must be greater than zero");
  });

  it("Should not allow creating a token with meme score greater than 100", async function () {
    await expect(
      memeTokenFactory.createMemeToken("Invalid Score", "INV", ethers.utils.parseEther("1000"), "uri", 101)
    ).to.be.revertedWith("Meme score must be between 0 and 100");
  });
});
