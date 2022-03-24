import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { EthPool, EthPool__factory } from "../typechain";
import { parseBN, Account } from "./utils";

describe("EthPool", () => {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;

  let ethPool: EthPool;

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();

    // Deploy EthPool contract
    ethPool = await new EthPool__factory(admin).deploy();
  });

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
      expect(account.deposits).to.equal(amountBN)
      expect(account.rewards).to.equal(0)
    });
  });
});
