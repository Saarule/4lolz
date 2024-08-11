// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MemeVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MemeVaultFactory is Ownable {
    mapping(address => address) public vaults;
    address[] public allVaults;
    uint256 public defaultYieldRate = 100; // 1% daily yield as default

    event VaultCreated(address indexed asset, address vault);
    event DefaultYieldRateUpdated(uint256 newRate);

    constructor() Ownable(msg.sender) {}

    function createMemeVault(
        address asset,
        address lolTokenAddress, 
        uint256 maxDepositLimit, 
        uint256 maxWithdrawLimit
    ) external onlyOwner {
        require(vaults[asset] == address(0), "Vault already exists for this asset");
        MemeVault newVault = new MemeVault(
            IERC20(asset), 
            defaultYieldRate, 
            lolTokenAddress, 
            maxDepositLimit, 
            maxWithdrawLimit
        );
        vaults[asset] = address(newVault);
        allVaults.push(address(newVault));
        emit VaultCreated(asset, address(newVault));
    }


    function setDefaultYieldRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= MemeVault(address(0)).MAX_YIELD_RATE(), "Yield rate too high");
        defaultYieldRate = _newRate;
        emit DefaultYieldRateUpdated(_newRate);
    }

    function getVault(address asset) external view returns (address) {
        return vaults[asset];
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function setVaultYieldRate(address vault, uint256 newRate) external onlyOwner {
        require(vaults[MemeVault(vault).asset()] == vault, "Invalid vault");
        MemeVault(vault).setYieldRate(newRate);
    }

    function emergencyWithdraw(address vault, address token, uint256 amount) external onlyOwner {
        require(vaults[MemeVault(vault).asset()] == vault, "Invalid vault");
        IERC20(token).transfer(owner(), amount);
    }
}