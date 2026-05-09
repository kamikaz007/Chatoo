// chatoo-actions.js - Cinematic UI Web3 + عقد عائمة حقيقية + محفظة Pi حقيقية
// المسؤول: Kamikaz007

const PI_HORIZONS = [
    "https://api.mainnet.minepi.com",
    "https://horizon.minepi.com"
];

class ChatooActions {
    constructor() {
        this.state = {
            room: null,
            id: 'Koukiz007_' + Math.random().toString(36).substring(2, 8),
            nodesVisible: true,
            userLocation: null,
            nearbyVenues: [],
            lastFetchTime: 0
        };
        this.venueIcons = {
            cafe: ['☕', '🍵', '🧋', '🫖'],
            restaurant: ['🍽️', '🥘', '🍜', '🍝', '🥗'],
            bar: ['🍹', '🍸', '🥂', '🍺'],
            hotel: ['🏨', '🏩', '🛎️', '🏢'],
            fast_food: ['🍔', '🍕', '🌭', '🍟'],
            bakery: ['🥐', '🍞', '🥖', '🧁'],
            default: ['📍', '🏠', '⚡', '🏛️']
        };
        this.fetchInterval = null;
        this.initCinematicUI();
    }

    initCinematicUI() {
        console.log("🚀 Chatoo UI - Real Venue Nodes Initializing...");
        this.injectCinematicStyles();
        this.setupCustomNavButtons();
        this.startLocationTracking();
        buildWalletModal();

        if (window.chatooNotif) {
            window.chatooNotif.systemAlert('واجهة Chatoo السينمائية نشطة');
        }
    }

    // ═══════════════════ تتبع الموقع ═══════════════════
    startLocationTracking() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => this._onLocationUpdate(pos),
                () => this._useDefaultLocation(),
                { enableHighAccuracy: true, timeout: 15000 }
            );

            this.fetchInterval = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => this._onLocationUpdate(pos),
                    () => {},
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            }, 30000);
        } else {
            this._useDefaultLocation();
        }
    }

    _onLocationUpdate(position) {
        const { latitude, longitude } = position.coords;
        const oldLat = this.state.userLocation?.lat;
        const oldLon = this.state.userLocation?.lon;

        if (!oldLat || !oldLon ||
            this._calculateDistance(oldLat, oldLon, latitude, longitude) > 100 ||
            Date.now() - this.state.lastFetchTime > 60000) {

            this.state.userLocation = { lat: latitude, lon: longitude };
            this._fetchNearbyVenues(latitude, longitude);
        }
    }

    _useDefaultLocation() {
        this.state.userLocation = { lat: 33.8869, lon: 9.5375 };
        this._fetchNearbyVenues(33.8869, 9.5375);
    }

    _calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    async _fetchNearbyVenues(lat, lon) {
        console.log(`📍 جلب الأماكن القريبة من ${lat.toFixed(4)}, ${lon.toFixed(4)}...`);

        const query = `[out:json];
            node["amenity"~"cafe|restaurant|bar|fast_food|pub|hotel|bakery"]
            (around:${CHATOO_CONFIG.map.searchRadius},${lat},${lon});
            out body 12;`;

        try {
            const response = await fetch(
                `${CHATOO_CONFIG.map.overpassEndpoint}?data=${encodeURIComponent(query)}`
            );

            if (!response.ok) throw new Error('Overpass API failed');

            const data = await response.json();

            if (data.elements && data.elements.length > 0) {
                this.state.nearbyVenues = data.elements
                    .filter(v => v.tags && v.tags.name)
                    .slice(0, 8)
                    .map(v => ({
                        name: v.tags.name,
                        type: v.tags.amenity || 'default',
                        lat: v.lat,
                        lon: v.lon,
                        status: this._determineStatus(v.tags),
                        address: v.tags['addr:street'] || v.tags['addr:city'] || '',
                        openingHours: v.tags.opening_hours || '',
                        phone: v.tags.phone || '',
                        website: v.tags.website || ''
                    }));

                this.state.lastFetchTime = Date.now();
                this.renderFloatingNodes();

                console.log(`✅ تم جلب ${this.state.nearbyVenues.length} مكاناً قريباً`);

                if (window.chatooNotif && this.state.nearbyVenues.length > 0) {
                    window.chatooNotif.toast(
                        `📍 تم العثور على ${this.state.nearbyVenues.length} أماكن قريبة`
                    );
                }

                if (typeof chatoo !== 'undefined') {
                    chatoo.updateRadarStrip();
                    chatoo.updateMarquee();
                }

            } else {
                this._useDefaultVenues();
            }
        } catch (error) {
            console.warn('⚠️ Overpass API failed:', error.message);
            this._useDefaultVenues();
        }
    }

    _determineStatus(tags) {
        const hour = new Date().getHours();
        if (tags.opening_hours) {
            return (hour >= 8 && hour <= 23) ? 'active' : 'inactive';
        }
        const statuses = ['active', 'live', 'active', 'active', 'active'];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    _useDefaultVenues() {
        this.state.nearbyVenues = [
            { name: "Haj Mostapha", type: "restaurant", lat: 36.8665, lon: 10.1647, status: "active" },
            { name: "Salle Des Fêtes Hawa", type: "cafe", lat: 36.8000, lon: 10.1800, status: "active" },
            { name: "Café Bizerte", type: "cafe", lat: 37.2744, lon: 9.8739, status: "live" },
            { name: "Restaurant El Manâr", type: "restaurant", lat: 36.8500, lon: 10.2100, status: "active" },
            { name: "Central Node", type: "bar", lat: 36.8065, lon: 10.1815, status: "sync" },
            { name: "Node 007", type: "cafe", lat: 36.8200, lon: 10.1900, status: "active" }
        ];
        this.renderFloatingNodes();

        if (typeof chatoo !== 'undefined') {
            chatoo.updateRadarStrip();
            chatoo.updateMarquee();
        }
    }

    // ═══════════════════ CSS ═══════════════════
    injectCinematicStyles() {
        if (document.getElementById('chatoo-cinematic-css')) return;
        const style = document.createElement('style');
        style.id = 'chatoo-cinematic-css';
        style.innerHTML = `
            .floating-node {
                position: fixed;
                width: 90px; height: 90px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 35%, rgba(130,87,229,0.35), rgba(9,9,11,0.92) 70%);
                border: 1.5px solid rgba(255,215,0,0.6);
                box-shadow: 0 0 18px rgba(255,215,0,0.25), inset 0 0 12px rgba(130,87,229,0.2);
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                gap: 3px; color: #fff; cursor: pointer;
                z-index: 400; backdrop-filter: blur(8px);
                transition: all 0.3s ease;
                will-change: transform;
                touch-action: none; user-select: none;
            }
            .floating-node::before {
                content: ''; position: absolute; inset: -4px;
                border-radius: 50%;
                border: 1px solid rgba(255,215,0,0.2);
                animation: ringPulse 3s ease-in-out infinite;
            }
            .floating-node::after {
                content: ''; position: absolute; inset: -10px;
                border-radius: 50%;
                border: 1px solid rgba(130,87,229,0.15);
                animation: ringPulse 3s ease-in-out infinite 1.5s;
            }
            @keyframes ringPulse {
                0%, 100% { transform: scale(1); opacity: 0.6; }
                50% { transform: scale(1.15); opacity: 0; }
            }
            .floating-node:hover, .floating-node:active {
                border-color: #fff;
                box-shadow: 0 0 35px rgba(255,215,0,0.6),
                            0 0 60px rgba(130,87,229,0.3),
                            inset 0 0 20px rgba(255,215,0,0.1);
                transform: scale(1.08);
            }
            .node-icon { font-size: 22px; line-height: 1; filter: drop-shadow(0 0 6px rgba(255,215,0,0.5)); }
            .node-name {
                font-size: 8px; font-weight: 700; text-align: center;
                padding: 0 4px; white-space: nowrap; overflow: hidden;
                text-overflow: ellipsis; max-width: 80px;
                color: #ffd700; letter-spacing: 0.3px;
            }
            .node-status {
                font-size: 7px; color: #00FF88;
                font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
            }
            .fn-0 { animation: float0 7s ease-in-out infinite; }
            .fn-1 { animation: float1 9s ease-in-out infinite; }
            .fn-2 { animation: float2 8s ease-in-out infinite; }
            .fn-3 { animation: float3 10s ease-in-out infinite; }
            .fn-4 { animation: float4 6.5s ease-in-out infinite; }
            .fn-5 { animation: float5 11s ease-in-out infinite; }
            .fn-6 { animation: float6 8.5s ease-in-out infinite; }
            .fn-7 { animation: float7 9.5s ease-in-out infinite; }
            @keyframes float0 { 0%,100%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(8px,-14px) rotate(2deg)} 50%{transform:translate(-5px,-8px) rotate(-1deg)} 75%{transform:translate(10px,6px) rotate(1.5deg)} }
            @keyframes float1 { 0%,100%{transform:translate(0,0) rotate(0deg)} 30%{transform:translate(-12px,-10px) rotate(-2deg)} 60%{transform:translate(7px,-18px) rotate(1deg)} 80%{transform:translate(-4px,8px) rotate(-1deg)} }
            @keyframes float2 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(14px,-6px) rotate(2deg)} 55%{transform:translate(-8px,-16px) rotate(-1.5deg)} 80%{transform:translate(5px,10px) rotate(1deg)} }
            @keyframes float3 { 0%,100%{transform:translate(0,0) rotate(0deg)} 35%{transform:translate(-10px,12px) rotate(-2deg)} 65%{transform:translate(12px,-10px) rotate(2deg)} }
            @keyframes float4 { 0%,100%{transform:translate(0,0)} 40%{transform:translate(10px,-12px) rotate(1.5deg)} 70%{transform:translate(-14px,6px) rotate(-2deg)} }
            @keyframes float5 { 0%,100%{transform:translate(0,0) rotate(0deg)} 30%{transform:translate(-6px,-18px) rotate(-1deg)} 60%{transform:translate(12px,8px) rotate(2deg)} 85%{transform:translate(-8px,-4px) rotate(-1.5deg)} }
            @keyframes float6 { 0%,100%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(-15px,-5px) rotate(3deg)} 50%{transform:translate(3px,-12px) rotate(-2deg)} 75%{transform:translate(12px,8px) rotate(1deg)} }
            @keyframes float7 { 0%,100%{transform:translate(0,0) rotate(0deg)} 35%{transform:translate(8px,-16px) rotate(-3deg)} 65%{transform:translate(-10px,14px) rotate(2deg)} }
            .node-ripple {
                position: fixed; border-radius: 50%;
                border: 2px solid rgba(255,215,0,0.8);
                pointer-events: none; z-index: 9999;
                animation: nodeRippleAnim 0.6s ease-out forwards;
            }
            @keyframes nodeRippleAnim {
                0%   { transform: scale(0.5); opacity: 1; }
                100% { transform: scale(3); opacity: 0; }
            }
            .wallet-container {
                background: rgba(9,9,11,0.98); border-radius: 28px;
                width: 90%; max-width: 400px; padding: 24px 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(130,87,229,0.2);
                color: #fff; text-align: center; max-height: 80vh; overflow-y: auto;
            }
            .wallet-btn {
                background: var(--primary); border: none; color: #fff;
                padding: 12px 18px; border-radius: 14px;
                font-weight: bold; cursor: pointer; font-size: 14px;
                margin: 6px; transition: all 0.2s;
            }
            .wallet-btn:hover { opacity: 0.9; transform: scale(1.02); }
            .wallet-btn.gold { background: linear-gradient(135deg, #ffd700, #ffb800); color: #000; }
            .tx-row {
                display: flex; justify-content: space-between;
                padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
                font-size: 13px;
            }
        `;
        document.head.appendChild(style);
    }

    setupCustomNavButtons() {
        console.log('✅ Nav buttons ready in HTML');
    }

    renderFloatingNodes() {
        document.querySelectorAll('.floating-node').forEach(el => el.remove());

        const venues = this.state.nearbyVenues;
        if (!venues || venues.length === 0) return;

        const safeZoneTop = 130;
        const safeZoneBottom = 140;
        const nodeSize = 95;
        const usableH = window.innerHeight - safeZoneTop - safeZoneBottom - nodeSize;
        const usableW = window.innerWidth - nodeSize - 16;

        const placed = [];
        const minDist = 110;

        venues.forEach((venue, index) => {
            const el = document.createElement('div');
            el.className = `floating-node fn-${index % 8}`;

            const icons = this.venueIcons[venue.type] || this.venueIcons.default;
            const icon = icons[index % icons.length];

            const venueId = venue.name.toLowerCase().replace(/\s+/g, '_');
            const owner = window.chatooAdmin?.venueOwners?.[venueId] || '';

            el.innerHTML = `
                <div class="node-icon">${icon}</div>
                <div class="node-name">${venue.name}</div>
                <div class="node-status">${venue.status.toUpperCase()}</div>
                ${owner ? `<div style="font-size:6px;color:rgba(255,215,0,0.5);">👤 ${owner}</div>` : ''}
            `;

            let x, y, tries = 0;
            do {
                x = Math.floor(Math.random() * usableW) + 8;
                y = Math.floor(Math.random() * usableH) + safeZoneTop;
                tries++;
            } while (tries < 60 && placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist));
            placed.push({ x, y });

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.animationDelay = `${(index * 0.7).toFixed(1)}s`;

            el.addEventListener('click', (e) => {
                this._nodeRipple(e);
                this._openNodeChat(venue.name, owner);
            });

            document.body.appendChild(el);
        });
    }

    _nodeRipple(e) {
        const r = document.createElement('div');
        r.className = 'node-ripple';
        r.style.cssText = `left:${e.clientX - 45}px;top:${e.clientY - 45}px;width:90px;height:90px;`;
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 650);
    }

    _openNodeChat(venueName, ownerName) {
        if (typeof chatoo !== 'undefined' && chatoo.openChat) {
            if (ownerName) sessionStorage.setItem(`venue_owner_${venueName}`, ownerName);
            chatoo.openChat(venueName);
            if (window.chatooAchievements) window.chatooAchievements.trackVenueVisit();
        } else {
            Swal.fire({
                title: `⚡ ${venueName}`,
                text: ownerName ? `المالك: ${ownerName}` : 'جاري الاتصال بالعقدة...',
                background: "#121214", color: "#fff",
                confirmButtonColor: "#ffd700",
                timer: 2000, timerProgressBar: true
            });
        }
    }
}

// ═══════════════════ المحفظة الكاملة ═══════════════════

// عنوان محفظة التطبيق الرئيسية (لاستقبال المدفوعات)
const APP_WALLET_ADDRESS = "GB5ULFHVOO3RQUEHTQGSEYMDUXDCCIL6ITPSH6F7RCR7JKIGQSUAO5SL";

async function buildWalletModal() {
    if (document.getElementById("wallet-modal")) return;

    const modal = document.createElement("div");
    modal.id = "wallet-modal";
    modal.style.cssText = `
        position:fixed; inset:0; z-index:9000;
        background:rgba(0,0,0,0.92); backdrop-filter:blur(22px);
        display:none; align-items:center; justify-content:center;
    `;

    const container = document.createElement("div");
    container.className = "wallet-container";

    const closeBtn = document.createElement("div");
    closeBtn.style.cssText = "text-align:right; cursor:pointer; font-size:22px; margin-bottom:8px;";
    closeBtn.innerHTML = "✕";
    closeBtn.onclick = () => modal.style.display = "none";

    const header = document.createElement("div");
    header.style.cssText = "margin-bottom: 20px;";
    header.innerHTML = `
        <h2 style="margin:0; color:var(--gold);">💳 محفظة Pi</h2>
        <small style="opacity:0.7;">Testnet Wallet</small>
    `;

    const balanceCard = document.createElement("div");
    balanceCard.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 20px; padding: 20px; margin-bottom: 20px;
        border: 1px solid rgba(255,215,0,0.2);
    `;
    balanceCard.innerHTML = `
        <div style="font-size:40px; font-weight:900; color:#ffd700;" id="wallet-pi-balance">-- π</div>
        <div style="opacity:0.7; margin-top:4px;">الرصيد</div>
        <div style="margin-top:12px; display:flex; gap:10px; justify-content:center;">
            <div style="flex:1; background:rgba(255,255,255,0.05); border-radius:12px; padding:8px;">
                <span id="wallet-xp-balance">0</span> XP
            </div>
            <div style="flex:1; background:rgba(255,255,255,0.05); border-radius:12px; padding:8px;">
                <span id="wallet-address-short">G...</span>
            </div>
        </div>
        <button class="wallet-btn" id="wallet-refresh-btn" style="margin-top:12px;">🔄 تحديث الرصيد</button>
    `;

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-bottom:20px;";
    actions.innerHTML = `
        <button class="wallet-btn gold" id="wallet-send-btn">📤 إرسال Pi</button>
        <button class="wallet-btn" id="wallet-receive-btn">📥 استلام</button>
        <button class="wallet-btn" id="wallet-scan-btn">📷 مسح QR</button>
    `;

    const txSection = document.createElement("div");
    txSection.innerHTML = `
        <h4 style="margin:0 0 12px 0; text-align:right;">📜 آخر المعاملات</h4>
        <div id="wallet-tx-list" style="max-height:180px; overflow-y:auto; text-align:right;">
            <small style="opacity:0.5;">لا توجد معاملات</small>
        </div>
    `;

    container.appendChild(closeBtn);
    container.appendChild(header);
    container.appendChild(balanceCard);
    container.appendChild(actions);
    container.appendChild(txSection);
    modal.appendChild(container);
    document.body.appendChild(modal);

    document.getElementById("wallet-refresh-btn").onclick = updateWalletBalance;
    document.getElementById("wallet-send-btn").onclick = walletSendPi;
    document.getElementById("wallet-receive-btn").onclick = walletReceivePi;
    document.getElementById("wallet-scan-btn").onclick = walletScanQR;

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
}

async function updateWalletBalance() {
    const balanceEl = document.getElementById("wallet-pi-balance");
    const addressEl = document.getElementById("wallet-address-short");
    if (balanceEl) balanceEl.innerText = "-- π";

    let address = sessionStorage.getItem("pi_address");
    if (!address && window.chatooAuth?.isPiAuthenticated() && window.chatooBlock) {
        try {
            if (typeof Pi !== 'undefined') {
                const auth = await Pi.authenticate(['username', 'payments'], () => {});
                if (auth?.user?.wallet_address) {
                    address = auth.user.wallet_address;
                    sessionStorage.setItem("pi_address", address);
                }
            }
        } catch (e) {
            console.warn("فشل في جلب العنوان:", e);
        }
    }

    if (!address) {
        if (balanceEl) balanceEl.innerText = "غير متصل";
        Swal.fire({
            title: '⚠️ لا يوجد عنوان',
            text: 'الرجاء تسجيل الدخول بمتصفح Pi أو إكمال المصادقة.',
            icon: 'warning',
            background: "#121214",
            color: "#fff"
        });
        return;
    }

    if (addressEl) addressEl.innerText = address.substring(0, 12) + "...";

    if (window.chatooBlock && typeof chatooBlock.getAccountBalance === 'function') {
        try {
            const result = await chatooBlock.getAccountBalance(address);
            if (balanceEl) {
                balanceEl.innerText = result.balance.toFixed(2) + " π";
            }
        } catch (e) {
            console.warn("تعذر جلب الرصيد:", e);
            if (balanceEl) balanceEl.innerText = "فشل";
        }
    } else {
        if (balanceEl) balanceEl.innerText = "غير متاح";
    }
}

function walletSendPi() {
    Swal.fire({
        title: '💎 تحويل Pi (Testnet)',
        html: `
            <div style="text-align:right;color:#fff;">
                <label style="color:#ffd700;">📥 عنوان المستلم (Wallet Address):</label>
                <input id="swal-recipient" type="text" placeholder="G..."
                    style="width:100%;padding:12px;background:#1a1a1d;color:#fff;
                    border:1px solid rgba(255,215,0,0.2);border-radius:12px;
                    margin:8px 0;direction:ltr;font-family:monospace;font-size:11px;">
                <label style="color:#ffd700;">💰 الكمية:</label>
                <input id="swal-amount" type="number" step="0.01" min="0.01" placeholder="0.00"
                    style="width:100%;padding:12px;background:#1a1a1d;color:#fff;
                    border:1px solid rgba(255,215,0,0.2);border-radius:12px;
                    margin:8px 0;direction:ltr;">
                <label style="color:#ffd700;">📝 ملاحظة:</label>
                <input id="swal-memo" placeholder="Chatoo"
                    style="width:100%;padding:12px;background:#1a1a1d;color:#fff;
                    border:1px solid rgba(255,215,0,0.2);border-radius:12px;
                    margin:8px 0;direction:rtl;">
                <p style="font-size:10px;opacity:0.5;text-align:center;">⚠️ Test-Pi فقط</p>
            </div>
        `,
        background: "#121214",
        color: "#fff",
        showCancelButton: true,
        confirmButtonText: "💸 دفع",
        confirmButtonColor: "#ffd700",
        cancelButtonText: "إلغاء",
        preConfirm: () => {
            const recipient = document.getElementById('swal-recipient').value.trim();
            const amount = parseFloat(document.getElementById('swal-amount').value);
            const memo = document.getElementById('swal-memo').value || 'Chatoo';

            if (!recipient || !recipient.startsWith('G') || recipient.length !== 56) {
                Swal.showValidationMessage('عنوان محفظة غير صحيح (يبدأ بـ G ويتكون من 56 حرف)');
                return false;
            }
            if (!amount || amount <= 0) {
                Swal.showValidationMessage('كمية غير صحيحة');
                return false;
            }
            return { recipient, amount, memo };
        }
    }).then(r => {
        if (r.isConfirmed && window.chatooBlock) {
            window.chatooBlock.doPayment(r.value.recipient, r.value.amount, r.value.memo);
        }
    });
}

function walletReceivePi() {
    Swal.fire({
        title: "📥 استلام Pi",
        html: `
            <div style="background:#1a1a2e; padding:16px; border-radius:12px; word-break:break-all;">
                <p style="opacity:0.7; margin:0;">عنوان محفظة التطبيق:</p>
                <code style="color:#ffd700; font-size:14px;">${APP_WALLET_ADDRESS}</code>
            </div>
            <p style="margin-top:12px; opacity:0.7;">أرسل Pi إلى هذا العنوان من محفظة Pi الخاصة بك</p>
        `,
        background: "#121214",
        color: "#fff",
        confirmButtonText: "نسخ العنوان",
    }).then((result) => {
        if (result.isConfirmed) {
            navigator.clipboard.writeText(APP_WALLET_ADDRESS).then(() => {
                Swal.fire({ title: "تم النسخ", icon: "success", timer: 1000, showConfirmButton: false });
            });
        }
    });
}

function walletScanQR() {
    Swal.fire({
        title: "مسح QR",
        text: "ميزة قادمة قريباً...",
        icon: "info",
        background: "#121214",
        color: "#fff"
    });
}

function openWallet() {
    const modal = document.getElementById("wallet-modal");
    if (!modal) return;

    const xpEl = document.getElementById("wallet-xp-balance");
    if (xpEl) {
        const xp = localStorage.getItem("chatoo_xp") || "0";
        xpEl.innerText = xp;
    }

    const txList = document.getElementById("wallet-tx-list");
    if (txList && window.chatooBlock?.transactionHistory) {
        const txs = window.chatooBlock.transactionHistory;
        if (txs.length === 0) {
            txList.innerHTML = "<small style='opacity:0.5;'>لا توجد معاملات</small>";
        } else {
            txList.innerHTML = txs.slice(0, 10).map(tx => `
                <div class="tx-row">
                    <span>${tx.type || '📤'} ${(tx.to || tx.recipient || '').substring(0, 8)}...</span>
                    <span style="color:#ffd700">${tx.amount} π</span>
                    <small style="opacity:0.5;">${new Date(tx.timestamp).toLocaleDateString('ar')}</small>
                </div>
            `).join('');
        }
    }

    updateWalletBalance();
    modal.style.display = "flex";
}

// تهيئة النظام
window.chatooActions = null;
document.addEventListener('DOMContentLoaded', () => {
    window.chatooActions = new ChatooActions();
    console.log('🌐 Chatoo Actions Initialized with Full Real Pi Wallet');
});
