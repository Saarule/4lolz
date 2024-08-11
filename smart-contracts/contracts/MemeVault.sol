// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LOLToken.sol";

contract MemeVault is ERC4626, Ownable, ReentrancyGuard, Pausable {
    LOLToken public lolToken;
    
    uint256 public yieldRate;
    uint256 public constant MAX_YIELD_RATE = 1000; // 10% daily yield as maximum
    uint256 public constant YIELD_RATE_DENOMINATOR = 10000;
    
    uint256 public maxDepositLimit;
    uint256 public maxWithdrawLimit;
    
    mapping(address => uint256) public lastClaimTime;
    mapping(address => uint256) public yieldBooster;
    
    struct Checkpoint {
        uint256 timestamp;
        uint256 balance;
    }
    
    mapping(address => Checkpoint[]) private userCheckpoints;

    event YieldRateUpdated(uint256 newRate);
    event YieldClaimed(address indexed user, uint256 amount);
    event YieldBoosterUpdated(address indexed user, uint256 newBooster);
    event DepositLimitUpdated(uint256 newLimit);
    event WithdrawLimitUpdated(uint256 newLimit);

    error InsufficientBalance(uint256 requested, uint256 available);
    error ExceedsWithdrawLimit(uint256 requested, uint256 limit);
    error ExceedsDepositLimit(uint256 requested, uint256 limit);
    error ContractPaused();

    constructor(
        IERC20 _asset,
        uint256 _initialYieldRate,
        address _lolTokenAddress,
        uint256 _maxDepositLimit,
        uint256 _maxWithdrawLimit
    ) 
        ERC4626(_asset) 
        ERC20("Meme Vault", "mVAULT") 
        Ownable(msg.sender) 
    {
        require(_initialYieldRate <= MAX_YIELD_RATE, "Yield rate too high");
        yieldRate = _initialYieldRate;
        lolToken = LOLToken(_lolTokenAddress);
        maxDepositLimit = _maxDepositLimit;
        maxWithdrawLimit = _maxWithdrawLimit;
    }

    function setYieldRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= MAX_YIELD_RATE, "Yield rate too high");
        yieldRate = _newRate;
        emit YieldRateUpdated(_newRate);
    }

    function setYieldBooster(address user, uint256 booster) external onlyOwner {
        yieldBooster[user] = booster;
        emit YieldBoosterUpdated(user, booster);
    }

    function setMaxDepositLimit(uint256 _newLimit) external onlyOwner {
        maxDepositLimit = _newLimit;
        emit DepositLimitUpdated(_newLimit);
    }

    function setMaxWithdrawLimit(uint256 _newLimit) external onlyOwner {
        maxWithdrawLimit = _newLimit;
        emit WithdrawLimitUpdated(_newLimit);
    }

    function claimYield() external nonReentrant whenNotPaused {
        uint256 yield = calculateYield(msg.sender);
        require(yield > 0, "No yield to claim");
        lastClaimTime[msg.sender] = block.timestamp;
        lolToken.mint(msg.sender, yield);
        emit YieldClaimed(msg.sender, yield);
    }

    function calculateYield(address user) public view returns (uint256) {
        Checkpoint[] storage checkpoints = userCheckpoints[user];
        if (checkpoints.length == 0) return 0;

        uint256 yield = 0;
        for (uint i = 1; i < checkpoints.length; i++) {
            uint256 timeElapsed = checkpoints[i].timestamp - checkpoints[i-1].timestamp;
            yield += _calculateYieldForPeriod(checkpoints[i-1].balance, timeElapsed, user);
        }

        uint256 timeElapsedSinceLastCheckpoint = block.timestamp - checkpoints[checkpoints.length - 1].timestamp;
        yield += _calculateYieldForPeriod(checkpoints[checkpoints.length - 1].balance, timeElapsedSinceLastCheckpoint, user);

        return yield;
    }

    function _calculateYieldForPeriod(uint256 balance, uint256 timeElapsed, address user) internal view returns (uint256) {
        uint256 baseYield = balance * yieldRate * timeElapsed / (YIELD_RATE_DENOMINATOR * 1 days);
        uint256 boostedYield = baseYield * (YIELD_RATE_DENOMINATOR + yieldBooster[user]) / YIELD_RATE_DENOMINATOR;
        return boostedYield;
    }

    function _addCheckpoint(address user, uint256 balance) internal {
        userCheckpoints[user].push(Checkpoint({
            timestamp: block.timestamp,
            balance: balance
        }));
    }

    function deposit(uint256 assets, address receiver) public virtual override nonReentrant whenNotPaused returns (uint256) {
        if (assets > maxDepositLimit) revert ExceedsDepositLimit(assets, maxDepositLimit);
        uint256 shares = super.deposit(assets, receiver);
        _addCheckpoint(receiver, balanceOf(receiver));
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) public virtual override nonReentrant returns (uint256) {
        if (paused()) revert ContractPaused();
        if (assets > maxWithdrawLimit) revert ExceedsWithdrawLimit(assets, maxWithdrawLimit);
        uint256 maxWithdraw = convertToAssets(balanceOf(owner));
        if (assets > maxWithdraw) revert InsufficientBalance(assets, maxWithdraw);
        
        uint256 shares = super.withdraw(assets, receiver, owner);
        _addCheckpoint(owner, balanceOf(owner));
        return shares;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}