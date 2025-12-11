// --- FIREBASE INIT ---
// Initialize Firebase with the specific configuration
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

// --- THEME LOGIC ---
// Handles toggling between light and dark modes
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
// Initialize theme immediately on script load
initTheme();

// --- MODAL LOGIC ---
// Custom replacements for alert() and confirm()
let modalResolver = null;
function openModal(title, message, isConfirm = false) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').innerHTML = message.replace(/\n/g, '<br>');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    if (isConfirm) { cancelBtn.style.display = 'block'; confirmBtn.textContent = 'Confirm'; } 
    else { cancelBtn.style.display = 'none'; confirmBtn.textContent = 'OK'; }
    document.getElementById('customModal').classList.add('show');
    return new Promise((resolve) => { modalResolver = resolve; });
}
function closeModal(result) {
    document.getElementById('customModal').classList.remove('show');
    if (modalResolver) { modalResolver(result); modalResolver = null; }
}
async function showAlert(message, title = 'Notification') { await openModal(title, message, false); }
async function showConfirm(message, title = 'Confirm Action') { return await openModal(title, message, true); }

// --- STAKING LOGIC ---
const GLOBAL_RULES_PATH = 'globalStakingRules';
let GLOBAL_REWARD_PERIOD_MS = 86400000; 
let GLOBAL_REWARD_PERIOD_TEXT = "24 Hours";
let STAKE_TIERS = [
    { max: 49, rate: 0.01 }, { max: 99, rate: 0.012 }, { max: 249, rate: 0.015 },
    { max: 499, rate: 0.017 }, { max: 999, rate: 0.02 }, { max: 1499, rate: 0.022 },
    { max: 2499, rate: 0.025 }, { max: 5000, rate: 0.027 }, { max: 99999999999, rate: 0.03 }
];
let DEFAULT_WITHDRAW_LIMITS = [
    { max: 249, percent: 0.10 }, { max: 999, percent: 0.15 }, { max: 2499, percent: 0.20 },
    { max: 4999, percent: 0.25 }, { max: Infinity, percent: 0.30 }
];
let currentWithdrawLimits = [...DEFAULT_WITHDRAW_LIMITS];
const FIXED_DURATION_DAYS = 250; 
let userId = null;
let latestPrices = {}; 
let activeStakes = {}; 
let userBalances = {}; 
let fetchedAddresses = {}; 
const REQUIRED_COINS = ['btc', 'eth', 'usdt', 'trx', 'bnb', 'sol', 'xrp'];
const COINGECKO_ID_MAP = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana', 'XRP': 'ripple', 'USDT': 'tether', 'TRX': 'tron' };
const USER_ADDRESSES_PATH = 'privilegesecdata/';
const USER_HOLDINGS_PATH = 'userHoldings/'; 

// Authentication Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        userId = user.uid;
        checkAndInitGlobalRules();
        listenToGlobalRules();
        fetchAndInitPublicAddresses(user.uid);
        listenForActiveStakes();
        fetchLivePrices();
    } else { 
        // Redirect to login if not authenticated
        window.location.href = 'index.html'; 
    }
});

function checkAndInitGlobalRules() {
    const ref = database.ref(GLOBAL_RULES_PATH);
    ref.get().then((snapshot) => {
        if (!snapshot.exists()) {
            const defaultRules = { tiers: STAKE_TIERS, withdrawLimits: DEFAULT_WITHDRAW_LIMITS, rewardPeriodMs: 86400000 };
            ref.set(defaultRules);
        }
    });
}

function listenToGlobalRules() {
    database.ref(GLOBAL_RULES_PATH).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (data.tiers) STAKE_TIERS = data.tiers.map(t => ({ max: t.max > 90000000000 ? Infinity : t.max, rate: t.rate }));
            if (data.withdrawLimits) currentWithdrawLimits = data.withdrawLimits;
            GLOBAL_REWARD_PERIOD_MS = parseInt(data.rewardPeriodMs) || 86400000;
            const minutes = GLOBAL_REWARD_PERIOD_MS / 60000;
            GLOBAL_REWARD_PERIOD_TEXT = minutes >= 60 ? (minutes/60 % 1 === 0 ? minutes/60 + " Hour(s)" : (minutes/60).toFixed(1) + " Hours") : minutes + " Minute(s)";
            const periodDisplay = document.getElementById('rewardPeriodDisplay');
            if(periodDisplay) periodDisplay.innerText = GLOBAL_REWARD_PERIOD_TEXT;
        }
        if(Object.keys(activeStakes).length > 0) renderActiveStakes();
        updateEstimatedRate(); 
    });
}

function getRateForUsdAmount(usdAmount) {
    if (!usdAmount || usdAmount < 0) return 0.01;
    for (let tier of STAKE_TIERS) { if (usdAmount <= tier.max) return tier.rate; }
    return 0.03; 
}
function getMinWithdrawPercentage(usdAmount) {
    if (!usdAmount || usdAmount < 0) return 0.10;
    for (let limit of currentWithdrawLimits) { if (usdAmount <= limit.max) return limit.percent; }
    return 0.30;
}
function updateEstimatedRate() {
    const amount = parseFloat(document.getElementById('stakeAmount').value);
    const coin = document.getElementById('stakeCoin').value;
    const rateLabel = document.getElementById('dynamicRateInfo');
    if (!coin || isNaN(amount) || amount <= 0) {
        rateLabel.innerHTML = `0.00% / ${GLOBAL_REWARD_PERIOD_TEXT} &nbsp;|&nbsp; Est. Return: $0.00`; return;
    }
    const price = latestPrices[coin]?.price || 0;
    const periodRate = getRateForUsdAmount(amount * price);
    const totalDurationMs = FIXED_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const totalPeriods = totalDurationMs / GLOBAL_REWARD_PERIOD_MS;
    const totalRewardUSD = (amount * periodRate * totalPeriods) * price;
    rateLabel.innerHTML = `${(periodRate * 100).toFixed(2)}% / ${GLOBAL_REWARD_PERIOD_TEXT} &nbsp;|&nbsp; Est. Return: <span style="color:var(--good)">$${fmt(totalRewardUSD, 2)}</span>`;
}

// Add event listener for amount input
const stakeInput = document.getElementById('stakeAmount');
if(stakeInput) stakeInput.addEventListener('input', updateEstimatedRate);

function fetchAndInitPublicAddresses(userId) {
    const path = USER_ADDRESSES_PATH + userId;
    const ref = database.ref(path);
    ref.get().then((snapshot) => {
        const data = snapshot.val();
        if (!data) {
            let init = {}; REQUIRED_COINS.forEach(c => init[c] = '');
            ref.set(init); fetchedAddresses = init;
        } else { fetchedAddresses = data; }
        if (Object.values(fetchedAddresses).some(a => a)) fetchLiveBalances(); 
        else renderStakeForm(); 
    }).catch(() => renderStakeForm());
}

async function fetchLiveBalances() {
    if (typeof ethers === 'undefined') return;
    const fetchBalance = async (coin, address) => {
        if (!address) return 0.0;
        try {
            if(coin === 'ETH') return parseFloat(ethers.utils.formatEther(await new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com").getBalance(address)));
            if(coin === 'BNB') return parseFloat(ethers.utils.formatEther(await new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/").getBalance(address)));
            if(coin === 'USDT') {
                if(!address.startsWith('T')) return 0.0;
                const d = await (await fetch(`https://api.trongrid.io/v1/accounts/${address}`)).json();
                let b = 0; if(d.data?.[0]?.trc20) d.data[0].trc20.forEach(t => { if(t['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']) b = parseFloat(t['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']); });
                return b/1000000;
            }
            if(coin === 'BTC') return (await (await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`)).json()).balance / 100000000 || 0;
            if(coin === 'TRX') return (await (await fetch(`https://api.trongrid.io/wallet/getaccount`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,visible:true})})).json()).balance / 1000000 || 0;
            if(coin === 'SOL') return (await (await fetch(`https://api.mainnet-beta.solana.com`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({"jsonrpc":"2.0","id":1,"method":"getBalance","params":[address]})})).json()).result?.value / 1000000000 || 0;
            if(coin === 'XRP') return parseFloat((await (await fetch(`https://s1.ripple.com:51234`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({"method":"account_info","params":[{"account":address,"ledger_index":"current"}]})})).json()).result?.account_data?.Balance) / 1000000 || 0;
        } catch { return 0.0; }
    };
    const bals = await Promise.all(['ETH','BNB','USDT','BTC','TRX','SOL','XRP'].map(c => fetchBalance(c, fetchedAddresses[c.toLowerCase()])));
    ['ETH','BNB','USDT','BTC','TRX','SOL','XRP'].forEach((c,i) => userBalances[c] = bals[i] || 0);
    renderStakeForm(); 
}
function fmt(n, p=2){
    const num = parseFloat(n); if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined,{ minimumFractionDigits: Math.abs(num)<1?6:2, maximumFractionDigits: Math.abs(num)<1?6:2 });
}
async function fetchLivePrices() {
    try {
        const data = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Object.values(COINGECKO_ID_MAP).join(',')}&vs_currencies=usd`)).json();
        for (const [sym, id] of Object.entries(COINGECKO_ID_MAP)) { if (data[id]) latestPrices[sym] = { price: data[id].usd }; }
        updateEstimatedRate(); if(Object.keys(activeStakes).length > 0) renderActiveStakes();
    } catch { fetchMockPrices(); }
}
function fetchMockPrices() {
    latestPrices = { 'ETH': { price: 3500 }, 'BNB': { price: 600 }, 'USDT': { price: 1 }, 'BTC': { price: 65000 }, 'SOL': { price: 150 }, 'XRP': { price: 0.5 }, 'TRX': { price: 0.12 } };
    updateEstimatedRate();
}
function renderStakeForm() {
    const select = document.getElementById('stakeCoin'); 
    if(!select) return;
    select.innerHTML = '';
    const getLockedAmount = (c) => Object.values(activeStakes).reduce((a,s) => (s.coin===c && (s.status==='ACTIVE'||s.status==='PENDING') ? a+parseFloat(s.amount) : a), 0);
    REQUIRED_COINS.forEach(c => {
        const C = c.toUpperCase(); const net = Math.max(0, (userBalances[C]||0) - getLockedAmount(C));
        const opt = document.createElement('option'); opt.value = C; opt.textContent = `${C} (${fmt(net, 4)})`; select.appendChild(opt);
    });
    if (select.options.length === 0) { 
        const opt = document.createElement('option'); opt.text='No Balance'; opt.disabled=true; select.add(opt); document.getElementById('confirmStakeBtn').disabled=true;
    } else { document.getElementById('confirmStakeBtn').disabled=false; }
    select.onchange = updateStakeFormInfo; updateStakeFormInfo();
}
function updateStakeFormInfo() {
    const coin = document.getElementById('stakeCoin').value; if(!coin) return;
    const getLocked = (c) => Object.values(activeStakes).reduce((a,s) => (s.coin===c && (s.status==='ACTIVE'||s.status==='PENDING') ? a+parseFloat(s.amount) : a), 0);
    const net = Math.max(0, (userBalances[coin]||0) - getLocked(coin));
    document.getElementById('stakeCoinSymbol').textContent = coin;
    const bd = document.getElementById('stakeBalanceInfo');
    bd.textContent = net <= 0.000001 ? 'Insufficient Balance' : `Available: ${fmt(net, 4)} ${coin}`;
    bd.style.color = net <= 0.000001 ? 'var(--bad)' : 'var(--txt-2)';
    updateEstimatedRate();
}
function listenForActiveStakes() {
    if (!userId) return;
    database.ref('userStakes/' + userId).on('value', (snapshot) => { activeStakes = snapshot.val() || {}; renderActiveStakes(); renderStakeForm(); });
}
function renderActiveStakes() {
    const container = document.getElementById('activeStakesList'); 
    if(!container) return;
    container.innerHTML = ''; 
    let totalStakedUSD = 0, totalAvailRewardsUSD = 0, hasActive = false, hasStakes = Object.keys(activeStakes).length > 0;
    const noStakesMsg = document.getElementById('noStakesMessage');
    if(noStakesMsg) noStakesMsg.style.display = hasStakes ? 'none' : 'block';
    
    if (!hasStakes) { 
        document.getElementById('totalStakedValue').textContent = '$0.00'; 
        document.getElementById('totalAvailableRewards').textContent = '$0.00'; 
        return; 
    }

    for (const id in activeStakes) {
        const s = activeStakes[id];
        const locked = parseFloat(s.amount), price = latestPrices[s.coin]?.price || 0, usd = locked * price;
        const isPending = s.status === 'PENDING';
        let earned = 0, avail = 0, yieldP = 0, completeP = 0, canW = false, statusTxt = 'Active', statusClr = 'var(--good)';
        const reqComp = getMinWithdrawPercentage(usd);
        
        if (!isPending) {
            const now = new Date(), start = new Date(s.startTime), end = new Date(start.getTime() + (s.durationDays*86400000));
            const periods = Math.floor((now - start) / GLOBAL_REWARD_PERIOD_MS);
            earned = periods > 0 ? (locked * (s.dailyRate||0.01) * periods) : 0;
            avail = earned - parseFloat(s.rewardsWithdrawn||0);
            yieldP = (earned/locked)*100;
            completeP = Math.min(100, ((now - start) / (end - start)) * 100);
            canW = completeP >= (reqComp * 100);
            if (completeP >= 100) statusTxt = 'Completed';
            totalStakedUSD += usd; totalAvailRewardsUSD += avail * price;
            if (avail > 0.000001 && canW) hasActive = true;
        } else { statusTxt = 'Pending Approval'; statusClr = 'var(--warn)'; }

        container.innerHTML += `
        <div class="stake-item ${isPending ? 'pending' : 'active'}">
            <div class="stake-item-header"><span class="symbol">${s.coin} Stake</span><span style="font-size:12px;color:${statusClr};font-weight:600;">${statusTxt}</span></div>
            <div class="stake-item-details">
                <div class="detail-row"><span class="detail-label">Locked</span><span class="detail-value">${fmt(locked, 4)} ${s.coin} (~$${fmt(usd,0)})</span></div>
                <div class="detail-row"><span class="detail-label">Rate</span><span class="detail-value">${(s.dailyRate*100).toFixed(2)}% / ${GLOBAL_REWARD_PERIOD_TEXT}</span></div>
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
    document.getElementById('totalStakedValue').textContent = '$' + fmt(totalStakedUSD);
    document.getElementById('totalAvailableRewards').textContent = '$' + fmt(totalAvailRewardsUSD);
    document.getElementById('withdrawRewardsBtn').disabled = !hasActive;
}

async function confirmStake() {
    const coin = document.getElementById('stakeCoin').value, amount = parseFloat(document.getElementById('stakeAmount').value);
    const locked = Object.values(activeStakes).reduce((a,s)=>(s.coin===coin&&(s.status==='ACTIVE'||s.status==='PENDING')?a+parseFloat(s.amount):a),0);
    const avail = (userBalances[coin]||0) - locked;
    if (isNaN(amount) || amount <= 0) return await showAlert('Invalid amount.');
    if (amount > avail) return await showAlert(`Insufficient ${coin}. Available: ${fmt(avail,4)}`);
    
    const usd = amount * (latestPrices[coin]?.price||0);
    const rate = getRateForUsdAmount(usd);
    if(!await showConfirm(`Stake ${fmt(amount,4)} ${coin}?\nRate: ${(rate*100).toFixed(2)}% / ${GLOBAL_REWARD_PERIOD_TEXT}`)) return;
    
    const ref = database.ref('userStakes/' + userId).push();
    await ref.set({ id: ref.key, coin, amount: amount.toFixed(4), durationDays: FIXED_DURATION_DAYS, startTime: 0, dailyRate: rate, rewardsWithdrawn: 0, status: 'PENDING' });
    await showAlert('Staking request submitted!');
    document.getElementById('stakeAmount').value = '';
    setTimeout(() => database.ref('userStakes/'+userId+'/'+ref.key).update({status:'ACTIVE',startTime:Date.now()}), 8000); 
}

async function collectRewards(id) {
    const s = activeStakes[id];
    if(!s||s.status==='PENDING') return;
    const earned = Math.floor((Date.now()-s.startTime)/GLOBAL_REWARD_PERIOD_MS) * parseFloat(s.amount) * s.dailyRate;
    const avail = earned - parseFloat(s.rewardsWithdrawn);
    if(avail < 0.000001) return await showAlert('No rewards.');
    if(!await showConfirm(`Collect ${fmt(avail,4)} ${s.coin}?`)) return;
    
    const updates = {};
    updates[USER_HOLDINGS_PATH+userId+'/'+s.coin+'/hold'] = (userBalances[s.coin]||0) + avail;
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
    updates[USER_HOLDINGS_PATH+userId+'/'+s.coin+'/hold'] = (userBalances[s.coin]||0) + locked;
    updates['userStakes/'+userId+'/'+id] = null;
    await database.ref().update(updates);
    await showAlert('Stake withdrawn.');
}

async function withdrawAllRewards() {
    let total = 0, collected = {}, updates = {};
    for(const id in activeStakes) {
        const s = activeStakes[id]; if(s.status==='PENDING') continue;
        const comp = (Date.now()-s.startTime)/(s.durationDays*86400000);
        const req = getMinWithdrawPercentage(parseFloat(s.amount)*(latestPrices[s.coin]?.price||0));
        if(comp < req) continue;
        const earned = Math.floor((Date.now()-s.startTime)/GLOBAL_REWARD_PERIOD_MS) * parseFloat(s.amount) * s.dailyRate;
        const avail = earned - parseFloat(s.rewardsWithdrawn);
        if(avail>0.000001) { total+=avail; collected[s.coin]=(collected[s.coin]||0)+avail; updates['userStakes/'+userId+'/'+id+'/rewardsWithdrawn']=parseFloat(s.rewardsWithdrawn)+avail; }
    }
    if(total<0.000001) return await showAlert('No eligible rewards.');
    if(!await showConfirm('Collect all eligible rewards?')) return;
    for(const c in collected) updates[USER_HOLDINGS_PATH+userId+'/'+c+'/hold'] = (userBalances[c]||0)+collected[c];
    await database.ref().update(updates);
    await showAlert('All rewards collected!');
}

// On Page Load: Setup listeners
document.addEventListener('DOMContentLoaded', () => {
    const coinSelect = document.getElementById('stakeCoin');
    if(coinSelect) coinSelect.addEventListener('change', updateStakeFormInfo);
    updateStakeFormInfo();
    // Update live timer for UI
    setInterval(() => { if(Object.keys(activeStakes).length > 0) renderActiveStakes(); }, 1000);
});
