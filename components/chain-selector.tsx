import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChainOption {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  network: string;
  currency: string;
  minDeposit?: number;
  walletAddress: string;
}

interface ChainSelectorProps {
  onSelectChain: (chain: ChainOption) => void;
  selectedAmount: number;
  mode?: "deposit" | "withdraw";
}

// Random wallet addresses for BEP20 deposits
const BEP20_WALLET_ADDRESSES = [
  "0xc494bf9b206aac269199e8c604bb9749646e55e6",
  "0x43e00e596e0eb22b4dddba870c859a5d0cd21f6c",
  "0xcf1dbc5d8fec87ea53e07ba4cbf342a17087d307",
  "0x0595fb7c9bebbcd0cc3d0eca1fc77550d97ed277",
  "0x162186316fb27e4d7ca9c318bf3c23b77ee02608",
  "0x91c6dd5faf4073d515a5898607264e9ca829cc68",
  "0xdd83eb10356d237be793221c5623e8241ea0ec5c",
  "0x5ca1b4fe3c6e2b74d0f2399491ba562730088221",
  "0xf8c5465419dc751fe2db9cab4594fcce80d7e05b",
  "0x8658af01239955357dd2c39589330740840a6a73",
];

// Random wallet addresses for TRC20 deposits
const TRC20_WALLET_ADDRESSES = [
  "TRMbdjdtPMohkQStBpaNPgQKPaDJ7tmyXK",
  "TXUJxCkpjaBHQ9Hk8ZhT6pfMGHDbWFK5fH",
  "TGMzRpFiP5TRJ86WGsMM2N6TtGZw9tyfB7",
  "TCAzRnq2ZG4k1BHPTBj4zxs9db6dyDuoKt",
  "TBCGpGnVi5Au25z9arvBeMr9ku7inEcvr9",
];

// Random wallet addresses for Solana deposits
const SOLANA_WALLET_ADDRESSES = [
  "6tdpMa3M4xYb3yJj3Azq9QNkJHcdAYzF7srLjtcvF7cy",
  "5So9UG8zzAvkw1TmsN6ACvreUUugU8MAUuVneXGf5kin",
  "ENv6UsNfF2vkC2v47ViWQvC9vePD42jccvM2Km5ZVEBS",
  "DcDDkGb75S2Q6WstbdT2thesZ4w99Qv5KTt6fV6ur2z8",
  "3iiUNePQArYxirrg6XEgDBHCPtz3aELzQxdzpBjRsfVL",
];

// Random wallet addresses for TON deposits
const TON_WALLET_ADDRESSES = [
  "UQABbmVuec9AxiAk8prM9AdATPzpej9_zhPRqkxsW1dCkACq",
  "UQD2OjpmGMbytHKcwMKdFQbBjzMLnPbRRlL7goBEou3e-Bl8",
  "UQCclgGbT1Ckwq5j2fHuYc82HtaUlVN-xTLRWBtp2KLfEHvO",
  "UQB_C_Hc9Ou7f04Zw53WpqQT60Tq5QAVE0DPocJslPCzpR6U",
  "UQAXbvuoMc6MZUZL3fDwCFOQ7SsGQBiWqv_jV7KoCX07U0TM",
];

// Random wallet addresses for ERC20 (Ethereum) deposits
const ERC20_WALLET_ADDRESSES = [
  "0xc494bf9b206aac269199e8c604bb9749646e55e6",
  "0x43e00e596e0eb22b4dddba870c859a5d0cd21f6c",
  "0xcf1dbc5d8fec87ea53e07ba4cbf342a17087d307",
  "0x0595fb7c9bebbcd0cc3d0eca1fc77550d97ed277",
  "0x162186316fb27e4d7ca9c318bf3c23b77ee02608",
  "0x91c6dd5faf4073d515a5898607264e9ca829cc68",
  "0xdd83eb10356d237be793221c5623e8241ea0ec5c",
  "0x5ca1b4fe3c6e2b74d0f2399491ba562730088221",
  "0xf8c5465419dc751fe2db9cab4594fcce80d7e05b",
  "0x8658af01239955357dd2c39589330740840a6a73",
];

// Random wallet addresses for Polygon deposits
const POLYGON_WALLET_ADDRESSES = [
  "0xc494bf9b206aac269199e8c604bb9749646e55e6",
  "0x43e00e596e0eb22b4dddba870c859a5d0cd21f6c",
  "0xcf1dbc5d8fec87ea53e07ba4cbf342a17087d307",
  "0x0595fb7c9bebbcd0cc3d0eca1fc77550d97ed277",
  "0x162186316fb27e4d7ca9c318bf3c23b77ee02608",
  "0x91c6dd5faf4073d515a5898607264e9ca829cc68",
  "0xdd83eb10356d237be793221c5623e8241ea0ec5c",
  "0x5ca1b4fe3c6e2b74d0f2399491ba562730088221",
  "0xf8c5465419dc751fe2db9cab4594fcce80d7e05b",
  "0x8658af01239955357dd2c39589330740840a6a73",
];

// Function to get random wallet address for BEP20
const getRandomBEP20Address = (): string => {
  const randomIndex = Math.floor(Math.random() * BEP20_WALLET_ADDRESSES.length);
  return BEP20_WALLET_ADDRESSES[randomIndex];
};

// Function to get random wallet address for TRC20
const getRandomTRC20Address = (): string => {
  const randomIndex = Math.floor(Math.random() * TRC20_WALLET_ADDRESSES.length);
  return TRC20_WALLET_ADDRESSES[randomIndex];
};

// Function to get random wallet address for Solana
const getRandomSolanaAddress = (): string => {
  const randomIndex = Math.floor(Math.random() * SOLANA_WALLET_ADDRESSES.length);
  return SOLANA_WALLET_ADDRESSES[randomIndex];
};

// Function to get random wallet address for TON
const getRandomTONAddress = (): string => {
  const randomIndex = Math.floor(Math.random() * TON_WALLET_ADDRESSES.length);
  return TON_WALLET_ADDRESSES[randomIndex];
};

// Function to get random wallet address for ERC20
const getRandomERC20Address = (): string => {
  const randomIndex = Math.floor(Math.random() * ERC20_WALLET_ADDRESSES.length);
  return ERC20_WALLET_ADDRESSES[randomIndex];
};

// Function to get random wallet address for Polygon
const getRandomPolygonAddress = (): string => {
  const randomIndex = Math.floor(Math.random() * POLYGON_WALLET_ADDRESSES.length);
  return POLYGON_WALLET_ADDRESSES[randomIndex];
};

const CHAIN_OPTIONS: ChainOption[] = [
  {
    id: "trc20",
    name: "tron",
    displayName: "TRC20 (Tron)",
    icon: "/deposit/trx.svg",
    network: "TRC20",
    currency: "USDT",
    minDeposit: 1,
    walletAddress: TRC20_WALLET_ADDRESSES[0], // Will be replaced with random address when selected
  },
  {
    id: "bep20",
    name: "binance",
    displayName: "BEP20 (BNB Chain)",
    icon: "/deposit/bnb_bep20.svg",
    network: "BEP20",
    currency: "USDT",
    minDeposit: 1,
    walletAddress: BEP20_WALLET_ADDRESSES[0], // Will be replaced with random address when selected
  },
  {
    id: "erc20",
    name: "ethereum",
    displayName: "ERC20 (Ethereum)",
    icon: "/deposit/eth.svg",
    network: "ERC20",
    currency: "USDT",
    minDeposit: 1,
    walletAddress: ERC20_WALLET_ADDRESSES[0], // Will be replaced with random address when selected
  },
  {
    id: "polygon",
    name: "polygon",
    displayName: "Polygon (MATIC)",
    icon: "/deposit/matic.svg",
    network: "Polygon",
    currency: "USDT",
    minDeposit: 1,
    walletAddress: POLYGON_WALLET_ADDRESSES[0], // Will be replaced with random address when selected
  },
  {
    id: "solana",
    name: "solana",
    displayName: "Solana",
    icon: "/deposit/sol.svg",
    network: "Solana",
    currency: "USDT",
    minDeposit: 1,
    walletAddress: SOLANA_WALLET_ADDRESSES[0], // Will be replaced with random address when selected
  },
  {
    id: "ton",
    name: "ton",
    displayName: "TON (The Open Network)",
    icon: "/deposit/ton.svg",
    network: "TON",
    currency: "USDT",
    minDeposit: 1,
    walletAddress: TON_WALLET_ADDRESSES[0], // Will be replaced with random address when selected
  },
];

export default function ChainSelector({ onSelectChain, selectedAmount, mode = "deposit" }: ChainSelectorProps) {
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const handleSelectChain = (chain: ChainOption) => {
    setSelectedChain(chain.id);
    
    // For deposit mode, select a random wallet address each time for supported chains
    if (mode === "deposit") {
      let randomAddress = chain.walletAddress;
      
      if (chain.id === "bep20") {
        randomAddress = getRandomBEP20Address();
      } else if (chain.id === "trc20") {
        randomAddress = getRandomTRC20Address();
      } else if (chain.id === "solana") {
        randomAddress = getRandomSolanaAddress();
      } else if (chain.id === "ton") {
        randomAddress = getRandomTONAddress();
      } else if (chain.id === "erc20") {
        randomAddress = getRandomERC20Address();
      } else if (chain.id === "polygon") {
        randomAddress = getRandomPolygonAddress();
      }
      
      const chainWithRandomAddress = {
        ...chain,
        walletAddress: randomAddress,
      };
      onSelectChain(chainWithRandomAddress);
    } else {
      onSelectChain(chain);
    }
  };

  const isWithdraw = mode === "withdraw";
  const title = isWithdraw ? "Select Withdraw Chain" : "Select Deposit Chain";
  const description = isWithdraw 
    ? `Choose the network to withdraw ${selectedAmount} USDT`
    : `Choose the network to deposit ${selectedAmount} USDT`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CHAIN_OPTIONS.map((chain) => (
          <Card
            key={chain.id}
            className={`p-4 cursor-pointer border-2 transition-all hover:scale-105 ${
              selectedChain === chain.id
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
            onClick={() => handleSelectChain(chain)}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-card p-2 flex items-center justify-center">
                <img 
                  src={chain.icon} 
                  alt={chain.displayName} 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/deposit/usdt_trc20.svg"; // fallback icon
                  }}
                />
              </div>
              <span className="text-sm font-medium text-center">{chain.displayName}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        <p>Make sure to select the correct network to avoid loss of funds</p>
        {!isWithdraw && (
          <p className="mt-1">Minimum deposit: 1 USDT</p>
        )}
      </div>
    </div>
  );
}