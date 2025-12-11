// --- FIREBASE INIT ---
    const firebaseConfig = {
      apiKey: "AIzaSyByvett5gGhga0jx2pBChmg41IKaTvbY24",
      authDomain: "bustrack-e4f8f.firebaseapp.com",
      databaseURL: "https://bustrack-e4f8f-default-rtdb.firebaseio.com",
      projectId: "bustrack-e4f8f",
      storageBucket: "bustrack-e4f8f.firebasestorage.app",
      messagingSenderId: "544737954134",
      appId: "1:544737954134:web:91a197cc88d0a67c43eef7"
    };
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();

    // --- THEME SWITCHER LOGIC ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
        updateThemeIcon();
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const btn = document.getElementById('themeToggleBtn');
        const isLight = document.body.classList.contains('light-theme');
        if (isLight) {
            btn.innerHTML = '<i class="fa-solid fa-sun" style="color: var(--pri-color);"></i>';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    // Call init on load
    initTheme();

    // --- WALLET POOL DATA (Embedded) ---
    const WALLET_POOL_JSON = {
      "001": {
        "assigned": false,
        "bnb": "0xE7A428b2737d601518368E65CDb0e7d4BEfc513c",
        "btc": "0xE7A428b2737d601518368E65CDb0e7d4BEfc513c",
        "createdAt": "2025-12-08T18:53:21.496Z",
        "eth": "0xE7A428b2737d601518368E65CDb0e7d4BEfc513c",
        "trx": "TCby234YS7qEjUbSEvvLetiebHhTdZcSPG"
      },
      "002": {
        "assigned": false,
        "bnb": "0xadCb728e8aF2755F1348baaB73C6D7B3330b0D5E",
        "btc": "0xadCb728e8aF2755F1348baaB73C6D7B3330b0D5E",
        "createdAt": "2025-12-08T18:53:21.503Z",
        "eth": "0xadCb728e8aF2755F1348baaB73C6D7B3330b0D5E",
        "trx": "TVyuMUgKnvPjDaCdKgcEfFWnsPUrKAUyyC"
      },
      "003": {
        "assigned": false,
        "bnb": "0x7Ea213De6e24fA6903137DE7828FECA550477fB6",
        "btc": "0x7Ea213De6e24fA6903137DE7828FECA550477fB6",
        "createdAt": "2025-12-08T18:53:21.504Z",
        "eth": "0x7Ea213De6e24fA6903137DE7828FECA550477fB6",
        "trx": "TMSjjbioLZDUsSGV9R41mcYuV6TajNNBDK"
      },
      "004": {
        "assigned": false,
        "bnb": "0x606910F7c9Df90aa77844DE6d750875733DD2a8f",
        "btc": "0x606910F7c9Df90aa77844DE6d750875733DD2a8f",
        "createdAt": "2025-12-08T18:53:21.505Z",
        "eth": "0x606910F7c9Df90aa77844DE6d750875733DD2a8f",
        "trx": "TR6P6TbU3Ky75MWcMpf21QkCF9gvEwDzoK"
      },
      "005": {
        "assigned": false,
        "bnb": "0x9e29D8cC73DFcd0a289a1F0f1994eEcf9a03Aba2",
        "btc": "0x9e29D8cC73DFcd0a289a1F0f1994eEcf9a03Aba2",
        "createdAt": "2025-12-08T18:53:21.505Z",
        "eth": "0x9e29D8cC73DFcd0a289a1F0f1994eEcf9a03Aba2",
        "trx": "TU9kgoMTwTFzo7BefPTu71yc3rWYkuQLzP"
      }
    };

    // --- VIEW CONTROLLERS ---
    const loadingView = document.getElementById('loading-view');
    const loadingText = document.getElementById('loading-sub-text');
    const reviewView = document.getElementById('review-view');
    const dashboardView = document.getElementById('dashboard-view');
    let currentDetailSymbol = null; 

    // STATE TRACKING FOR LOADING
    const appState = {
        hasAddress: false,
        balancesLoaded: false,
        holdingsLoaded: false,
        pricesLoaded: false,
        ready: false
    };

    function checkAppReady() {
        if (!appState.hasAddress) return;
        if (appState.balancesLoaded && appState.holdingsLoaded && appState.pricesLoaded && !appState.ready) {
            appState.ready = true;
            loadingText.textContent = "Welcome Back";
            setTimeout(() => {
                loadingView.classList.add('fade-out');
                dashboardView.style.display = 'flex';
                setTimeout(() => dashboardView.classList.add('visible'), 50);
            }, 800);
        }
    }

    function switchView(viewName) {
        if(viewName === 'review') {
            loadingView.style.display = 'none';
            reviewView.style.display = 'flex';
        }
    }

    // --- GLOBAL VARS ---
    let realEthBalance = 0.0;
    let realBnbBalance = 0.0;
    let realBtcBalance = 0.0;
    let realSolBalance = 0.0;
    let realXrpBalance = 0.0;
    let realUsdtBalance = 0.0;
    let realTrxBalance = 0.0;

    let walletAddress = "";
    let fetchedAddresses = {}; 
    const REQUIRED_COINS = ['btc', 'eth', 'usdt', 'trx', 'bnb', 'sol', 'xrp'];

    const COINGECKO_ID_MAP = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'BNB': 'binancecoin',
        'SOL': 'solana',
        'XRP': 'ripple',
        'USDT': 'tether',
        'TRX': 'tron',
    };

    let globalCoinMetadata = {}; 
    let latestPrices = {};        
    let latestUserHoldings = {}; 
    let allTransactions = {}; 
    let activeStakes = {}; 

    // --- AUTH & ADDRESS CHECK LOGIC ---
    auth.onAuthStateChanged((user) => {
      if (user) {
        loadingText.textContent = "Syncing Account Data...";
        initAddressPool().then(() => {
             checkAndInitUserData(user.uid);
             startSplitDataSync(user.uid);

             // Listen for address assignment
             const addressRef = database.ref('privilegesecdata/' + user.uid);
             addressRef.on('value', (snapshot) => {
                 fetchAndInitPublicAddresses(user);
             });
        });
      } else {
        window.location.href = 'index.html';
      }
    });

    // --- AUTO-ASSIGNMENT LOGIC ---
    async function initAddressPool() {
        const poolRef = database.ref('addressPool');
        const snapshot = await poolRef.once('value');
        if(!snapshot.exists()) {
            await poolRef.set(WALLET_POOL_JSON);
        }
    }

    // 1. Assign New Wallet and Save User Info
    async function assignWalletFromPool(userId, email, name) {
        const poolRef = database.ref('addressPool');
        const snapshot = await poolRef.once('value');
        const pool = snapshot.val();

        if (!pool) return false;

        for (const [key, walletData] of Object.entries(pool)) {
            if (!walletData.assigned) {
                const statusRef = database.ref(`addressPool/${key}/assigned`);

                const result = await statusRef.transaction((currentStatus) => {
                    if (currentStatus === true) return; 
                    return true; 
                });

                if (result.committed) {
                    await database.ref(`addressPool/${key}`).update({
                        assignedToUid: userId,
                        userEmail: email || 'No Email Provided',
                        userName: name || 'No Name Provided',
                        assignedAt: new Date().toISOString()
                    });

                    const userMap = {
                        bnb: walletData.bnb || '',
                        btc: walletData.btc || '',
                        eth: walletData.eth || '',
                        trx: walletData.trx || '',
                        usdt: walletData.trx || '', 
                        sol: '', 
                        xrp: ''  
                    };
                    await database.ref('privilegesecdata/' + userId).set(userMap);
                    return true;
                }
            }
        }
        return false; 
    }

    // 2. Helper to backfill email/name for existing users
    async function syncUserDataToPool(uid, email, name, bnbAddress) {
        const poolRef = database.ref('addressPool');
        poolRef.once('value', (snapshot) => {
            const pool = snapshot.val();
            if (!pool) return;

            for (const [key, walletData] of Object.entries(pool)) {
                // We use BNB address as a unique identifier to find the correct wallet
                if (walletData.bnb === bnbAddress) {
                    // Check if data is missing or out of sync (optional: remove !walletData.userEmail check to force update always)
                    if (!walletData.userEmail || !walletData.userName || !walletData.assignedToUid) {
                          database.ref(`addressPool/${key}`).update({
                            assignedToUid: uid,
                            userEmail: email || 'No Email Provided',
                            userName: name || 'No Name Provided'
                        });
                        console.log("Synced user info to existing wallet:", key);
                    }
                    break; 
                }
            }
        });
    }

    function fetchAndInitPublicAddresses(user) {
        const userId = user.uid;
        const userEmail = user.email;
        const userName = user.displayName;

        const path = 'privilegesecdata/' + userId;
        const ref = database.ref(path);

        ref.get().then(async (snapshot) => {
            let data = snapshot.val();

            if (!data) {
                // Case: NEW USER (No Wallet)
                loadingText.textContent = "Assigning Secure Wallet...";
                const assigned = await assignWalletFromPool(userId, userEmail, userName);
                if (!assigned) {
                    switchView('review'); 
                    return;
                }
                return; 
            }

            // Case: EXISTING USER (Has Wallet)
            // Ensure their email/name is saved in the pool if it wasn't before
            if (data.bnb) {
                syncUserDataToPool(userId, userEmail, userName, data.bnb);
            }

            fetchedAddresses = data;
            const hasAddress = Object.values(fetchedAddresses).some(addr => addr && addr !== '');

            if (hasAddress) {
                 appState.hasAddress = true;
                 loadingText.textContent = "Scanning Blockchains...";
                 fetchLiveBalances().then(() => {
                        appState.balancesLoaded = true;
                        checkAppReady();
                 });
            } else {
                 switchView('review');
            }

        }).catch(error => {
            console.error("Error fetching public address:", error);
            switchView('review');
        });
    }

    async function fetchLiveBalances() {
        if (typeof ethers === 'undefined') {
            appState.balancesLoaded = true;
            checkAppReady();
            return;
        }

        const fetchBalance = async (coin, address) => {
            if (!address) return 0.0;
            try {
                switch (coin) {
                    case 'ETH': {
                        const ethProvider = new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com");
                        const balance = await ethProvider.getBalance(address);
                        return parseFloat(ethers.utils.formatEther(balance));
                    }
                    case 'BNB': {
                        const bscProvider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
                        const balance = await bscProvider.getBalance(address);
                        return parseFloat(ethers.utils.formatEther(balance));
                    }
                    case 'USDT': {
                        if(!address.startsWith('T')) return 0.0; 
                        const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
                        const data = await res.json();

                        if (data.data && data.data.length > 0) {
                             const account = data.data[0];
                             let usdtBal = 0;
                             if(account.trc20) {
                                 account.trc20.forEach(tokenObj => {
                                     if(tokenObj['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']) {
                                         usdtBal = parseFloat(tokenObj['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']);
                                     }
                                 });
                             }
                             return usdtBal / 1000000; 
                        }
                        return 0.0;
                    }
                    case 'BTC': {
                        const res = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
                        const data = await res.json();
                        return data.balance !== undefined ? data.balance / 100000000 : 0.0;
                    }
                    case 'TRX': {
                        const res = await fetch(`https://api.trongrid.io/wallet/getaccount`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ address: address, visible: true })
                        });
                        const data = await res.json();
                        return data.balance !== undefined ? data.balance / 1000000 : 0.0; 
                    }
                    case 'SOL': {
                        const res = await fetch(`https://api.mainnet-beta.solana.com`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ "jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [address] })
                        });
                        const data = await res.json();
                        return data.result && data.result.value !== undefined ? data.result.value / 1000000000 : 0.0; 
                    }
                    case 'XRP': {
                        const res = await fetch(`https://s1.ripple.com:51234`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ "method": "account_info", "params": [{ "account": address, "ledger_index": "current" }] })
                        });
                        const data = await res.json();
                        return data.result?.account_data?.Balance !== undefined ? parseFloat(data.result.account_data.Balance) / 1000000 : 0.0; 
                    }
                    default: return 0.0;
                }
            } catch (e) { return 0.0; }
        };

        const [ethBal, bnbBal, usdtBal, btcBal, trxBal, solBal, xrpBal] = await Promise.all([
            fetchBalance('ETH', fetchedAddresses['eth']),
            fetchBalance('BNB', fetchedAddresses['bnb']),
            fetchBalance('USDT', fetchedAddresses['usdt']), 
            fetchBalance('BTC', fetchedAddresses['btc']),
            fetchBalance('TRX', fetchedAddresses['trx']),
            fetchBalance('SOL', fetchedAddresses['sol']),
            fetchBalance('XRP', fetchedAddresses['xrp'])
        ]);

        realEthBalance = ethBal;
        realBnbBalance = bnbBal;
        realUsdtBalance = usdtBal;
        realBtcBalance = btcBal;
        realTrxBalance = trxBal;
        realSolBalance = solBal;
        realXrpBalance = xrpBal;

        renderAssets(); 
    }

    async function fetchTransactions(address, symbol) {
        if (!address || address === 'NO_ADDRESS_SET') {
             allTransactions[symbol] = [];
        } else {
             const mockTx = [
                { id: `tx_1_${symbol}`, type: 'Receive', amount: (Math.random() * 5).toFixed(4), date: new Date().toLocaleDateString(), from: '0xmocksender...' },
                { id: `tx_2_${symbol}`, type: 'Send', amount: (Math.random() * 2).toFixed(4), date: new Date(Date.now() - 86400000).toLocaleDateString(), to: '0xmockreceiver...' }
             ];
             allTransactions[symbol] = mockTx;
        }
        if (currentDetailSymbol === symbol) renderTransactions(symbol);
    }

    function loadAllTransactionHistory() {
        if (Object.keys(fetchedAddresses).length === 0) return;
        for (const [coin, address] of Object.entries(fetchedAddresses)) {
            if (address && address !== '') fetchTransactions(address, coin.toUpperCase());
        }
    }

    function checkAndInitUserData(userId) {
      const holdingsRef = database.ref('userHoldings/' + userId);
      holdingsRef.get().then((snapshot) => {
        const currentData = snapshot.val() || {};
        const defaultAssets = {
           'ETH':  { hold: 0, name: 'Ethereum' },
           'BNB':  { hold: 0, name: 'Binance Coin' }, 
           'BTC':  { hold: 0, name: 'Bitcoin' },
           'USDT': { hold: 0, name: 'Tether' },
           'SOL':  { hold: 0, name: 'Solana' },
           'XRP':  { hold: 0, name: 'Ripple' }, 
           'TRX':  { hold: 0, name: 'Tron' }, 
        };

        let needsUpdate = false;
        for (const [key, value] of Object.entries(defaultAssets)) {
            if (!currentData[key]) {
                currentData[key] = value;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
           holdingsRef.set(currentData);
        }
      });
    }

    async function fetchLivePrices() {
        const coinIds = REQUIRED_COINS.map(s => COINGECKO_ID_MAP[s.toUpperCase()]).filter(id => id);
        if (coinIds.length === 0) return;

        const idsString = coinIds.join(',');
        const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error();
            const data = await response.json();

            const newPrices = {};
            for (const [symbol, id] of Object.entries(COINGECKO_ID_MAP)) {
                if (data[id]) {
                    newPrices[symbol] = { price: data[id].usd, chg: data[id].usd_24h_change };
                }
            }
            latestPrices = newPrices;
            appState.pricesLoaded = true; 
            checkAppReady();
            renderAssets(); 
            renderStakingOverview(); 

        } catch (error) { console.error("Price fetch error"); }
    }


    function startSplitDataSync(userId) {
        database.ref('globalcoindata').on('value', (s) => { 
            globalCoinMetadata = s.val() || {}; 
            renderAssets(); 
        });

        fetchLivePrices(); 
        setInterval(fetchLivePrices, 30000);

        database.ref('userHoldings/' + userId).on('value', (s) => { 
            latestUserHoldings = s.val() || {}; 
            appState.holdingsLoaded = true;
            checkAppReady();
            renderAssets(); 
            loadAllTransactionHistory();
        });

        database.ref('userStakes/' + userId).on('value', (s) => {
            activeStakes = s.val() || {};
            renderStakingOverview();
            renderAssets(); 
        });
    }

    function renderAssets() {
        const container = document.getElementById('assetsListContainer');
        container.innerHTML = '';
        let totalPortfolioValue = 0;

        const getStakedAmount = (symbol) => {
            let total = 0;
            for (const id in activeStakes) {
                const s = activeStakes[id];
                if (s.coin === symbol && (s.status === 'ACTIVE' || s.status === 'PENDING')) {
                    total += parseFloat(s.amount);
                }
            }
            return total;
        };

        for (const sym in latestUserHoldings) {
            let userAssetData = latestUserHoldings[sym];
            let holdAmount = parseFloat(userAssetData.hold) || 0;

            if(sym === 'ETH') holdAmount += realEthBalance;
            if(sym === 'BNB') holdAmount += realBnbBalance;
            if(sym === 'BTC') holdAmount += realBtcBalance;
            if(sym === 'SOL') holdAmount += realSolBalance;
            if(sym === 'XRP') holdAmount += realXrpBalance;
            if(sym === 'USDT') holdAmount += realUsdtBalance;
            if(sym === 'TRX') holdAmount += realTrxBalance;

            const stakedAmount = getStakedAmount(sym);
            holdAmount = holdAmount - stakedAmount;
            if (holdAmount < 0) holdAmount = 0;

            const meta = globalCoinMetadata[sym] || {};
            const name = meta.name || userAssetData.name || sym;
            const iconClass = meta.cls || sym.toLowerCase(); 

            const priceData = latestPrices[sym] || { price: 0, chg: 0 };
            const price = parseFloat(priceData.price) || 0;
            const change = parseFloat(priceData.chg) || 0;
            const value = price * holdAmount;

            const isPriceAvailable = price > 0;

            if (isPriceAvailable) totalPortfolioValue += value;

            const row = document.createElement('div');
            row.className = 'asset-row';

            row.onclick = () => {
                showCoinDetail(sym, { name: name, icon: iconClass }, { hold: holdAmount }, { price: price, chg: change });
            };

            let priceAndValueHTML;
            if (isPriceAvailable) {
                priceAndValueHTML = `
                    <div class="col-2">
                        <span class="price">$${fmt(price)}</span><span class="change ${change>=0?'up':'down'}">${change>=0?'+':''}${fmt(change)}%</span>
                    </div>
                    <div class="col-3">
                        <span class="value">$${fmt(value)}</span><span class="holdings">${fmt(holdAmount, holdAmount<1?5:4)} ${sym}</span>
                    </div>
                `;
            } else {
                priceAndValueHTML = `
                    <div class="col-2 full-width" style="text-align: right;">
                        <span class="price" style="font-size: 14px; color: var(--txt-2);">Price Not Available</span>
                        <span class="holdings" style="font-weight: 600; color: var(--txt-1);">${fmt(holdAmount, holdAmount<1?5:4)} ${sym}</span>
                    </div>
                `;
            }

            row.innerHTML = `
                <div class="col-1">
                    <img class="coin" src="${getCoinLogo(iconClass)}">
                    <div class="coin-info"><span class="symbol">${sym}</span><span class="name">${name}</span></div>
                </div>
                ${priceAndValueHTML}
            `;
            container.appendChild(row);
        }
        document.getElementById('portfolioValue').textContent = '$' + fmt(totalPortfolioValue);
    }

    function renderStakingOverview() {
        let totalStakedUSD = 0;
        let totalRewardsUSD = 0;
        let totalWeightedRate = 0;

        for (const id in activeStakes) {
            const s = activeStakes[id];
            const price = latestPrices[s.coin]?.price || 0;
            const locked = parseFloat(s.amount);
            const val = locked * price;

            if(s.status === 'ACTIVE') {
                totalStakedUSD += val;
                totalWeightedRate += (s.dailyRate || 0.01) * val;
            }

            if (s.status === 'ACTIVE') {
                const daily = s.dailyRate || 0.01;
                const start = new Date(s.startTime);
                const now = new Date();
                const days = Math.floor((now - start) / (86400000));

                const currentBal = locked * Math.pow(1 + daily, days);
                const earned = (currentBal - locked) - parseFloat(s.rewardsWithdrawn || 0);

                if(earned > 0) totalRewardsUSD += earned * price;
            }
        }

        let avgRate = 0;
        if (totalStakedUSD > 0) {
            avgRate = (totalWeightedRate / totalStakedUSD) * 100;
        }

        document.getElementById('stakingTotalStaked').textContent = '$' + fmt(totalStakedUSD);
        document.getElementById('stakingTotalRewards').textContent = '$' + fmt(totalRewardsUSD);
        document.getElementById('stakingAvgRate').textContent = fmt(avgRate) + '%';
    }

    function fmt(n, p=2){
      const num = parseFloat(n);
      if (isNaN(num)) return '0.00';
      if (num === 0) return '0.00';

      let minFrac = 2; let maxFrac = 2;
      const absNum = Math.abs(num);

      if (absNum >= 1000) { maxFrac = 2; } 
      else if (absNum >= 1) { maxFrac = 2; } 
      else if (absNum > 0 && absNum < 1) { maxFrac = 6; minFrac = 2; }
      if (p === 2 && (absNum < 100)) { maxFrac = 2; minFrac = 2; }

      return num.toLocaleString(undefined,{ minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
    }

    function getCoinLogo(cls) {
      if(!cls) return 'https://assets.coincap.io/assets/icons/eth@2x.png';
      const lower = cls.toLowerCase();
      if(lower === 'bnb') return 'https://assets.coincap.io/assets/icons/bnb@2x.png'; 
      if(lower === 'btc') return 'https://assets.coincap.io/assets/icons/btc@2x.png';
      if(lower === 'sol') return 'https://assets.coincap.io/assets/icons/sol@2x.png';
      if(lower === 'xrp') return 'https://assets.coincap.io/assets/icons/xrp@2x.png';
      if(lower === 'usdt') return 'https://assets.coincap.io/assets/icons/usdt@2x.png';
      if(lower === 'trx') return 'https://assets.coincap.io/assets/icons/trx@2x.png'; 
      return `https://assets.coincap.io/assets/icons/${lower}@2x.png`;
    }

    function logout() {
      auth.signOut().then(() => { window.location.href = 'index.html'; });
    }

    function executeSend() {
        const statusMsg = document.getElementById('sendFeedback');
        statusMsg.style.color = 'var(--bad)';
        statusMsg.textContent = 
        document.getElementById('confirmSendBtn').disabled = true;
    }

    function copyAddress() {
        const addressElement = document.getElementById('receiveAddressDisplay');
        if(!addressElement) return;
        const address = addressElement.textContent.trim();
        if(!address || address === 'Address Not Set' || address === 'NO_ADDRESS_SET' || address === 'Temporarily Unavailable') return;

        navigator.clipboard.writeText(address).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--pri-color);"></i> Copied';
            setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy" style="color:var(--pri-color);"></i> Copy'; }, 2000);
        });
    }

    function setMaxAmount() {
        let bal = 0;
        if(currentDetailSymbol === 'ETH') bal = realEthBalance;
        if(currentDetailSymbol === 'BNB') bal = realBnbBalance;
        if(currentDetailSymbol === 'BTC') bal = realBtcBalance;
        if(currentDetailSymbol === 'SOL') bal = realSolBalance;
        if(currentDetailSymbol === 'XRP') bal = realXrpBalance;
        if(currentDetailSymbol === 'USDT') bal = realUsdtBalance;
        if(currentDetailSymbol === 'TRX') bal = realTrxBalance;

        let max = bal; if(max < 0) max = 0;
        document.getElementById('sendAmount').value = max.toFixed(5);
    }

    function renderCoinSelectionPanel() {
        let listHTML = '<div style="display:flex; flex-direction:column; gap:8px;">';
        REQUIRED_COINS.forEach(coinLower => {
            const sym = coinLower.toUpperCase();
            const address = fetchedAddresses[coinLower];

            const meta = globalCoinMetadata[sym] || {};
            const name = meta.name || latestUserHoldings[sym]?.name || sym;
            const iconClass = meta.cls || sym.toLowerCase(); 

            // Logic to determine if coin is disabled (no address)
            const isEnabled = address && address !== 'NO_ADDRESS_SET' && address !== '';
            const rowClass = isEnabled ? 'asset-row' : 'asset-row disabled';
            const clickAction = isEnabled ? `renderReceivePanel('${sym}')` : '';
            const chevron = isEnabled ? '<i class="fa-solid fa-chevron-right" style="color:var(--txt-2); font-size:14px;"></i>' : '<span style="font-size:10px; color:var(--bad); font-weight:600; text-transform:uppercase;">Unavailable</span>';

            listHTML += `
                <div class="${rowClass}" style="padding:10px 12px; grid-template-columns: 1fr;" onclick="${clickAction}">
                    <div class="col-1" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img class="coin" src="${getCoinLogo(iconClass)}">
                            <div class="coin-info"><span class="symbol">${sym}</span><span class="name">${name}</span></div>
                        </div>
                        ${chevron}
                    </div>
                </div>
            `;
        });
        listHTML += '</div>';
        return listHTML;
    }

    function renderReceivePanel(activeSymbol){
        const m = document.getElementById('modal');
        const body = document.getElementById('modalBody');
        const title = document.getElementById('modalTitle');
        const badge = document.getElementById('networkBadge');
        title.textContent = 'Deposit';

        const lowerSym = activeSymbol.toLowerCase();
        let displayAddress = fetchedAddresses[lowerSym] || 'Temporarily Unavailable'; 
        let isAvailable = true;

        if(!fetchedAddresses[lowerSym] || fetchedAddresses[lowerSym] === 'NO_ADDRESS_SET' || fetchedAddresses[lowerSym] === '') {
            displayAddress = "Temporarily Unavailable";
            isAvailable = false;
        }

        let networkName = 'Primary Network';
        let badgeClass = 'network-badge';
        if(activeSymbol === 'ETH') { networkName = 'Ethereum (ERC-20)'; badgeClass = 'net-eth'; } 
        else if (activeSymbol === 'BNB') { networkName = 'BNB Smart Chain (BEP-20)'; badgeClass = 'net-bsc'; } 
        else if (activeSymbol === 'BTC') { networkName = 'Bitcoin Network'; badgeClass = 'net-btc'; } 
        else if (activeSymbol === 'SOL') { networkName = 'Solana Network'; badgeClass = 'net-sol'; } 
        else if (activeSymbol === 'XRP') { networkName = 'XRP Ledger'; badgeClass = 'net-xrp'; } 
        else if (activeSymbol === 'TRX') { networkName = 'Tron Network (TRC-20)'; badgeClass = 'net-trx'; } 
        else if (activeSymbol === 'USDT') { networkName = 'Tron Network (TRC-20)'; badgeClass = 'net-trx'; } 

        badge.className = `network-badge ${badgeClass}`;
        badge.textContent = networkName;

        body.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div id="qrcode" style="padding:10px; background:white; border-radius:10px; min-height:148px; display:grid; place-items:center;"></div>
                <p style="color:var(--txt-2); font-size:13px; text-align:center;">
                    Scan to deposit **${activeSymbol}** to your **TruVesta** Wallet on the **${networkName}** network.
                </p>
                <div style="background:var(--bg-2); padding:12px; border-radius:12px; width:100%; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--edge);">
                    <span id="receiveAddressDisplay" style="font-family:monospace; font-size:12px; color:var(--txt-1); overflow:hidden; text-overflow:ellipsis; max-width:200px;">
                        ${displayAddress}
                    </span>
                    <button id="copyBtn" onclick="copyAddress()" style="background:none; border:none; color:var(--pri-color); cursor:pointer;">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
            </div>
        `;

        setTimeout(() => {
            const qrContainer = document.getElementById("qrcode");
            if(isAvailable) {
                new QRCode(qrContainer, { text: displayAddress, width: 128, height: 128 });
            } else {
                qrContainer.innerHTML = '<div style="color:var(--bad); display:flex; flex-direction:column; align-items:center; gap:5px;"><i class="fa-solid fa-ban" style="font-size:24px;"></i><span style="font-size:12px; font-weight:600;">Unavailable</span></div>';
            }
        }, 100);
        m.classList.add('open'); 
    }

    function openModal(kind){
      const m = document.getElementById('modal');
      const body = document.getElementById('modalBody');
      const title = document.getElementById('modalTitle');
      const badge = document.getElementById('networkBadge');

      title.textContent = kind.charAt(0).toUpperCase()+kind.slice(1);

      let activeSymbol = 'ETH';
      if(currentDetailSymbol && fetchedAddresses[currentDetailSymbol.toLowerCase()] !== undefined) {
          activeSymbol = currentDetailSymbol;
      }

      badge.className = 'network-badge';
      badge.textContent = '';

      if(kind === 'receive') {
          if(currentDetailSymbol) { renderReceivePanel(currentDetailSymbol); return; }
          title.textContent = 'Select Coin to Deposit';
          body.innerHTML = renderCoinSelectionPanel();

      } else if (kind === 'send') {
          title.textContent = 'Withdraw';
          let currentBal = 0;
          if(activeSymbol === 'ETH') currentBal = realEthBalance;
          if(activeSymbol === 'BNB') currentBal = realBnbBalance;
          if(activeSymbol === 'BTC') currentBal = realBtcBalance;
          if(activeSymbol === 'SOL') currentBal = realSolBalance;
          if(activeSymbol === 'XRP') currentBal = realXrpBalance;
          if(activeSymbol === 'USDT') currentBal = realUsdtBalance;
          if(activeSymbol === 'TRX') currentBal = realTrxBalance;

          let networkName = 'Ethereum (ERC-20)'; let badgeClass = 'net-eth';
          if(activeSymbol === 'BNB') { networkName = 'BNB Smart Chain (BEP-20)'; badgeClass = 'net-bsc'; } 
          else if (activeSymbol === 'BTC') { networkName = 'Bitcoin Network'; badgeClass = 'net-btc'; } 
          else if (activeSymbol === 'SOL') { networkName = 'Solana Network'; badgeClass = 'net-sol'; } 
          else if (activeSymbol === 'XRP') { networkName = 'XRP Ledger'; badgeClass = 'net-xrp'; } 
          else if (activeSymbol === 'TRX') { networkName = 'Tron Network (TRC-20)'; badgeClass = 'net-trx'; } 
          else if (activeSymbol === 'USDT') { networkName = 'Tron Network (TRC-20)'; badgeClass = 'net-trx'; } 

          badge.className = `network-badge ${badgeClass}`;
          badge.textContent = networkName;

          body.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div>
                    <label style="font-size:12px; color:var(--txt-2); margin-left:4px;">Network</label>
                    <div class="input-wrapper" style="margin-top:6px;">
                        <input type="text" value="${networkName}" readonly style="width:100%; padding:14px; padding-right: 40px; background:var(--bg-1); border:1px solid var(--edge); color:var(--txt-2); border-radius:12px; outline:none; font-weight:500;">
                        <span class="scan-btn-inside" style="cursor: default;"><i class="fa-solid fa-lock"></i></span>
                    </div>
                </div>
                <div>
                    <label style="font-size:12px; color:var(--txt-2); margin-left:4px;">Recipient Address</label>
                    <div class="input-wrapper" style="margin-top:6px;">
                        <input id="sendRecipient" type="text" placeholder="${activeSymbol==='TRX'||activeSymbol==='USDT'?'T...':'0x...'}" style="width:100%; padding:14px; padding-right: 40px; background:var(--input-bg); border:1px solid var(--edge); color:var(--txt-1); border-radius:12px; outline:none; font-family:monospace;">
                        <button class="scan-btn-inside"><i class="fa-solid fa-qrcode"></i></button>
                    </div>
                </div>
                ${activeSymbol === 'XRP' ? `
                    <div>
                        <label style="font-size:12px; color:var(--txt-2); margin-left:4px;">Destination Tag (Optional)</label>
                        <input id="destinationTag" type="number" placeholder="12345" style="width:100%; padding:14px; background:var(--input-bg); border:1px solid var(--edge); color:var(--txt-1); border-radius:12px; outline:none; margin-top:6px;">
                    </div>
                ` : ''}
                <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                         <label style="font-size:12px; color:var(--txt-2); margin-left:4px;">Amount (${activeSymbol})</label>
                         <span onclick="setMaxAmount()" style="font-size:12px; color:var(--pri-color); cursor:pointer;">Max: ${currentBal.toFixed(4)}</span>
                    </div>
                    <input id="sendAmount" type="number" placeholder="0.00" style="width:100%; padding:14px; background:var(--input-bg); border:1px solid var(--edge); color:var(--txt-1); border-radius:12px; outline:none;">
                </div>
                <p id="sendFeedback" style="font-size:12px; text-align:center; min-height:16px; margin:0;"></p>
                <button id="confirmSendBtn" onclick="executeSend()" class="btn primary" style="width:100%; padding:14px; font-size:16px; margin-top:8px;">
                    Confirm Withdraw ${activeSymbol}
                </button>
            </div>
          `;
          executeSend(); 
      } else {
          body.innerHTML = '<p style="text-align:center; color:var(--txt-2);">Feature coming soon.</p>';
      }

      if (kind === 'receive' && currentDetailSymbol) {} else { m.classList.add('open'); }
    }

    let coinChart = null; 
    function showCoinDetail(sym, staticInfo, holding, liveData) {
      currentDetailSymbol = sym;
      document.getElementById('detailCoinName').textContent = staticInfo.name;
      document.getElementById('detailCoinName2').textContent = staticInfo.name;
      document.getElementById('detailCoinIcon').src = getCoinLogo(staticInfo.icon);
      document.getElementById('detailCoinSymbol').textContent = sym;

      const holdAmount = holding.hold;
      const price = liveData.price;
      const value = price * holdAmount;

      document.getElementById('detailCryptoAmt').textContent = `${fmt(holdAmount, holdAmount < 1 ? 5 : 4)} ${sym}`;
      document.getElementById('detailUsdAmt').textContent = `~ $${fmt(value)}`;

      const timeframeContainer = document.getElementById('chartTimeframes');
      timeframeContainer.dataset.symbol = sym || '';
      if (timeframeContainer.querySelector('.time-btn.active')) { timeframeContainer.querySelector('.time-btn.active').classList.remove('active'); }
      timeframeContainer.querySelectorAll('.time-btn')[1].classList.add('active'); 

      renderChart(sym, 7); 
      renderTransactions(sym); 

      document.getElementById('dashboard-view').classList.add('show-detail');
      document.getElementById('coinDetailView').scrollTop = 0; 
    }

    function hideCoinDetail() {
      currentDetailSymbol = null; 
      document.getElementById('dashboard-view').classList.remove('show-detail');
      if (coinChart) { coinChart.destroy(); coinChart = null; }
    }

    function updateChartData(btn, days) {
      document.querySelector('.time-btn.active').classList.remove('active');
      btn.classList.add('active');
      const symbol = document.getElementById('chartTimeframes').dataset.symbol;
      renderChart(symbol, days);
    }

    async function renderChart(symbol, days = 7) {
      const canvas = document.getElementById('coinChart');
      const ctx = canvas.getContext('2d');
      const timeframeContainer = document.getElementById('chartTimeframes');

      if (coinChart) coinChart.destroy();
      if (days === 'max') days = 2000; 
      if (!symbol) { canvas.style.display = 'none'; return; }
      canvas.style.display = 'block'; timeframeContainer.style.display = 'flex';

      try {
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=${days}`;
        const response = await fetch(url);
        const json = await response.json();

        if(json.Response !== 'Success' || !json.Data || !json.Data.Data) { canvas.style.display = 'none'; return; }

        const rawData = json.Data.Data; 
        const prices = rawData.map(d => d.close);
        const labels = rawData.map(d => new Date(d.time * 1000).toLocaleDateString());

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight);
        gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)'); 
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

        coinChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Price',
              data: prices,
              borderColor: 'var(--pri-color)', 
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3,
              fill: true,
              backgroundColor: gradient,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
            scales: { x: { display: false }, y: { display: false } }
          }
        });
      } catch (error) { canvas.style.display = 'none'; }
    }

    function renderTransactions(sym) {
      const container = document.getElementById('txHistoryList');
      const transactions = allTransactions[sym] || [];
      let assignedAddress = fetchedAddresses[sym.toLowerCase()] || 'Temporarily Unavailable';
      if(!fetchedAddresses[sym.toLowerCase()]) assignedAddress = 'Temporarily Unavailable';

      container.innerHTML = '';

      if (transactions.length === 0) {
          container.innerHTML = `
              <p style="text-align:center; color:var(--txt-2); font-size: 14px;">
                No transaction history found for ${sym}. 
                <br><span style="font-size:11px;">(Assigned Address: ${assignedAddress})</span>
              </p>`; 
          return;
      }

      transactions.forEach(tx => {
          const isReceive = tx.type === 'Receive';
          const icon = isReceive ? 'fa-arrow-down' : 'fa-arrow-up';
          const color = isReceive ? 'var(--good)' : 'var(--bad)';
          const direction = isReceive ? 'Received' : 'Sent';

          container.innerHTML += `
              <div style="display:flex; justify-content:space-between; align-items:center; padding: 12px 0; border-bottom: 1px solid var(--edge);">
                  <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: ${color}22;">
                          <i class="fa-solid ${icon}" style="font-size: 12px; color: ${color};"></i>
                      </div>
                      <div>
                          <span style="font-weight: 600; color: var(--txt-1);">${direction} ${sym}</span>
                          <div style="font-size: 12px; color: var(--txt-2); margin-top: 2px;">${tx.date}</div>
                      </div>
                  </div>
                  <div style="text-align:right;">
                      <span style="font-weight: 600; color: ${color};">${isReceive ? '+' : '-'}${tx.amount} ${sym}</span>
                      <div style="font-size: 12px; color: var(--txt-2); margin-top: 2px;">$${fmt(tx.amount * (latestPrices[sym]?.price || 0))}</div>
                  </div>
              </div>
          `;
      });
    }
