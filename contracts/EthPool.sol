//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract EthPool is Ownable {
    // struct of deposit with corresponding reward.
    struct Deposit {
        uint256 deposit;
        uint256 reward;
    }

    //  mapping of id to `Deposit`
    mapping(uint256 => Deposit) private s_deposits;

    // mapping of account to deposit count
    mapping(address => uint256) private s_depositCount;

    event DepositETH(address account, uint256 amount);
    event DepositReward(address account, uint256 amount);
    event Withdraw(address account, uint256 deposits, uint256 rewards);

    /**
     * @notice caller depsosits Eth to earn rewards. Requires `msg.sender` to be  greater than 0
     */
    function depositEth() external payable {
        require(msg.value > 0, "EthPool: no value sent");

        uint256 depositCount = s_depositCount[msg.sender];
        depositCount += 1;

        Deposit memory newDeposit = Deposit(msg.value, 0);

        s_deposits[depositCount] = newDeposit;

        emit DepositETH(msg.sender, msg.value);
    }

    /**
     * @notice withdraws all deposited ETH and rewards
     */
    function withdraw() external payable {
        require(_hasDeposits(msg.sender), "EthPool: ZERO deposits");
        (
            uint256 totalDeposits,
            uint256 totalRewards
        ) = _getTotalDepositsAndRewards(msg.sender);

        uint256 withdrawAmount = totalDeposits + totalRewards;
        (bool sent, ) = payable(msg.sender).call{value: withdrawAmount}("");

        require(sent, "EthPool: Failed to send Ether");
        emit Withdraw(msg.sender, totalDeposits, totalRewards);
    }

    /**
     * @notice check if an account has deposits
     */
    function _hasDeposits(address _account) public view returns (bool) {
        if (s_depositCount[_account] > 0) return true;
        return false;
    }

    /**
     * @notice checks an account total deposits
     */
    function _getTotalDepositsAndRewards(address _account)
        public
        view
        returns (uint256 totalDeposits, uint256 totalRewards)
    {
        uint256 depositCount = s_depositCount[_account];

        uint256 limit = depositCount + 1;
        uint256 j = 1;

        while (j < limit) {
            Deposit memory deposit = s_deposits[j];
            totalDeposits += deposit.deposit;
            totalRewards += deposit.reward;
            j++;
        }
    }
}
