//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract EthPool is Ownable {
    // struct of deposit with corresponding reward.
    struct Account {
        uint256 deposits;
        uint256 rewards;
        bool active;
    }

    uint256 public accounstCount = 0;
    uint256 public poolValue;

    //  mapping of address to `Account`
    //mapping(address => Account) private s_accounts;
    mapping(address => uint256) private s_indexOf;

    // array of all accounts
    Account[] private s_accounts;

    event DepositETH(address account, uint256 amount);
    event DepositReward(uint256 amount, uint256 accounts);
    event Withdraw(address account, uint256 deposits, uint256 rewards);

    /**
     * @notice caller depsosits Eth to earn rewards. Requires `msg.sender` to be  greater than 0
     */
    function depositEth() external payable {
        require(msg.value > 0, "EthPool: no value sent");

        uint256 accountIndex = s_indexOf[msg.sender];
        Account memory account = s_accounts[accountIndex];

        if (_isNewAccount(accountIndex, account.active)) {
            account = Account(msg.value, 0, true);
            s_accounts.push(account);
            s_indexOf[msg.sender] = accounstCount;
            accounstCount++;
        } else {
            uint256 totalDeposits = account.deposits + msg.value;
            account.deposits = totalDeposits;
            s_accounts[accountIndex] = account;
        }

        poolValue += msg.value;

        emit DepositETH(msg.sender, msg.value);
    }

    function depositReward(uint256 _rewards) external onlyOwner {
        Account[] memory accounts = s_accounts;

        Account memory account;
        uint256 numberAccounts;
        for (uint256 i = 0; i < accounts.length; i++) {
            account = accounts[i];
            uint256 accountReward = _getAccountReward(
                _rewards,
                account.deposits
            );

            account.rewards = account.rewards + accountReward;
            s_accounts[i] = account;
            numberAccounts += 1;
        }

        emit DepositReward(_rewards, numberAccounts);
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

        uint256 accountIndex = s_indexOf[msg.sender];
        Account memory account = s_accounts[accountIndex];

        account.deposits = account.deposits - totalDeposits;
        account.deposits = account.rewards - totalRewards;
        s_accounts[accountIndex] = account;

        poolValue -= totalDeposits;

        uint256 withdrawAmount = totalDeposits + totalRewards;
        (bool sent, ) = payable(msg.sender).call{value: withdrawAmount}("");

        require(sent, "EthPool: Failed to send Ether");
        emit Withdraw(msg.sender, totalDeposits, totalRewards);
    }

    /**
     * @notice check if an account has deposits
     */
    function _hasDeposits(address _account) public view returns (bool) {
        uint256 accountIndex = s_indexOf[_account];

        if (s_accounts[accountIndex].deposits > 0) return true;
        return false;
    }

    /**
     * @notice check if an account has rewards
     */
    function _hasRewards(address _account) public view returns (bool) {
        uint256 accountIndex = s_indexOf[_account];

        if (s_accounts[accountIndex].rewards > 0) return true;
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
        uint256 accountIndex = s_indexOf[_account];
        Account memory account = s_accounts[accountIndex];
        totalDeposits = account.deposits;
        totalRewards = account.rewards;
    }

    function _getAccountReward(uint256 _reward, uint256 _totalDeposits)
        internal
        returns (uint256)
    {
        uint256 rewardPercentage = (_totalDeposits * 100) / poolValue;

        return (rewardPercentage * _reward) / 100;
    }

    function _isNewAccount(uint256 _accountIndex, bool _active)
        internal
        returns (bool)
    {
        if (_accountIndex == 0 && s_accounts.length == 0) return true;
        else if (_accountIndex == 0 && !_active) return true;

        return false;
    }
}
