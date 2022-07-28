// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

/// @title Funding Contract
/// @author mektigboy
/// @notice Create a sample funding contract.
/// @dev Implements price feeds as out library.

contract FundMe {
    using PriceConverter for uint256;

    
    address[] public funders;
    mapping(address => uint256) public addressToAmountFounded;
    address public owner;
    uint256 public constant MINIMUM_USD = 50 * 1e18;
    AggregatorV3Interface public priceFeed;

    event Funded();
    error NotOwner();
    constructor(address priceFeedAddress) {
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    function fund() public payable {
        require(msg.value.getConvertionRate(priceFeed) >= MINIMUM_USD, "Did not send enough!");
        addressToAmountFounded[msg.sender] += msg.value;
        funders.push(msg.sender);
        emit Funded(msg.sender, msg.value);
    }

    function withdraw() public onlyOwner {
        for (uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++) {
            address funder = funders[funderIndex];
            addressToAmountFounded[funder] = 0;
        }
        funders = new address[](0);
        (bool callSuccess,) = payable(msg.sender).call{value: address(this).balance}("");
        require(callSuccess, "Call failed.");
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }
}
