// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error FundMe__NotOwner();

/// @title Funding Contract
/// @author mektigboy
/// @notice Create a sample funding contract.
/// @dev Implements price feeds as our library.
contract FundMe {
    using PriceConverter for uint256;

    uint256 public constant MINIMUM_USD = 50 * 1e18;
    address public immutable i_owner;
    address[] private s_funders; // Should be <private>, changed it to <public> for testing puroposes.
    mapping(address => uint256) private s_addressToAmountFounded; // Should be <private>, changed it to <public> for testing puroposes.
    AggregatorV3Interface private s_priceFeed; // Should be <private>, changed it to <public> for testing puroposes.

    modifier onlyOwner() {
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        _;
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    constructor(address priceFeed) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeed);
    }

    /// @notice Funds our contract based on ETH/USD.
    function fund() public payable {
        require(msg.value.getConvertionRate(s_priceFeed) >= MINIMUM_USD, "Did not send enough ETH!");
        s_addressToAmountFounded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    function withdraw() public onlyOwner {
        for (uint256 funderIndex = 0; funderIndex < s_funders.length; funderIndex++) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFounded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool success,) = i_owner.call{value: address(this).balance}("");
        require(success);
    }
}
