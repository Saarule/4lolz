// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MemeToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    string public memeUri;
    uint256 public memeScore;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name, 
        string memory _symbol, 
        uint256 _initialSupply, 
        string memory _memeUri, 
        uint256 _memeScore,
        address _creator
    ) {
        require(_initialSupply > 0, "Initial supply must be greater than zero");
        require(_memeScore <= 100, "Meme score must be between 0 and 100");
        name = _name;
        symbol = _symbol;
        memeUri = _memeUri;
        memeScore = _memeScore;
        balanceOf[_creator] = _initialSupply;
        totalSupply = _initialSupply;
        emit Transfer(address(0), _creator, _initialSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        return _transfer(msg.sender, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(value <= allowance[from][msg.sender], "Insufficient allowance");
        allowance[from][msg.sender] -= value;
        return _transfer(from, to, value);
    }

    function _transfer(address from, address to, uint256 value) internal returns (bool) {
        require(value <= balanceOf[from], "Insufficient balance");
        require(to != address(0), "Transfer to the zero address is not allowed");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}

contract MemeTokenFactory {
    uint256 public tokenCount;
    mapping(uint256 => address) public memeTokens;
    mapping(address => uint256[]) public creatorTokens;

    event MemeTokenCreated(uint256 indexed tokenId, address tokenAddress, string name, string symbol, string memeUri, uint256 memeScore);

    function createMemeToken(
        string memory name, 
        string memory symbol, 
        uint256 initialSupply, 
        string memory memeUri, 
        uint256 memeScore
    ) external returns (uint256) {
        MemeToken newToken = new MemeToken(name, symbol, initialSupply, memeUri, memeScore, msg.sender);
        tokenCount++;
        memeTokens[tokenCount] = address(newToken);
        creatorTokens[msg.sender].push(tokenCount);

        emit MemeTokenCreated(tokenCount, address(newToken), name, symbol, memeUri, memeScore);
        return tokenCount;
    }

    function getCreatorTokens(address creator) external view returns (uint256[] memory) {
        return creatorTokens[creator];
    }
}
