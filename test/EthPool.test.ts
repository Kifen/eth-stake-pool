import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { EthPool, EthPool__factory } from "../typechain";
import { parseBN, Account } from "./utils";

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

    it("should deposit Eth when ETH already deposited", async () => {
      // First deposit
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

      // Second deposit
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

      // Third deposit
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
  });
});
