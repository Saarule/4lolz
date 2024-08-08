// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "@chainlink/contracts-ccip/src/v0.8/shared/access/OwnerIsCreator.sol";
import "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CCIPCrossChainDEX is CCIPReceiver, OwnerIsCreator {
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error DestinationChainNotWhitelisted(uint64 destinationChainSelector);
    error InvalidReceiverAddress();

    mapping(uint64 => bool) public whitelistedChains;
    mapping(uint64 => address) public dexAddresses;

    event TokensTransferred(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address receiver,
        address token,
        uint256 tokenAmount,
        address feeToken,
        uint256 fees
    );

    constructor(address _router) CCIPReceiver(_router) {}

    function whitelistChain(uint64 _destinationChainSelector) external onlyOwner {
        whitelistedChains[_destinationChainSelector] = true;
    }

    function setDEXAddress(uint64 _chainSelector, address _dexAddress) external onlyOwner {
        dexAddresses[_chainSelector] = _dexAddress;
    }

    function transferTokens(
        uint64 _destinationChainSelector,
        address _receiver,
        address _token,
        uint256 _amount
    ) external payable {
        if (!whitelistedChains[_destinationChainSelector])
            revert DestinationChainNotWhitelisted(_destinationChainSelector);

        if (_receiver == address(0)) revert InvalidReceiverAddress();

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: abi.encode(_token, _amount),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: 200_000})
            ),
            feeToken: address(0)
        });

        uint256 fees = IRouterClient(getRouter()).getFee(
            _destinationChainSelector,
            message
        );

        if (fees > address(this).balance)
            revert NotEnoughBalance(address(this).balance, fees);

        bytes32 messageId = IRouterClient(getRouter()).ccipSend{value: fees}(
            _destinationChainSelector,
            message
        );

        emit TokensTransferred(
            messageId,
            _destinationChainSelector,
            _receiver,
            _token,
            _amount,
            address(0),
            fees
        );
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (address token, uint256 amount) = abi.decode(message.data, (address, uint256));
        address receiver = abi.decode(message.sender, (address));

        IERC20(token).transfer(receiver, amount);
    }

    receive() external payable {}

    function withdraw(address _beneficiary) public onlyOwner {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();
        (bool sent, ) = _beneficiary.call{value: amount}("");
        if (!sent) revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
    }

    function withdrawToken(
        address _beneficiary,
        address _token
    ) public onlyOwner {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        if (amount == 0) revert NothingToWithdraw();
        IERC20(_token).transfer(_beneficiary, amount);
    }
}