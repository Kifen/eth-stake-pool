import * as dotenv from "dotenv";

import { providers, Wallet } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";

export const provider = (): Provider => {
  return new providers.JsonRpcProvider(process.env.RINKEBY_URL);
};
