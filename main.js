console.log("Main JS loaded");

const connectBtn = document.getElementById("connectBtn");
const walletAddressEl = document.getElementById("walletAddress");
const avatarControls = document.getElementById("avatar-controls");
const refreshBtn = document.getElementById("refreshBtn");
const submitBtn = document.getElementById("submitBtn");
const avatarContainer = document.getElementById("avatar-container");

let isConnecting = false;
let currentWalletAddress = null;
let currentSeed = 0;
let selectedAvatar = null;

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
    
    // Remove selected state
    avatarContainer.classList.remove("selected");
    selectedAvatar = null;
    submitBtn.disabled = false;
    
    // Remove success message if exists
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
    
    // Visual feedback
    avatarContainer.classList.add("selected");
    submitBtn.disabled = true;
    
    // Save to localStorage
    localStorage.setItem("selectedAvatar", JSON.stringify(selectedAvatar));
    
    // Show success message
    const successMsg = document.createElement("p");
    successMsg.className = "success-message";
    successMsg.textContent = "✓ Avatar selected and saved!";
    avatarControls.appendChild(successMsg);
    
    console.log("Avatar selected:", selectedAvatar);
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