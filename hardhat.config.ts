import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    mainnet: {
      chainId: 137,
      url: "https://polygon-mainnet.g.alchemy.com/v2/vol5bfsRi2PiqtbpJc_m9GMOFHNrbSBy",
      accounts: [
        "b1c0948bdf6d64522401622fb159f90f6431adfa8c75c1b16aa7d456d54a3fd8",
      ],
      gas: "auto",
      gasPrice: "auto",
    },
    polygonAmoy: {
      chainId: 80002,
      url: "https://polygon-amoy-bor-rpc.publicnode.com",
      accounts: [
        "bf593679f8b0f5f416906c15efe318f4948ed1fd54d61ccde3ecf24f3d2e1f30",
      ],
      gas: "auto",
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: "CASCHAC8CG63GI93XQK53SZ3SVX8X6JK44",
      polygon: "CASCHAC8CG63GI93XQK53SZ3SVX8X6JK44",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
};

export default config;
