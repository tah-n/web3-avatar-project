console.log("Main JS loaded");

const connectBtn = document.getElementById("connectBtn");
const walletAddressEl = document.getElementById("walletAddress");
const avatarControls = document.getElementById("avatar-controls");
const refreshBtn = document.getElementById("refreshBtn");
const submitBtn = document.getElementById("submitBtn");
const mintBtn = document.getElementById("mintBtn");
const avatarContainer = document.getElementById("avatar-container");

let isConnecting = false;
let currentWalletAddress = null;
let currentSeed = 0;
let selectedAvatar = null;
let nftContract = null; // NFT Contract instance

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
    
    return true;
  } catch (error) {
    console.error("Failed to initialize NFT contract:", error);
    return false;
  }
}

connectBtn.addEventListener("click", async () => {
  if (isConnecting) {
    console.log("Connection already in progress...");
    return;
  }
  
  if (typeof window.ethereum !== "undefined") {
    try {
      isConnecting = true;
      connectBtn.textContent = "Connecting...";
      connectBtn.disabled = true;
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      const account = accounts[0];
      currentWalletAddress = account;
      walletAddressEl.textContent = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
      
      // Initialize NFT contract
      const contractReady = await initNFTContract();
      
      if (contractReady) {
        // Check if user already has an avatar
        const hasAvatar = await nftContract.hasAvatar(account);
        if (hasAvatar) {
          const tokenId = await nftContract.getAvatarByWallet(account);
          walletAddressEl.textContent += ` | NFT #${tokenId} owned ✅`;
          mintBtn.textContent = "Already Minted ✓";
          mintBtn.disabled = true;
        }
      }
      
      // Generate initial avatar
      if (window.updateAvatar) {
        currentSeed = 0;
        window.updateAvatar(account, currentSeed);
      }
      
      // Show avatar controls
      avatarControls.style.display = "flex";
      
      connectBtn.textContent = "Connected";
      
    } catch (error) {
      console.error("Connection error:", error);
      
      if (error.code === -32002) {
        walletAddressEl.textContent = "Please check MetaMask popup";
      } else if (error.code === 4001) {
        walletAddressEl.textContent = "Connection rejected";
      } else {
        walletAddressEl.textContent = "Connection failed";
      }
      
      connectBtn.textContent = "Connect Wallet";
      connectBtn.disabled = false;
      
    } finally {
      isConnecting = false;
    }
  } else {
    walletAddressEl.textContent = "Please install MetaMask";
    alert("MetaMask is not installed. Please install it from https://metamask.io");
  }
});

// Refresh button - generate new avatar
refreshBtn.addEventListener("click", () => {
  if (currentWalletAddress && window.updateAvatar) {
    currentSeed++;
    window.updateAvatar(currentWalletAddress, currentSeed);
    
    avatarContainer.classList.remove("selected");
    selectedAvatar = null;
    submitBtn.disabled = false;
    
    const successMsg = document.querySelector(".success-message");
    if (successMsg) {
      successMsg.remove();
    }
  }
});

// Submit button - confirm avatar selection
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
    
    const successMsg = document.createElement("p");
    successMsg.className = "success-message";
    successMsg.textContent = "✓ Avatar selected! Ready to mint as NFT";
    avatarControls.appendChild(successMsg);
    
    // Enable mint button
    mintBtn.disabled = false;
    
    console.log("Avatar selected:", selectedAvatar);
  }
});

// Mint button - mint as NFT
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
    mintBtn.textContent = "Checking...";
    
    // Check if already has avatar
    const hasAvatar = await nftContract.hasAvatar(currentWalletAddress);
    if (hasAvatar) {
      alert("You already minted an avatar NFT!");
      mintBtn.textContent = "Already Minted ✓";
      return;
    }
    
    // Get mint price
    const mintPrice = await nftContract.getMintPrice();
    const confirmMint = confirm(
      `Mint your avatar as NFT?\n\n` +
      `Price: ${mintPrice} ETH\n` +
      `Seed: ${selectedAvatar.seed}\n\n` +
      `Click OK to proceed.`
    );
    
    if (!confirmMint) {
      mintBtn.disabled = false;
      mintBtn.textContent = "🎨 Mint as NFT";
      return;
    }
    
    mintBtn.textContent = "Preparing...";
    
    // For now, use a simple metadata URI (you'll add IPFS later)
    const metadataURI = `data:application/json;base64,${btoa(JSON.stringify({
      name: `Web3 Avatar #${selectedAvatar.seed}`,
      description: "Unique Minecraft-style avatar generated from wallet address",
      attributes: [
        { trait_type: "Seed", value: selectedAvatar.seed },
        { trait_type: "Wallet", value: currentWalletAddress.slice(0, 10) + "..." }
      ]
    }))}`;
    
    mintBtn.textContent = "Minting NFT...";
    
    const receipt = await nftContract.mintAvatar(selectedAvatar.seed, metadataURI);
    
    mintBtn.textContent = "✓ Minted!";
    
    alert(
      `NFT minted successfully! 🎉\n\n` +
      `Transaction: ${receipt.transactionHash}\n\n` +
      `View on Sepolia Etherscan:\n` +
      `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
    );
    
    // Update UI
    walletAddressEl.textContent = `Connected: ${currentWalletAddress.slice(0, 6)}...${currentWalletAddress.slice(-4)} | NFT Minted ✅`;
    
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
    mintBtn.textContent = "🎨 Mint as NFT";
    mintBtn.disabled = false;
  }
});

// Check if already connected on page load
window.addEventListener("load", async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      
      if (accounts.length > 0) {
        const account = accounts[0];
        currentWalletAddress = account;
        walletAddressEl.textContent = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
        
        // Initialize contract
        const contractReady = await initNFTContract();
        
        if (contractReady) {
          const hasAvatar = await nftContract.hasAvatar(account);
          if (hasAvatar) {
            const tokenId = await nftContract.getAvatarByWallet(account);
            walletAddressEl.textContent += ` | NFT #${tokenId} owned ✅`;
            mintBtn.textContent = "Already Minted ✓";
            mintBtn.disabled = true;
          }
        }
        
        // Load saved avatar if exists
        const savedAvatar = localStorage.getItem("selectedAvatar");
        if (savedAvatar) {
          const avatarData = JSON.parse(savedAvatar);
          if (avatarData.walletAddress === account) {
            currentSeed = avatarData.seed;
            selectedAvatar = avatarData;
            avatarContainer.classList.add("selected");
            submitBtn.disabled = true;
          }
        }
        
        // Generate avatar
        if (window.updateAvatar) {
          window.updateAvatar(account, currentSeed);
        }
        
        avatarControls.style.display = "flex";
        connectBtn.textContent = "Connected";
        connectBtn.disabled = true;
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  }
});