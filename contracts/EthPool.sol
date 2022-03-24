//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract EthPool is Ownable {
    // struct of deposit with corresponding reward.
    struct Account {
        uint256 deposits;
        uint256 rewards;
    }

    struct Index {
        uint256 index;
        bool exists;
    }

    uint256 public s_accounstCount = 0;
    uint256 public s_totalEthDeposited;

    // array of all accounts
    Account[] private s_accounts;

    //  mapping of address to `s_accounts` storage index
    mapping(address => Index) private s_indexOf;

    event DepositETH(address account, uint256 amount);
    event DepositReward(uint256 amount, uint256 accounts);
    event Withdraw(address account, uint256 deposit, uint256 reward);

    modifier ethSent() {
        require(msg.value > 0, "EthPool: no value sent");
        _;
    }

    /**
     * @notice caller depsosits Eth to earn rewards. Requires `msg.sender` to be  greater than 0
     */
    function depositEth() external payable ethSent {
        Index memory accountIndex = s_indexOf[msg.sender];

        Account memory account;
        if (!accountIndex.exists) {
            account = Account(msg.value, 0);
            s_accounts.push(account);
            s_indexOf[msg.sender] = Index(s_accounstCount, true);
            s_accounstCount++;
        } else {
            account = s_accounts[accountIndex.index];
            uint256 totalDeposits = account.deposits + msg.value;
            account.deposits = totalDeposits;
            s_accounts[accountIndex.index] = account;
        }

        s_totalEthDeposited += msg.value;

        emit DepositETH(msg.sender, msg.value);
    }

    function depositReward(uint256 _rewards)
        external
        payable
        ethSent
        onlyOwner
    {
        Account[] memory accounts = s_accounts;

        Account memory account;
        for (uint256 i = 0; i < accounts.length; i++) {
            account = accounts[i];
            uint256 accountReward = _getAccountReward(
                _rewards,
                account.deposits
            );

            account.rewards = account.rewards + accountReward;
            s_accounts[i] = account;
        }

        emit DepositReward(_rewards, accounts.length);
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

        uint256 accountIndex = s_indexOf[msg.sender].index;
        Account memory account = s_accounts[accountIndex];

        account.deposits = 0;
        account.rewards = 0;
        s_accounts[accountIndex] = account;

        s_totalEthDeposited -= totalDeposits;

        uint256 withdrawAmount = totalDeposits + totalRewards;
        (bool sent, ) = payable(msg.sender).call{value: withdrawAmount}("");

        require(sent, "EthPool: Failed to send Ether");
        emit Withdraw(msg.sender, totalDeposits, totalRewards);
    }

    /**
     * @notice check if an account has deposits
     */
    function _hasDeposits(address _account) public view returns (bool) {
        if (!accountExists(_account)) {
            return false;
        }

        uint256 accountIndex = s_indexOf[_account].index;

        if (s_accounts[accountIndex].deposits == 0) return false;
        return true;
    }

    /**
     * @notice check if an account has rewards
     */
    function _hasRewards(address _account) public view returns (bool) {
        if (!accountExists(_account)) {
            return false;
        }

        uint256 accountIndex = s_indexOf[_account].index;

        if (s_accounts[accountIndex].rewards == 0) return false;
        return true;
    }

    /**
     * @notice checks an account total deposits
     */
    function _getTotalDepositsAndRewards(address _account)
        public
        view
        returns (uint256 totalDeposits, uint256 totalRewards)
    {
        if (!accountExists(_account)) {
            return (totalDeposits, totalRewards);
        }

        uint256 accountIndex = s_indexOf[_account].index;
        Account memory account = s_accounts[accountIndex];
        totalDeposits = account.deposits;
        totalRewards = account.rewards;
    }

    function _getAccountReward(uint256 _reward, uint256 _totalDeposits)
        internal
        view
        returns (uint256)
    {
        uint256 rewardPercentage = (_totalDeposits * 100) / s_totalEthDeposited;

        return (rewardPercentage * _reward) / 100;
    }

    function getAccount(address _account)
        external
        view
        returns (Account memory account)
    {
        if (!accountExists(_account)) {
            return account;
        }

        uint256 accountIndex = s_indexOf[_account].index;
        account = s_accounts[accountIndex];
    }

    function accountExists(address _account) public view returns (bool) {
        Index memory index = s_indexOf[_account];
        if (!index.exists) {
            return false;
        }

        return true;
    }
}
