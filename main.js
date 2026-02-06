console.log("Main JS loaded");

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const walletAddressEl = document.getElementById("walletAddress");
const connectionStatus = document.getElementById("connectionStatus");
const networkInfo = document.getElementById("networkInfo");
const networkName = document.getElementById("networkName");
const walletBalance = document.getElementById("walletBalance");
const avatarControls = document.getElementById("avatar-controls");
const refreshBtn = document.getElementById("refreshBtn");
const submitBtn = document.getElementById("submitBtn");
const mintBtn = document.getElementById("mintBtn");
const avatarContainer = document.getElementById("avatar-container");
const avatarSeed = document.getElementById("avatarSeed");
const seedNumber = document.getElementById("seedNumber");
const successMessage = document.getElementById("successMessage");
const contractStats = document.getElementById("contractStats");
const totalMintedEl = document.getElementById("totalMinted");
const mintPriceEl = document.getElementById("mintPrice");
const userTokenIdEl = document.getElementById("userTokenId");

let isConnecting = false;
let currentWalletAddress = null;
let currentSeed = 0;
let selectedAvatar = null;
let nftContract = null;

// Initialize NFT Contract
async function initNFTContract() {
  try {
    nftContract = new NFTContract();
    await nftContract.initialize();
    
    const mintPrice = await nftContract.getMintPrice();
    const totalMinted = await nftContract.getTotalMinted();
    
    console.log("✅ NFT Contract ready!");
    console.log("Mint price:", mintPrice, "ETH");
    console.log("Total minted:", totalMinted);
    
    // Update stats
    mintPriceEl.textContent = mintPrice + " ETH";
    totalMintedEl.textContent = totalMinted;
    contractStats.style.display = "block";
    
    return true;
  } catch (error) {
    console.error("Failed to initialize NFT contract:", error);
    return false;
  }
}

// Update balance
async function updateBalance() {
  if (currentWalletAddress) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(currentWalletAddress);
      walletBalance.textContent = parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }
}

// Update network info
async function updateNetworkInfo() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    
    const networkNames = {
      1: "Ethereum Mainnet",
      11155111: "Sepolia Testnet",
      137: "Polygon Mainnet",
      80002: "Polygon Amoy Testnet"
    };
    
    networkName.textContent = networkNames[network.chainId] || `Chain ID: ${network.chainId}`;
  } catch (error) {
    console.error("Error fetching network:", error);
  }
}

// Connect wallet
connectBtn.addEventListener("click", async () => {
  if (isConnecting) {
    console.log("Connection already in progress...");
    return;
  }
  
  if (typeof window.ethereum !== "undefined") {
    try {
      isConnecting = true;
      connectBtn.innerHTML = '<span class="btn-icon loading">⏳</span> Connecting...';
      connectBtn.disabled = true;
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      const account = accounts[0];
      currentWalletAddress = account;
      
      // Update UI
      walletAddressEl.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
      connectionStatus.classList.add("connected");
      networkInfo.style.display = "block";
      
      // Update network and balance
      await updateNetworkInfo();
      await updateBalance();
      
      // Initialize NFT contract
      const contractReady = await initNFTContract();
      
      if (contractReady) {
        // Check if user already has an avatar
        const hasAvatar = await nftContract.hasAvatar(account);
        if (hasAvatar) {
          const tokenId = await nftContract.getAvatarByWallet(account);
          userTokenIdEl.textContent = tokenId;
          mintBtn.innerHTML = '<span class="btn-icon">✓</span> Already Minted';
          mintBtn.disabled = true;
        } else {
          userTokenIdEl.textContent = "-";
        }
      }
      
      // Generate initial avatar
      if (window.updateAvatar) {
        currentSeed = 0;
        seedNumber.textContent = currentSeed;
        avatarSeed.style.display = "block";
        
        // Remove placeholder
        const placeholder = avatarContainer.querySelector(".avatar-placeholder");
        if (placeholder) {
          placeholder.remove();
        }
        
        window.updateAvatar(account, currentSeed);
      }
      
      // Show controls
      avatarControls.style.display = "flex";
      
      // Update buttons
      connectBtn.style.display = "none";
      disconnectBtn.style.display = "flex";
      
    } catch (error) {
      console.error("Connection error:", error);
      
      if (error.code === -32002) {
        walletAddressEl.textContent = "Please check MetaMask popup";
      } else if (error.code === 4001) {
        walletAddressEl.textContent = "Connection rejected";
      } else {
        walletAddressEl.textContent = "Connection failed";
      }
      
      connectBtn.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet';
      connectBtn.disabled = false;
      
    } finally {
      isConnecting = false;
    }
  } else {
    walletAddressEl.textContent = "Please install MetaMask";
    alert("MetaMask is not installed. Please install it from https://metamask.io");
  }
});

// Disconnect wallet
disconnectBtn.addEventListener("click", () => {
  // Reset state
  currentWalletAddress = null;
  currentSeed = 0;
  selectedAvatar = null;
  nftContract = null;
  
  // Reset UI
  walletAddressEl.textContent = "Not connected";
  connectionStatus.classList.remove("connected");
  networkInfo.style.display = "none";
  avatarControls.style.display = "none";
  avatarSeed.style.display = "none";
  contractStats.style.display = "none";
  successMessage.style.display = "none";
  
  // Reset avatar container
  avatarContainer.innerHTML = `
    <div class="avatar-placeholder">
      <div class="placeholder-icon">🎭</div>
      <p>Connect your wallet to generate avatar</p>
    </div>
  `;
  avatarContainer.classList.remove("selected");
  
  // Reset buttons
  connectBtn.style.display = "flex";
  disconnectBtn.style.display = "none";
  mintBtn.innerHTML = '<span class="btn-icon">🎨</span> Mint as NFT';
  mintBtn.disabled = true;
  submitBtn.disabled = false;
  
  // Clear localStorage
  localStorage.removeItem("selectedAvatar");
  
  console.log("Wallet disconnected");
});

// Refresh button
refreshBtn.addEventListener("click", () => {
  if (currentWalletAddress && window.updateAvatar) {
    currentSeed++;
    seedNumber.textContent = currentSeed;
    window.updateAvatar(currentWalletAddress, currentSeed);
    
    avatarContainer.classList.remove("selected");
    selectedAvatar = null;
    submitBtn.disabled = false;
    successMessage.style.display = "none";
  }
});

// Submit button
submitBtn.addEventListener("click", () => {
  if (currentWalletAddress) {
    selectedAvatar = {
      walletAddress: currentWalletAddress,
      seed: currentSeed,
      timestamp: new Date().toISOString()
    };
    
    avatarContainer.classList.add("selected");
    submitBtn.disabled = true;
    
    localStorage.setItem("selectedAvatar", JSON.stringify(selectedAvatar));
    
    successMessage.style.display = "flex";
    mintBtn.disabled = false;
    
    console.log("Avatar selected:", selectedAvatar);
  }
});

// Mint button
mintBtn.addEventListener("click", async () => {
  if (!currentWalletAddress || !selectedAvatar) {
    alert("Please connect wallet and select an avatar first!");
    return;
  }
  
  if (!nftContract) {
    alert("NFT contract not initialized. Please reconnect your wallet.");
    return;
  }
  
  try {
    mintBtn.disabled = true;
    mintBtn.innerHTML = '<span class="btn-icon loading">⏳</span> Checking...';
    
    const hasAvatar = await nftContract.hasAvatar(currentWalletAddress);
    if (hasAvatar) {
      alert("You already minted an avatar NFT!");
      mintBtn.innerHTML = '<span class="btn-icon">✓</span> Already Minted';
      return;
    }
    
    const mintPrice = await nftContract.getMintPrice();
    const confirmMint = confirm(
      `Mint your avatar as NFT?\n\n` +
      `Price: ${mintPrice} ETH\n` +
      `Seed: ${selectedAvatar.seed}\n\n` +
      `Click OK to proceed.`
    );
    
    if (!confirmMint) {
      mintBtn.disabled = false;
      mintBtn.innerHTML = '<span class="btn-icon">🎨</span> Mint as NFT';
      return;
    }
    
    mintBtn.innerHTML = '<span class="btn-icon loading">⏳</span> Preparing...';
    
    const metadataURI = `data:application/json;base64,${btoa(JSON.stringify({
      name: `Web3 Avatar #${selectedAvatar.seed}`,
      description: "Unique Minecraft-style avatar generated from wallet address",
      attributes: [
        { trait_type: "Seed", value: selectedAvatar.seed },
        { trait_type: "Wallet", value: currentWalletAddress.slice(0, 10) + "..." }
      ]
    }))}`;
    
    mintBtn.innerHTML = '<span class="btn-icon loading">⏳</span> Minting NFT...';
    
    const receipt = await nftContract.mintAvatar(selectedAvatar.seed, metadataURI);
    
    mintBtn.innerHTML = '<span class="btn-icon">✓</span> Minted Successfully!';
    
    alert(
      `NFT minted successfully! 🎉\n\n` +
      `Transaction: ${receipt.transactionHash}\n\n` +
      `View on Sepolia Etherscan:\n` +
      `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
    );
    
    // Update stats
    const totalMinted = await nftContract.getTotalMinted();
    const tokenId = await nftContract.getAvatarByWallet(currentWalletAddress);
    totalMintedEl.textContent = totalMinted;
    userTokenIdEl.textContent = tokenId;
    
    // Update balance
    await updateBalance();
    
  } catch (error) {
    console.error("Minting failed:", error);
    
    let errorMessage = "Minting failed: ";
    if (error.code === 4001) {
      errorMessage += "Transaction rejected by user";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage += "Insufficient funds for gas";
    } else {
      errorMessage += error.message || "Unknown error";
    }
    
    alert(errorMessage);
    mintBtn.innerHTML = '<span class="btn-icon">🎨</span> Mint as NFT';
    mintBtn.disabled = false;
  }
});

// Listen to account changes
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      disconnectBtn.click();
    } else if (currentWalletAddress && accounts[0] !== currentWalletAddress) {
      window.location.reload();
    }
  });
  
  window.ethereum.on('chainChanged', () => {
    window.location.reload();
  });
}

// Check if already connected on page load
window.addEventListener("load", async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      
      if (accounts.length > 0) {
        // Simulate connect button click
        connectBtn.click();
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  }
});