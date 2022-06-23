// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./PriceConverter.sol";

error NotOwner();

contract FundMe {
    using PriceConverter for uint256;

    // Keyword constant saves more gas.
    uint256 public constant MINIMUM_USD = 50 * 1e18; // 1 * 10 ** 18

    address[] public funders;
    mapping(address => uint256) public addressToAmountFounded;

    // Keyword immutable means you are not going to change the variable.
    address public immutable i_owner;

    constructor() {
        i_owner = msg.sender;
    }

    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Sender is not i_owner.");
        if (msg.sender != i_owner) {
            revert NotOwner();
        }
        _;
    }

    function fund() public payable {
        require(
            msg.value.getConvertionRate() >= MINIMUM_USD,
            "Did not send enough!"
        );
        funders.push(msg.sender);
        addressToAmountFounded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFounded[funder] = 0;
        }

        // Reset "funders" array.
        funders = new address[](0); // New array of addresses with 0 elements.

        // Transfer
        // Where msg.sender = address.
        // And payable(msg.sender) = payable address.
        // payable(msg.sender).transfer(address(this).balance);

        // Send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed.");

        // Call
        // Returns 2 variables.
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed.");
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }
}
