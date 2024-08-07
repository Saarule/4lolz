// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MemeVault is ERC4626, Ownable {
    uint256 public yieldRate;
    uint256 public lastUpdateTime;
    uint256 public constant MAX_YIELD_RATE = 1000; // 10% daily yield as maximum

    event YieldRateUpdated(uint256 newRate);

    constructor(IERC20 _asset, uint256 _initialYieldRate) ERC4626(_asset) ERC20("Meme Vault", "mVAULT") Ownable(msg.sender) {
        require(_initialYieldRate <= MAX_YIELD_RATE, "Yield rate too high");
        yieldRate = _initialYieldRate;
        lastUpdateTime = block.timestamp;
    }

    function setYieldRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= MAX_YIELD_RATE, "Yield rate too high");
        yieldRate = _newRate;
        emit YieldRateUpdated(_newRate);
    }

    function totalAssets() public view virtual override returns (uint256) {
        uint256 timePassed = block.timestamp - lastUpdateTime;
        uint256 yield = (super.totalAssets() * yieldRate * timePassed) / (10000 * 1 days);
        return super.totalAssets() + yield;
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal virtual override {
        super._deposit(caller, receiver, assets, shares);
        lastUpdateTime = block.timestamp;
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares) internal virtual override {
        super._withdraw(caller, receiver, owner, assets, shares);
        lastUpdateTime = block.timestamp;
    }
}