import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { EthPool, EthPool__factory } from "../typechain";
import { parseBN, calculateAccountReward } from "./utils";

describe("EthPool", () => {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;
  let zoe: Signer;

  let ethPool: EthPool;

  beforeEach(async () => {
    [admin, alice, bob, zoe] = await ethers.getSigners();

    // Deploy EthPool contract
    ethPool = await new EthPool__factory(admin).deploy();
  });

  const depositEth = async (signer: Signer, amount: string) => {
    const amountBN = parseBN(amount);
    await ethPool.connect(signer).depositEth({ value: amountBN });
  };

  const depositReward = async (amount: string, signer = admin) => {
    const amountBN = parseBN(amount);
    await ethPool.connect(signer).depositReward({ value: amountBN });
  };

  describe("depositEth", () => {
    it("should deposit Eth when zero ETH deposited", async () => {
      const signer = alice;
      const signerAddress = await signer.getAddress();
      const amount = "0.8";
      const amountBN = parseBN(amount);

      await expect(ethPool.connect(signer).depositEth({ value: amountBN }))
        .to.emit(ethPool, "DepositETH")
        .withArgs(signerAddress, amountBN);

      const account = await ethPool.getAccount(signerAddress);
      expect(account.deposits).to.equal(amountBN);
      expect(account.rewards).to.equal(0);
      expect(await ethPool.totalAccounts()).to.equal(1);
      expect(await ethPool.s_totalEthDeposited()).to.equal(amountBN);
    });

    it("should deposit multiple times", async () => {
      let signer = alice;
      let signerAddress = await signer.getAddress();
      let amount = "0.6";
      let firstAmountBN = parseBN(amount);

      // First deposit
      await depositEth(signer, amount);

      let account = await ethPool.getAccount(signerAddress);

      expect(account.deposits).to.equal(firstAmountBN);
      expect(account.rewards).to.equal(0);
      expect(await ethPool.totalAccounts()).to.equal(1);

      // Second deposit
      amount = "0.2";
      let secondAmountBN = parseBN(amount);
      await depositEth(signer, amount);

      account = await ethPool.getAccount(signerAddress);

      expect(account.deposits).to.equal(firstAmountBN.add(secondAmountBN));
      expect(account.rewards).to.equal(0);
      expect(await ethPool.totalAccounts()).to.equal(1);
    });

    it("should deposit Eth when ETH already deposited", async () => {
      // First account deposits
      let signer = alice;
      let signerAddress = await signer.getAddress();
      let amount = "0.8";
      let aliceAmountBN = parseBN(amount);

      await depositEth(signer, amount);

      let account = await ethPool.getAccount(signerAddress);

      expect(account.deposits).to.equal(aliceAmountBN);
      expect(account.rewards).to.equal(0);
      expect(await ethPool.accountExists(signerAddress)).to.equal(true);
      expect(await ethPool.totalAccounts()).to.equal(1);
      expect(await ethPool.s_totalEthDeposited()).to.equal(aliceAmountBN);

      // Second account deposits
      signer = bob;
      signerAddress = await signer.getAddress();
      amount = "0.1";
      const bobAmountBN = parseBN(amount);

      await depositEth(signer, amount);

      account = await ethPool.getAccount(signerAddress);

      expect(account.deposits).to.equal(bobAmountBN);
      expect(account.rewards).to.equal(0);
      expect(await ethPool.accountExists(signerAddress)).to.equal(true);
      expect(await ethPool.totalAccounts()).to.equal(2);
      expect(await ethPool.s_totalEthDeposited()).to.equal(
        aliceAmountBN.add(bobAmountBN)
      );

      // Third account deposits
      signer = zoe;
      signerAddress = await signer.getAddress();
      amount = "2";
      const zoeAmountBN = parseBN(amount);

      await depositEth(signer, amount);

      account = await ethPool.getAccount(signerAddress);

      expect(account.deposits).to.equal(zoeAmountBN);
      expect(account.rewards).to.equal(0);
      expect(await ethPool.accountExists(signerAddress)).to.equal(true);
      expect(await ethPool.totalAccounts()).to.equal(3);
      expect(await ethPool.s_totalEthDeposited()).to.equal(
        aliceAmountBN.add(bobAmountBN).add(zoeAmountBN)
      );
    });

    it("should fail to deposit ETH if no value sent", async () => {
      let signer = alice;
      let amount = "0";

      await expect(depositEth(signer, amount)).to.be.revertedWith(
        "EthPool: no value sent"
      );
    });
  });

  describe("depositReward", () => {
    it("admin should deposit reward", async () => {
      const reward = "2";
      const rewardBN = parseBN(reward);

      await expect(ethPool.depositReward({ value: rewardBN }))
        .to.emit(ethPool, "DepositReward")
        .withArgs(rewardBN, 0);

      expect(await ethPool.s_totalRewards()).to.equal(rewardBN);
    });

    it("should fail if invalid admin deposits rewards", async () => {
      await expect(depositReward("0.2", alice)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should distribute rewards to only current stakers when admin deposits rewards", async () => {
      // First account deposits before admin deposits rewards
      let signer = alice;
      let aliceAddress = await signer.getAddress();
      let amount = "0.6";
      let aliceAmountBN = parseBN(amount);

      await depositEth(signer, amount);

      // Second account deposits before admin deposits rewards
      signer = bob;
      let bobAddress = await signer.getAddress();
      amount = "0.1";
      const bobAmountBN = parseBN(amount);

      await depositEth(signer, amount);

      // Admin deposits rewards
      let reward = "25";
      let firstRewardBN = parseBN(reward);

      await expect(ethPool.depositReward({ value: firstRewardBN }))
        .to.emit(ethPool, "DepositReward")
        .withArgs(firstRewardBN, 2);
      expect(await ethPool.s_totalRewards()).to.equal(firstRewardBN);

      let totalDeposits = await ethPool.s_totalEthDeposited();

      let aliceAccount = await ethPool.getAccount(aliceAddress);
      const aliceReward = calculateAccountReward(
        firstRewardBN,
        aliceAccount.deposits,
        totalDeposits
      );

      let bobAccount = await ethPool.getAccount(bobAddress);
      const bobReward = calculateAccountReward(
        firstRewardBN,
        bobAccount.deposits,
        totalDeposits
      );

      expect(aliceAccount.rewards).to.equal(aliceReward);
      expect(aliceAccount.deposits).to.equal(aliceAmountBN);
      expect(bobAccount.rewards).to.equal(bobReward);
      expect(bobAccount.deposits).to.equal(bobAmountBN);

      // Third account deposits after admin deposits rewards
      signer = zoe;
      let zoeAddress = await signer.getAddress();
      amount = "9";
      const zoeAmountBN = parseBN(amount);

      await depositEth(signer, amount);
      let zoeAccount = await ethPool.getAccount(zoeAddress);

      // Zoe deposits ETH after admin deposits/distributes rewards according to depositors pool share
      // hence they don't receive any rewards from the last reward distribution
      expect(zoeAccount.rewards).to.equal(0);
      expect(zoeAccount.deposits).to.equal(zoeAmountBN);

      // Admin deposits new rewards, and reward is distributed to all stakers including Zoe
      // since she deposited before the latest reward distribution
      reward = "50";
      const secondRewardBN = parseBN(reward);

      await expect(ethPool.depositReward({ value: secondRewardBN }))
        .to.emit(ethPool, "DepositReward")
        .withArgs(secondRewardBN, 3);
      expect(await ethPool.s_totalRewards()).to.equal(
        firstRewardBN.add(secondRewardBN)
      );

      totalDeposits = await ethPool.s_totalEthDeposited();

      aliceAccount = await ethPool.getAccount(aliceAddress);
      const newAliceReward = calculateAccountReward(
        secondRewardBN,
        aliceAccount.deposits,
        totalDeposits
      );

      bobAccount = await ethPool.getAccount(bobAddress);
      const newBobReward = calculateAccountReward(
        secondRewardBN,
        bobAccount.deposits,
        totalDeposits
      );

      zoeAccount = await ethPool.getAccount(zoeAddress);
      const newZoeReward = calculateAccountReward(
        secondRewardBN,
        zoeAccount.deposits,
        totalDeposits
      );

      expect(aliceAccount.rewards).to.equal(aliceReward.add(newAliceReward));
      expect(bobAccount.rewards).to.equal(bobReward.add(newBobReward));
      expect(zoeAccount.rewards).to.equal(newZoeReward);
    });

    describe("withdraw", () => {
      it("should withdraw deposit + rewards", async () => {
        let aliceSigner = alice;
        let amount = "15";
        const aliceAmountBN = parseBN(amount);
        const aliceAddress = await aliceSigner.getAddress();

        await depositEth(aliceSigner, amount);

        const bobSigner = bob;
        const bobAddress = await bobSigner.getAddress();
        amount = "7";
        const bobAmountBN = parseBN(amount);

        await depositEth(bobSigner, amount);

        const rewardBN = parseBN("60");
        await ethPool.depositReward({ value: rewardBN });

        let totalRewards = await ethPool.s_totalRewards();

        const aliceAccount = await ethPool.getAccount(aliceAddress);
        const bobAccount = await ethPool.getAccount(bobAddress);

        const totalDeposits = await ethPool.s_totalEthDeposited();

        const aliceReward = calculateAccountReward(
          rewardBN,
          aliceAccount.deposits,
          totalDeposits
        );

        const bobReward = calculateAccountReward(
          rewardBN,
          bobAccount.deposits,
          totalDeposits
        );

        const provider = admin.provider;

        const aliceETHBalanceBeforeWithdrawal = await provider?.getBalance(
          aliceAddress
        );
        const bobETHBalanceBeforeWithdrawal = await provider?.getBalance(
          bobAddress
        );

        await expect(ethPool.connect(aliceSigner).withdraw())
          .to.emit(ethPool, "Withdraw")
          .withArgs(aliceAddress, aliceAccount.deposits, aliceReward);

        let totalRewardsAfterAliceWithdrawal = await ethPool.s_totalRewards();
        expect(totalRewardsAfterAliceWithdrawal).to.equal(
          totalRewards.sub(aliceReward)
        );

        await expect(ethPool.connect(bobSigner).withdraw())
          .to.emit(ethPool, "Withdraw")
          .withArgs(bobAddress, bobAccount.deposits, bobReward);

        let totalRewardsAfterBobWithdrawal = await ethPool.s_totalRewards();

        const aliceETHBalanceAfterWithdrawal = await provider?.getBalance(
          aliceAddress
        );
        const bobETHBalanceAfterWithdrawal = await provider?.getBalance(
          bobAddress
        );

        // assert that the account balance after withdrawing is at least equal to `reward + ETHBalanceBeforeWithdrawal + deposit`.
        // This takes into account the transaction fee
        expect(
          aliceETHBalanceBeforeWithdrawal?.add(aliceAmountBN).add(aliceReward)
        ).to.be.gte(aliceETHBalanceAfterWithdrawal);

        expect(
          bobETHBalanceBeforeWithdrawal?.add(bobAmountBN).add(bobReward)
        ).to.be.gte(bobETHBalanceAfterWithdrawal);
      });

      it("should fail if account has no deposits", async () => {
        await expect(ethPool.connect(alice).withdraw()).to.be.revertedWith(
          "EthPool: ZERO deposits"
        );
      });
    });

    describe("accountExists", () => {
      it("should return false if account does not exists", async () => {
        expect(await ethPool.accountExists(await alice.getAddress())).to.equal(
          false
        );
      });

      it("should return true if account exists", async () => {
        const signer = zoe;
        await ethPool.connect(signer).depositEth({ value: parseBN("5") });

        expect(await ethPool.accountExists(await signer.getAddress())).to.equal(
          true
        );
      });
    });

    describe("_hasDeposits", () => {
      it("should return false if account exists but has zero deposit", async () => {
        const signer = bob;
        const signerAddress = await signer.getAddress();
        const amountBN = parseBN("1");

        // DepositETH
        await expect(ethPool.connect(signer).depositEth({ value: amountBN }))
          .to.emit(ethPool, "DepositETH")
          .withArgs(signerAddress, amountBN);

        const rewardBN = parseBN("4");
        // DepositReward
        await expect(ethPool.depositReward({ value: rewardBN }))
          .to.emit(ethPool, "DepositReward")
          .withArgs(rewardBN, 1);

        // withdraw all rewards
        await expect(ethPool.connect(signer).withdraw())
          .to.emit(ethPool, "Withdraw")
          .withArgs(signerAddress, amountBN, rewardBN);

        expect(await ethPool._hasDeposits(signerAddress)).to.equal(false);
      });
    });

    describe("_hasRewards", () => {
      it("should return false if account exists but has zero rewards", async () => {
        const signer = zoe;
        const signerAddress = await signer.getAddress();
        const amountBN = parseBN("2");

        // DepositETH
        await expect(ethPool.connect(signer).depositEth({ value: amountBN }))
          .to.emit(ethPool, "DepositETH")
          .withArgs(signerAddress, amountBN);

        const rewardBN = parseBN("5");
        // DepositReward
        await expect(ethPool.depositReward({ value: rewardBN }))
          .to.emit(ethPool, "DepositReward")
          .withArgs(rewardBN, 1);

        // withdraw all rewards
        await expect(ethPool.connect(signer).withdraw())
          .to.emit(ethPool, "Withdraw")
          .withArgs(signerAddress, amountBN, rewardBN);

        expect(await ethPool._hasRewards(signerAddress)).to.equal(false);
      });
    });
  });
});
