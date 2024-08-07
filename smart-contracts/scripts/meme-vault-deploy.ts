import { ethers } from "hardhat";

async function main() {
  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const assetAddress = "0x47EE28775fDF5b766Fa6cb46e1aA7ab2b88c9373"; // Replace with the actual ERC20 token address
  const initialYieldRate = 500; // Set the initial yield rate (for example, 5% daily)

  // Deploy MemeTokenFactory
  const MemeVault = await ethers.getContractFactory("MemeVault");

  // Deploy the contract with the specified parameters
  const memeVault = await MemeVault.deploy(assetAddress, initialYieldRate);

  // Wait for the deployment to complete
  await memeVault.deployed();

  // Log the address of the deployed contract
  console.log("MemeVault deployed to:", memeVault.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
