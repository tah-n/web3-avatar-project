// نشانی contract که deploy کردی
const CONTRACT_ADDRESS = "0xC18E0D09e1B6F406a0E4a6447A5acdA5075f17be";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

// Contract ABI
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "seed",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "tokenURI",
        "type": "string"
      }
    ],
    "name": "mintAvatar",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "hasAvatar",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "getAvatarByWallet",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalMinted",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

class NFTContract {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
  }
  
  // Check and switch to Sepolia network
  async switchToSepolia() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      console.log("✅ Switched to Sepolia network");
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'SepoliaETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              },
            ],
          });
          console.log("✅ Sepolia network added and switched");
          return true;
        } catch (addError) {
          console.error("Failed to add Sepolia network:", addError);
          return false;
        }
      }
      console.error("Failed to switch network:", switchError);
      return false;
    }
  }
  
  async initialize() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error("MetaMask not installed");
    }
    
    // Check current network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log("Current network chainId:", chainId);
    
    if (chainId !== SEPOLIA_CHAIN_ID) {
      console.log("⚠️ Wrong network! Switching to Sepolia...");
      const switched = await this.switchToSepolia();
      if (!switched) {
        throw new Error("Please switch to Sepolia network manually in MetaMask");
      }
      // Wait a moment for network to switch
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
    
    console.log("NFT Contract initialized:", CONTRACT_ADDRESS);
  }
  
  async getMintPrice() {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }
    const price = await this.contract.mintPrice();
    return ethers.utils.formatEther(price);
  }
  
  async hasAvatar(address) {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }
    return await this.contract.hasAvatar(address);
  }
  
  async getAvatarByWallet(address) {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }
    const tokenId = await this.contract.getAvatarByWallet(address);
    return tokenId.toString();
  }
  
  async mintAvatar(seed, metadataURI) {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }
    
    try {
      const mintPrice = await this.contract.mintPrice();
      
      console.log("Minting with:", {
        seed: seed,
        metadataURI: metadataURI,
        price: ethers.utils.formatEther(mintPrice) + " ETH"
      });
      
      const tx = await this.contract.mintAvatar(seed, metadataURI, {
        value: mintPrice,
        gasLimit: 500000
      });
      
      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      return receipt;
    } catch (error) {
      console.error("Minting error:", error);
      throw error;
    }
  }
  
  async getTotalMinted() {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }
    const total = await this.contract.totalMinted();
    return total.toString();
  }
}

// Export for use globally
window.NFTContract = NFTContract;
