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
    uint256 public s_totalRewards;

    // array of all accounts
    Account[] private s_accounts;

    //  mapping of address to `s_accounts` storage index
    mapping(address => Index) private s_indexOf;

    event DepositETH(address account, uint256 amount);
    event DepositReward(uint256 amount, uint256 accounts);
    event Withdraw(address account, uint256 deposit, uint256 reward);
    event Received(address sender, uint256 amount);

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

    function depositReward() external payable ethSent onlyOwner {
        Account[] memory accounts = s_accounts;

        Account memory account;
        for (uint256 i = 0; i < accounts.length; i++) {
            account = accounts[i];
            uint256 accountReward = _getAccountReward(
                msg.value,
                account.deposits
            );

            account.rewards = account.rewards + accountReward;
            s_accounts[i] = account;
        }

        s_totalRewards += msg.value;
        emit DepositReward(msg.value, accounts.length);
    }

    /**
     * @notice withdraws all deposited ETH and rewards
     */
    function withdraw() external payable {
        require(_hasDeposits(msg.sender), "EthPool: ZERO deposits");

        (Account memory account, int256 accountIndex) = _getAccount(msg.sender);

        uint256 totalDeposits = account.deposits;
        uint256 totalRewards = account.rewards;

        account.deposits = 0;
        account.rewards = 0;

        //uint256 accountIndex = s_indexOf[msg.sender].index;
        s_accounts[uint256(accountIndex)] = account;

        s_totalEthDeposited -= totalDeposits;
        s_totalRewards -= totalRewards;

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

    function _getAccountReward(uint256 _reward, uint256 _totalDeposits)
        internal
        view
        returns (uint256)
    {
        uint256 poolShare = (_totalDeposits * 1e18) / s_totalEthDeposited;

        return (poolShare * _reward) / 1e18;
    }

    function getAccount(address _account)
        external
        view
        returns (Account memory account)
    {
        if (!accountExists(_account)) {
            return account;
        }

        (account, ) = _getAccount(_account);
    }

    function _getAccount(address _account)
        internal
        view
        returns (Account memory account, int256 index)
    {
        uint256 accountIndex = s_indexOf[_account].index;
        account = s_accounts[accountIndex];
        index = int256(accountIndex);
    }

    function accountExists(address _account) public view returns (bool) {
        Index memory index = s_indexOf[_account];
        if (!index.exists) {
            return false;
        }

        return true;
    }

    function totalAccounts() external view returns (uint256) {
        return s_accounts.length;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
