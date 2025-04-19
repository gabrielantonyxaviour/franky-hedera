app/layout.tsx

import '../styles/globals.css';

import Providers from 'components/providers';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

app/page.tsx

'use client';

import Balance from 'components/Balance';
import BlockNumber from 'components/BlockNumber';
import Button from 'components/Button';
import ContractEvent from 'components/ContractEvent';
import ContractRead from 'components/ContractRead';
import ContractReads from 'components/ContractReads';
import ContractWrite from 'components/ContractWrite';
import EnsAddress from 'components/EnsAddress';
import EnsAvatar from 'components/EnsAvatar';
import EnsName from 'components/EnsName';
import EnsResolver from 'components/EnsResolver';
import FeeData from 'components/FeeData';
import PublicClient from 'components/PublicClient';
import SendTransaction from 'components/SendTransaction';
import SignMessage from 'components/SignMessage';
import SignTypedData from 'components/SignTypedData';
import Signer from 'components/Signer';
import SwitchNetwork from 'components/SwitchNetwork';
import Token from 'components/Token';
import Transaction from 'components/Transaction';
import WaitForTransaction from 'components/WaitForTransaction';
import WalletClient from 'components/WalletClient';
import WatchPendingTransactions from 'components/WatchPendingTransactions';
import {shorten} from 'lib/utils';
import Image from 'next/image';
import {useAccount, useDisconnect} from 'wagmi';

import {usePrivy, useWallets} from '@privy-io/react-auth';
import {useSetActiveWallet} from '@privy-io/wagmi';

import wagmiPrivyLogo from '../public/wagmi_privy_logo.png';

const MonoLabel = ({label}: {label: string}) => {
  return <span className="rounded-xl bg-slate-200 px-2 py-1 font-mono">{label}</span>;
};

export default function Home() {
  // Privy hooks
  const {ready, user, authenticated, login, connectWallet, logout, linkWallet} = usePrivy();
  const {wallets, ready: walletsReady} = useWallets();

  // WAGMI hooks
  const {address, isConnected, isConnecting, isDisconnected} = useAccount();
  const {disconnect} = useDisconnect();
  const {setActiveWallet} = useSetActiveWallet();

  if (!ready) {
    return null;
  }

  return (
    <>
      <main className="min-h-screen bg-slate-200 p-4 text-slate-800">
        <Image
          className="mx-auto rounded-lg"
          src={wagmiPrivyLogo}
          alt="wagmi x privy logo"
          width={400}
          height={100}
        />
        <p className="my-4 text-center">
          This demo showcases how you can integrate{' '}
          <a href="https://wagmi.sh/" className="font-medium underline">
            wagmi
          </a>{' '}
          alongside{' '}
          <a href="https://www.privy.io/" className="font-medium underline">
            Privy
          </a>{' '}
          in your React app. Login below to try it out!
          <br />
          For more information, check out{' '}
          <a href="https://docs.privy.io/guide/guides/wagmi" className="font-medium underline">
            our integration guide
          </a>{' '}
          or the{' '}
          <a href="https://github.com/privy-io/wagmi-demo" className="font-medium underline">
            source code
          </a>{' '}
          for this app.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3">
            <h1 className="text-4xl font-bold">Privy</h1>
            {ready && !authenticated && (
              <>
                <p>You are not authenticated with Privy</p>
                <div className="flex items-center gap-4">
                  <Button onClick_={login} cta="Login with Privy" />
                  <span>or</span>
                  <Button onClick_={connectWallet} cta="Connect only" />
                </div>
              </>
            )}

            {walletsReady &&
              wallets.map((wallet) => {
                return (
                  <div
                    key={wallet.address}
                    className="flex min-w-full flex-row flex-wrap items-center justify-between gap-2 bg-slate-50 p-4"
                  >
                    <div>
                      <MonoLabel label={shorten(wallet.address)} />
                    </div>
                    <Button
                      cta="Make active"
                      onClick_={() => {
                        setActiveWallet(wallet);
                      }}
                    />
                  </div>
                );
              })}

            {ready && authenticated && (
              <>
                <p className="mt-2">You are logged in with privy.</p>
                <Button onClick_={connectWallet} cta="Connect another wallet" />
                <Button onClick_={linkWallet} cta="Link another wallet" />
                <textarea
                  value={JSON.stringify(wallets, null, 2)}
                  className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                  rows={JSON.stringify(wallets, null, 2).split('\n').length}
                  disabled
                />
                <br />
                <textarea
                  value={JSON.stringify(user, null, 2)}
                  className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                  rows={JSON.stringify(user, null, 2).split('\n').length}
                  disabled
                />
                <br />
                <Button onClick_={logout} cta="Logout from Privy" />
              </>
            )}
          </div>
          <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3">
            <h1 className="text-4xl font-bold">WAGMI</h1>
            <p>
              Connection status: {isConnecting && <span>🟡 connecting...</span>}
              {isConnected && <span>🟢 connected.</span>}
              {isDisconnected && <span> 🔴 disconnected.</span>}
            </p>
            {isConnected && address && (
              <>
                <h2 className="mt-6 text-2xl">useAccount</h2>
                <p>
                  address: <MonoLabel label={address} />
                </p>

                <Balance />
                <Signer />
                <SignMessage />
                <SignTypedData />
                <PublicClient />
                <EnsName />
                <EnsAddress />
                <EnsAvatar />
                <EnsResolver />
                <SwitchNetwork />
                <BlockNumber />
                <SendTransaction />
                <ContractRead />
                <ContractReads />
                <ContractWrite />
                <ContractEvent />
                <FeeData />
                <Token />
                <Transaction />
                <WatchPendingTransactions />
                <WalletClient />
                <WaitForTransaction />

                <h2 className="mt-6 text-2xl">useDisconnect</h2>
                <Button onClick_={disconnect} cta="Disconnect from WAGMI" />
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

components/balance.tsx

'use client';

import {useAccount, useBalance} from 'wagmi';

const Balance = () => {
  const {address} = useAccount();
  const {data, isError, isLoading} = useBalance({address});

  if (isLoading) return <div>Fetching balance…</div>;
  if (isError) return <div>Error fetching balance</div>;
  return (
    <>
      <h2 className="mt-6 text-2xl">useBalance</h2>
      {isLoading && <p>fetching balance...</p>}
      {isError && <p>Error fetching balance.</p>}
      {data && (
        <p>
          Balance: {data?.formatted} {data?.symbol}
        </p>
      )}
    </>
  );
};

export default Balance;

components/blocknumber.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {useBlockNumber} from 'wagmi';

const BlockNumber = () => {
  const {data, isError, isLoading} = useBlockNumber();
  if (isLoading) return <Wrapper title="useBlockNumber">Fetching block number…</Wrapper>;
  if (isError) return <Wrapper title="useBlockNumber">Error fetching block number</Wrapper>;
  return <Wrapper title="useBlockNumber">Block number: {String(data)}</Wrapper>;
};

export default BlockNumber;

components/button.tsx

'use client';

type buttonProps = {
  cta: string;
  onClick_: () => void;
  disabled?: boolean;
};

const Button = ({cta, onClick_, disabled}: buttonProps) => {
  if (disabled) {
  }
  return (
    <button
      className="rounded bg-slate-800 px-10 py-2 text-white transition-all hover:bg-slate-900 active:bg-slate-900 enabled:hover:cursor-pointer enabled:active:scale-90 disabled:opacity-80"
      onClick={onClick_}
      disabled={disabled}
    >
      {cta}
    </button>
  );
};

export default Button;

components/contractevent.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {useState} from 'react';
import type {Log} from 'viem';
import {useWatchContractEvent, useAccount} from 'wagmi';

import MonoLabel from './MonoLabel';

const ContractEvent = () => {
  const {chain} = useAccount();
  const [logs, setLogs] = useState<Log[] | null>(null);

  useWatchContractEvent({
    address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // ENS Mainnet and Sepolia Registry
    abi: [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'node',
            type: 'bytes32',
          },
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'label',
            type: 'bytes32',
          },
          {
            indexed: false,
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
        ],
        name: 'NewOwner',
        type: 'event',
      },
    ],
    eventName: 'NewOwner',
    onLogs: (logs: Log[]) => {
      setLogs(logs);
    },
  });

  if (!chain) {
    return (
      <Wrapper title="useWatchContractEvent">
        <p>Loading...</p>
      </Wrapper>
    );
  }

  if (chain.id !== 1 && chain.id !== 5) {
    return (
      <Wrapper title="useWatchContractEvent">
        <p>Unsupported network. Please switch to Sepolia or Mainnet.</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper title="useWatchContractEvent">
      <p>
        First event:{' '}
        {logs && logs.length ? (
          logs.map((log, i) => <MonoLabel key={i} label={log.logIndex?.toString() ?? ''} />)
        ) : (
          <MonoLabel label="Listening..." />
        )}
      </p>
    </Wrapper>
  );
};

export default ContractEvent;

components/contractread.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {shorten, type AddressString} from 'lib/utils';
import {erc721Abi} from 'viem';
import {useReadContract, useAccount} from 'wagmi';

import MonoLabel from './MonoLabel';

const ContractRead = () => {
  const {chain} = useAccount();

  let contractAddress: AddressString | undefined;
  switch (chain?.id) {
    case 1:
    case 11155111:
      contractAddress = '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85'; // ENS Mainnet and Sepolia Base Registrar
      break;
  }

  const tokenId = '51642261290124123987113999051891697215550265269061454558443363901899214720732'; // larry.eth
  const {data, isError, isLoading} = useReadContract({
    address: contractAddress,
    abi: erc721Abi,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
  });

  if (!chain) {
    return (
      <Wrapper title="useContractRead">
        <p>Loading...</p>
      </Wrapper>
    );
  }

  if (!contractAddress) {
    return (
      <Wrapper title="useContractReads">
        <p>Unsupported network. Please switch to Sepolia or Mainnet.</p>
      </Wrapper>
    );
  }

  if (isError) {
    return (
      <Wrapper title="useContractRead">
        <p>Error reading from contract.</p>
      </Wrapper>
    );
  } else if (isLoading) {
    return (
      <Wrapper title="useContractRead">
        <p>Loading...</p>
      </Wrapper>
    );
  } else {
    return (
      <Wrapper title="useContractRead">
        <p>
          Owner of ENS Token ID {shorten(tokenId)}:{' '}
          {!data ? (
            <MonoLabel label="Error. Token may not exist on this network." />
          ) : (
            <MonoLabel label={shorten(data)} />
          )}
        </p>
      </Wrapper>
    );
  }
};

export default ContractRead;

components/contractreads.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {shorten, type AddressString} from 'lib/utils';
import {erc721Abi} from 'viem';
import {useContractReads, useAccount} from 'wagmi';

import MonoLabel from './MonoLabel';

const ContractReads = () => {
  const {chain} = useAccount();

  let contractAddress: AddressString | undefined;
  switch (chain?.id) {
    case 1:
    case 11155111:
      contractAddress = '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85'; // ENS Mainnet and Sepolia Base Registrar
      break;
  }

  const tokenIds = [
    '51642261290124123987113999051891697215550265269061454558443363901899214720732', // larry.eth
    '79233663829379634837589865448569342784712482819484549289560981379859480642508', // vitalik.eth
    '14062575871350128443718633951695181303483154763428382743088027645582664757571', // dhof.eth
  ];
  const {data, isError, isLoading} = useContractReads({
    contracts: tokenIds.map((tokenId) => {
      return {
        address: contractAddress,
        abi: erc721Abi,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      };
    }),
  });

  if (!chain) {
    return (
      <Wrapper title="useContractReads">
        <p>Loading...</p>
      </Wrapper>
    );
  }

  if (!contractAddress) {
    return (
      <Wrapper title="useContractReads">
        <p>Unsupported network. Please switch to Sepolia or Mainnet.</p>
      </Wrapper>
    );
  }

  if (isError) {
    return (
      <Wrapper title="useContractReads">
        <p>Error reading from contract.</p>
      </Wrapper>
    );
  } else if (isLoading || !data) {
    return (
      <Wrapper title="useContractReads">
        <p>Loading...</p>
      </Wrapper>
    );
  } else {
    return (
      <Wrapper title="useContractReads">
        {tokenIds.map((tokenId, index) => {
          return (
            <p key={tokenId}>
              Owner of ENS Token ID {shorten(tokenId)}:{' '}
              {!data[index].result ? (
                <MonoLabel label="Error. Token may not exist on this network." />
              ) : (
                <MonoLabel label={shorten(data[index].result as string)} />
              )}
            </p>
          );
        })}
      </Wrapper>
    );
  }
};

export default ContractReads;

components/contractwrite.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {shorten, type AddressString} from 'lib/utils';
import {useEffect} from 'react';
import {parseEther} from 'viem';
import {sepolia} from 'viem/chains';
import {useAccount, useWriteContract} from 'wagmi';

import Button from './Button';
import MonoLabel from './MonoLabel';

const ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'initialOwner',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'ERC721IncorrectOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'ERC721InsufficientApproval',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'approver',
        type: 'address',
      },
    ],
    name: 'ERC721InvalidApprover',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'ERC721InvalidOperator',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'ERC721InvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'receiver',
        type: 'address',
      },
    ],
    name: 'ERC721InvalidReceiver',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'ERC721InvalidSender',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'ERC721NonexistentToken',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
    ],
    name: 'safeMint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'getApproved',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINT_PRICE',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'ownerOf',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'tokenURI',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ContractWrite = () => {
  const {chain, address} = useAccount();

  const contractAddress: AddressString = '0x7958b71e50725e769fc1197da8655b84450a7666'; // WagmiConnectorDemo on Sepolia

  const {data, error, isError, isPending, writeContract} = useWriteContract();

  useEffect(() => {
    console.error(error);
  }, [error]);

  if (!chain) {
    return (
      <Wrapper title="useContractWrite">
        <p>Loading...</p>
      </Wrapper>
    );
  }

  if (chain.id !== sepolia.id) {
    return (
      <Wrapper title="useContractWrite">
        <p>Unsupported network. Please switch to Sepolia.</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper title="useContractWrite">
      <div className="rounded bg-red-400 px-2 py-1 text-sm text-white">
        We recommend doing this on sepolia.
      </div>
      {data && !isError && (
        <p>
          Transaction hash: <MonoLabel label={shorten(data)} />
        </p>
      )}
      {isError && <p>Error sending transaction.</p>}
      {address && (
        <Button
          disabled={isPending}
          onClick_={() =>
            writeContract?.({
              abi: ABI,
              address: contractAddress,
              functionName: 'safeMint',
              args: [address],
              value: parseEther('0.001'),
            })
          }
          cta="Mint"
        />
      )}
    </Wrapper>
  );
};

export default ContractWrite;

components/ensaddress.tsx

'use client';

import MonoLabel from 'components/MonoLabel';
import Wrapper from 'components/Wrapper';
import {shorten} from 'lib/utils';
import {useEnsAddress} from 'wagmi';

const EnsAddress = () => {
  const address = 'vitalik.eth';
  const {data, isError, isLoading} = useEnsAddress({name: address});
  if (isLoading) return <Wrapper title="useEnsAddress">Fetching address…</Wrapper>;
  if (isError) return <Wrapper title="useEnsAddress">Error fetching address</Wrapper>;
  return (
    <Wrapper title="useEnsAddress">
      Address for vitalik.eth: <MonoLabel label={shorten(data as string)} />
    </Wrapper>
  );
};

export default EnsAddress;

components/transaction.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {shorten, type AddressString, stringifyTransaction} from 'lib/utils';
import {useAccount, useTransaction} from 'wagmi';

import SmallTextArea from './SmallTextArea';

const Transaction = () => {
  const {chain} = useAccount();

  let txnHash: AddressString | undefined;
  switch (chain?.id) {
    case 1:
      txnHash = '0x6ff0860e202c61189cb2a3a38286bffd694acbc50577df6cb5a7ff40e21ea074'; // vitalik.eth First Txn on Mainnet
      break;
    case 11155111:
      txnHash = '0x486c6e80719147ade6574db437d6623507ac7f2ca533088b044514c5cada7358'; // vitalik.eth First Txn on Sepolia
      break;
  }

  const {data, isError, isLoading} = useTransaction({
    hash: txnHash,
  });

  if (!chain) {
    return (
      <Wrapper title="useTransaction">
        <p>Loading...</p>
      </Wrapper>
    );
  }

  if (!txnHash) {
    return (
      <Wrapper title="useTransaction">
        <p>Unsupported network. Please switch to Sepolia or Mainnet.</p>
      </Wrapper>
    );
  }

  if (isError) {
    return (
      <Wrapper title="useTransaction">
        <p>Error reading transaction.</p>
      </Wrapper>
    );
  } else if (isLoading) {
    return (
      <Wrapper title="useTransaction">
        <p>Loading...</p>
      </Wrapper>
    );
  } else {
    return (
      <Wrapper title="useTransaction">
        <div>
          {!data ? (
            <p>Error reading transaction.</p>
          ) : (
            <div>
              <p className="mb-2">Transaction response for {shorten(data.hash)}:</p>
              <SmallTextArea content={stringifyTransaction(data)} />
            </div>
          )}
        </div>
      </Wrapper>
    );
  }
};

export default Transaction;

components/signer.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {useEffect, useState} from 'react';
import {usePublicClient} from 'wagmi';
import {useWalletClient} from 'wagmi';

const Signer = () => {
  const publicClient = usePublicClient();
  const {data: walletClient, isError, isLoading} = useWalletClient();

  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<string | null>(null);
  const [transactionCount, setTransactionCount] = useState<string | null>(null);

  const ready =
    balance && chainId && gasPrice && transactionCount && walletClient && !isLoading && !isError;

  useEffect(() => {
    if (!walletClient) return;

    publicClient?.getBalance({address: walletClient.account.address}).then((balance) => {
      setBalance(balance.toString());
    });
    walletClient?.getChainId().then((chainId) => {
      setChainId(chainId.toString());
    });
    publicClient?.getGasPrice().then((gasPrice) => {
      setGasPrice(gasPrice.toString());
    });
    publicClient
      ?.getTransactionCount({address: walletClient.account.address})
      .then((transactionCount) => {
        setTransactionCount(transactionCount.toString());
      });
  }, [walletClient, publicClient]);

  if (isError) {
    return (
      <Wrapper title="useSigner">
        <p>Error getting signer.</p>
      </Wrapper>
    );
  } else if (!ready) {
    return (
      <Wrapper title="useSigner">
        <p>Loading...</p>
      </Wrapper>
    );
  } else {
    return (
      <Wrapper title="useSigner">
        <p>Balance: {balance}</p>
        <p>Chain ID: {chainId}</p>
        <p>Gas Price: {gasPrice}</p>
        <p>Transaction Count: {transactionCount}</p>
      </Wrapper>
    );
  }
};

export default Signer;

components/walletclient.tsx

'use client';

import Wrapper from 'components/Wrapper';
import {useWalletClient} from 'wagmi';

import MonoLabel from './MonoLabel';

const WalletClient = () => {
  const {data: walletClient} = useWalletClient();

  return (
    <Wrapper title="useWalletClient">
      <p>
        WalletClient loaded: <MonoLabel label={walletClient ? 'success' : 'waiting'} />
      </p>
    </Wrapper>
  );
};

export default WalletClient;

components/providers.tsx

'use client';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http} from 'viem';
import {mainnet, sepolia} from 'viem/chains';

import type {PrivyClientConfig} from '@privy-io/react-auth';
import {PrivyProvider} from '@privy-io/react-auth';
import {WagmiProvider, createConfig} from '@privy-io/wagmi';

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: true,
    noPromptOnSignature: false,
  },
  loginMethods: ['wallet', 'email', 'sms'],
  appearance: {
    showWalletLoginFirst: true,
  },
};

export default function Providers({children}: {children: React.ReactNode}) {
  return (
    <PrivyProvider
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      apiUrl={process.env.NEXT_PUBLIC_PRIVY_AUTH_URL as string}
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

globals.css

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --max-width: 1100px;
  --border-radius: 12px;
  --font-mono: ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono",
    "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro",
    "Fira Mono", "Droid Sans Mono", "Courier New", monospace;

  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;

  --primary-glow: conic-gradient(
    from 180deg at 50% 50%,
    #16abff33 0deg,
    #0885ff33 55deg,
    #54d6ff33 120deg,
    #0071ff33 160deg,
    transparent 360deg
  );
  --secondary-glow: radial-gradient(
    rgba(255, 255, 255, 1),
    rgba(255, 255, 255, 0)
  );

  --tile-start-rgb: 239, 245, 249;
  --tile-end-rgb: 228, 232, 233;
  --tile-border: conic-gradient(
    #00000080,
    #00000040,
    #00000030,
    #00000020,
    #00000010,
    #00000010,
    #00000080
  );

  --callout-rgb: 238, 240, 241;
  --callout-border-rgb: 172, 175, 176;
  --card-rgb: 180, 185, 188;
  --card-border-rgb: 131, 134, 135;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;

    --primary-glow: radial-gradient(rgba(1, 65, 255, 0.4), rgba(1, 65, 255, 0));
    --secondary-glow: linear-gradient(
      to bottom right,
      rgba(1, 65, 255, 0),
      rgba(1, 65, 255, 0),
      rgba(1, 65, 255, 0.3)
    );

    --tile-start-rgb: 2, 13, 46;
    --tile-end-rgb: 2, 5, 19;
    --tile-border: conic-gradient(
      #ffffff80,
      #ffffff40,
      #ffffff30,
      #ffffff20,
      #ffffff10,
      #ffffff10,
      #ffffff80
    );

    --callout-rgb: 20, 20, 20;
    --callout-border-rgb: 108, 108, 108;
    --card-rgb: 100, 100, 100;
    --card-border-rgb: 200, 200, 200;
  }
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

a {
  color: inherit;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  html {
    color-scheme: dark;
  }
}

test/playwright/authorize-request.ts

import {Web3ProviderBackend, Web3RequestKind} from 'headless-web3-provider';

import {sleep} from './sleep';

export const authorizeRequest = async ({
  wallet,
  requestKind,
}: {
  wallet: Web3ProviderBackend;
  requestKind: Web3RequestKind;
}) => {
  while (wallet.getPendingRequestCount(requestKind) !== 1) {
    await sleep(100);
  }
  await wallet.authorize(requestKind);
};

test/playwright/connect-wallet.ts

import {test, type Page} from '@playwright/test';
import {type Web3ProviderBackend, Web3RequestKind} from 'headless-web3-provider';

import {authorizeRequest} from './authorize-request';

export async function connectWallet(page: Page, wallet: Web3ProviderBackend) {
  await test.step(`Connect wallet`, async () => {
    await page.evaluate(async () => {
      window.ethereum.isMetaMask = true;
    });

    // Click connect button
    await page.getByRole('button', {name: 'Login with Privy', exact: true}).first().click();
    await page.getByRole('button', {name: 'MetaMask Connect'}).click();

    // Authorize sign in requests
    await authorizeRequest({wallet, requestKind: Web3RequestKind.RequestPermissions});
    await authorizeRequest({wallet, requestKind: Web3RequestKind.RequestAccounts});
    await authorizeRequest({wallet, requestKind: Web3RequestKind.SignMessage});
    // Wait for dialog to close before interacting with the page
    await page.waitForSelector('#privy-dialog:not([open])');
  });
}

test/playwright/fixture.ts

import * as Playwright from '@playwright/test';
import {injectHeadlessWeb3Provider, type Web3ProviderBackend} from 'headless-web3-provider';

const ALICE = {
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
};

const chainIdPortNumber = {
  5: 8545,
} as const;

const getChainAnvilRpcUrl = (chainId: keyof typeof chainIdPortNumber) =>
  `http://127.0.0.1:${chainIdPortNumber[chainId]}`;

type InjectWeb3Provider = (privateKeys?: string[]) => Promise<Web3ProviderBackend>;

export type TestOptions = {
  signers: string[];
  injectProvider: InjectWeb3Provider;
};

// A place for all setup / teardown that needs to happen before every test.
// We should only be importing this `test`, instead of `import {test} from "@playwright/test"`
export const test = Playwright.test.extend<TestOptions>({
  signers: [ALICE.privateKey],
  injectProvider: async ({page, signers}, use) => {
    await page.addInitScript(() => {
      function announceProvider() {
        const info = {
          uuid: '350670db-19fa-4704-a166-e52e178b59d2',
          name: 'MetaMask',
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
          rdns: 'io.metamask',
        };
        window.dispatchEvent(
          new CustomEvent('eip6963:announceProvider', {
            detail: {info, provider: window.ethereum},
          }),
        );
      }
      window.addEventListener('eip6963:requestProvider', () => announceProvider());
    });
    await use((privateKeys = signers) =>
      injectHeadlessWeb3Provider(page, privateKeys, 5, getChainAnvilRpcUrl(5)),
    );
  },
});
export {expect} from '@playwright/test';


text/playwright/sign-message.ts

import {test, type Page} from '@playwright/test';
import {Web3RequestKind, type Web3ProviderBackend} from 'headless-web3-provider';

import {authorizeRequest} from './authorize-request';

export async function signMessage(page: Page, wallet: Web3ProviderBackend, buttonText: string) {
  await test.step(`Sign message`, async () => {
    await page.evaluate(async () => {
      window.ethereum.isMetaMask = true;
    });
    await page.getByRole('button', {name: buttonText}).click();
    // await page.getByRole('button', { name: 'Sign and continue' }).click()
    await authorizeRequest({wallet, requestKind: Web3RequestKind.SignMessage});
  });
}

export async function signTypedData(page: Page, wallet: Web3ProviderBackend, buttonText: string) {
  await test.step(`Sign typed message`, async () => {
    await page.evaluate(async () => {
      window.ethereum.isMetaMask = true;
    });
    await page.getByRole('button', {name: buttonText}).click();
    await authorizeRequest({wallet, requestKind: Web3RequestKind.SignTypedDataV4});
  });
}


test/playwright/sleep.ts

export const sleep = async (timeout: number) => {
  await new Promise((res) => {
    setTimeout(() => {
      res('');
    }, timeout);
  });
};

test/unit/button.test.tsx

import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';

import Button from '../../components/Button';

test('Button', () => {
  render(<Button disabled={false} onClick_={() => console.log('clicked')} cta="Click me!" />);
  expect(screen.getByRole('button', {name: 'Click me!'})).toBeDefined();
});

.env.example:

NEXT_PUBLIC_PRIVY_APP_ID=<enter your Privy App ID>
NEXT_PUBLIC_ALCHEMY_API_KEY=<enter an Alchemy API key>

package.json:

{
  "name": "@privy-io/wagmi-demo",
  "type": "commonjs",
  "version": "0.1.0",
  "engines": {
    "npm": ">=8.0.0 <11.0.0",
    "node": ">=18.0.0 <21.0.0"
  },
  "scripts": {
    "dev": "next -p 4000",
    "build": "next build",
    "start": "next start",
    "clean": "rm -rf .next/cache && rm -rf ./node_modules",
    "format": "next lint --fix && npx prettier --write \"{components,lib,app,styles}/**/*.{ts,tsx,js,jsx}\"",
    "lint": "next lint && npx prettier --check \"{components,lib,app,styles}/**/*.{ts,tsx,js,jsx}\" && npx tsc --noEmit",
    "test:unit": "vitest --config vitest.config.ts run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@privy-io/react-auth": "1.94.0",
    "@privy-io/wagmi": "0.2.12",
    "@tailwindcss/forms": "^0.5.7",
    "@tanstack/react-query": "^5",
    "@types/node": "18.11.18",
    "@types/react": "18.0.26",
    "@types/react-dom": "18.0.10",
    "@wagmi/chains": "^1.8.0",
    "eslint": "8.31.0",
    "eslint-config-next": "13.1.1",
    "ethers": "5.7.2",
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "~5.1.6",
    "viem": "^2.16.0",
    "wagmi": "^2.10.4"
  },
  "devDependencies": {
    "@ianvs/prettier-plugin-sort-imports": "^3.7.1",
    "@playwright/test": "^1.40.1",
    "@testing-library/dom": "^9.3.3",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@types/react": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^5.59.7",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/ui": "^1.0.4",
    "autoprefixer": "^10.4.13",
    "eslint-config-prettier": "^8.8.0",
    "headless-web3-provider": "^0.2.3",
    "jsdom": "^23.0.1",
    "postcss": "^8.4.21",
    "prettier": "^2.8.8",
    "prettier-plugin-tailwindcss": "^0.3.0",
    "relative-deps": "^1.0.7",
    "tailwindcss": "^3.2.4",
    "vite-tsconfig-paths": "^4.2.2",
    "vitest": "^1.0.4"
  }
}

