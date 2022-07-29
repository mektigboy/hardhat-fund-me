const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");

describe("FundMe", async function () {
    let fundMe;
    let deployer;
    let mockV3Aggregator;

    const sendValue = ethers.utils.parseEther("1");

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        );
    });

    describe("constructor", async function () {
        it("Sets the agregator addresses correctly", async function () {
            const response = await fundMe.getPriceFeed();
            assert.equal(response, mockV3Aggregator.address);
        });
    });

    describe("fund", async function () {
        it("Fails if you do not send enough ETH", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "Did not send enough ETH!"
            );
        });

        it("Updated the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue });
            const response = await fundMe.getAddressToAmountFunded(deployer);
            assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array to funders", async function () {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.getFunder(0);
            assert.equal(funder, deployer);
        });
    });

    describe("withdraw", async function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue });
        });

        it("Withdraw WTH from a single founder", async function () {
            // Arrange:
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Act:
            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Assert:
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            );
        });

        it("Cheaper withdraw WTH from a single founder", async function () {
            // Arrange:
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Act:
            const transactionResponse = await fundMe.cheaperWithdraw();
            const transactionReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Assert:
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            );
        });

        it("Allows us to withdraw with multiple funders", async function () {
            // Arrange:
            const accounts = await ethers.getSigners();
            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[1]
                );
                await fundMeConnectedContract.fund({ value: sendValue });
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Act:
            const transactionResponse = await fundMe.withdraw();
            const transactionReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Assert:
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            );
            // Make sure that the funders are reset properly.
            await expect(fundMe.getFunder(0)).to.be.reverted;
            for (let i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.getAddressToAmountFunded(accounts[i].address),
                    0
                );
            }
        });

        it("Only allows the owner to withdraw", async function () {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(
                attackerConnectedContract.withdraw()
            ).to.be.revertedWith("FundMe__NotOwner");
        });

        it("Cheaper withdraw", async function () {
            // Arrange:
            const accounts = await ethers.getSigners();
            for (let i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[1]
                );
                await fundMeConnectedContract.fund({ value: sendValue });
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Act:
            const transactionResponse = await fundMe.cheaperWithdraw();
            const transactionReceipt = await transactionResponse.wait(1);
            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );
            // Assert:
            assert.equal(endingFundMeBalance, 0);
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            );
            // Make sure that the funders are reset properly.
            await expect(fundMe.getFunder(0)).to.be.reverted;
            for (let i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.getAddressToAmountFunded(accounts[i].address),
                    0
                );
            }
        });
    });
});
