// chatoo-admin.js - لوحة تحكم المالك Kamikaz007
// المسؤول: Kamikaz007

class ChatooAdmin {
    constructor() {
        this.adminUsername = CHATOO_CONFIG.app.admin; // "kamikaz007"
        this.venueOwners = {
            'haj_mostapha': 'Haj Mostapha',
            'café_bizerte': 'Café Bizerte',
            'restaurant_el_manâr': 'Restaurant El Manâr',
            'salle_des_fêtes_hawa': 'Salle Des Fêtes Hawa',
            'central_node': 'Central Node',
            'node_007': 'Node 007'
        };
        
        this.init();
    }

    init() {
        console.log('👑 Admin Module Ready');
        this._monitorAdminAccess();
    }

    _monitorAdminAccess() {
        // التأكد من إخفاء زر المدير إذا لم يكن هو
        setInterval(() => {
            if (window.chatooAuth && !window.chatooAuth.checkAdmin()) {
                const btn = document.getElementById('btn-admin-panel');
                if (btn) btn.style.display = 'none';
            }
            if (window.chatooAuth && window.chatooAuth.checkAdmin()) {
                const btn = document.getElementById('btn-admin-panel');
                if (btn) btn.style.display = 'flex';
            }
        }, 1000);
    }

    showPanel() {
        if (!window.chatooAuth || !window.chatooAuth.checkAdmin()) {
            Swal.fire({
                title: '⛔ غير مصرح',
                text: 'هذه اللوحة خاصة بـ Kamikaz007 فقط',
                icon: 'error',
                background: "#121214",
                color: "#fff"
            });
            return;
        }

        const currentPrices = SHOP_CONFIG.products.map(p => ({
            id: p.id,
            name: p.nameAr,
            price: p.price,
            active: p.active
        }));

        let productsHtml = currentPrices.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;
                background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:12px;margin:6px 0;">
                <div style="flex:1;text-align:right;">
                    <span style="font-size:13px;color:#fff;">${p.name}</span>
                    <br><small style="opacity:0.5;">${p.id}</small>
                </div>
                <input type="number" step="0.1" value="${p.price}" id="admin-price-${p.id}"
                    style="width:70px;background:#1a1a1d;color:#ffd700;border:1px solid rgba(255,215,0,0.3);
                    border-radius:8px;padding:6px;text-align:center;margin:0 10px;">
                <span style="color:#ffd700;font-weight:bold;">π</span>
                <button onclick="window.chatooAdmin.setActive('${p.id}', ${!p.active})" 
                    style="margin:0 6px;padding:4px 10px;border-radius:8px;border:none;cursor:pointer;
                    background:${p.active ? '#00ff8822' : '#ff475722'};color:${p.active ? '#00ff88' : '#ff4757'};">
                    ${p.active ? 'نشط' : 'معطل'}
                </button>
            </div>
        `).join('');

        Swal.fire({
            title: '⚙️ لوحة تحكم Kamikaz007',
            html: `
                <div style="text-align:right;color:#fff;">
                    <h4 style="color:#ffd700;margin-bottom:8px;">تعديل أسعار المنتجات</h4>
                    <p style="font-size:11px;opacity:0.5;">عدّل السعر مباشرة ثم احفظ التغييرات</p>
                    <div style="max-height:50vh;overflow-y:auto;margin:12px 0;">
                        ${productsHtml}
                    </div>
                    <small style="opacity:0.4;">التغييرات تنطبق فوراً على المتجر</small>
                </div>
            `,
            background: "#121214",
            color: "#fff",
            showCancelButton: true,
            confirmButtonText: '💾 حفظ التغييرات',
            confirmButtonColor: '#ffd700',
            cancelButtonText: 'إغلاق',
            preConfirm: () => {
                const updated = [];
                SHOP_CONFIG.products.forEach(p => {
                    const input = document.getElementById(`admin-price-${p.id}`);
                    if (input) {
                        const newPrice = parseFloat(input.value);
                        if (!isNaN(newPrice) && newPrice >= 0) {
                            updated.push({ id: p.id, price: newPrice });
                        }
                    }
                });
                return updated;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                result.value.forEach(update => {
                    const product = SHOP_CONFIG.products.find(p => p.id === update.id);
                    if (product) {
                        product.price = update.price;
                    }
                });
                
                // حفظ في localStorage للاستمرار
                localStorage.setItem('chatoo_custom_prices', JSON.stringify(
                    SHOP_CONFIG.products.map(p => ({ id: p.id, price: p.price, active: p.active }))
                ));
                
                // تحديث واجهة المتجر
                if (window.chatoo) {
                    window.chatoo.renderShopProducts();
                }
                
                Swal.fire({
                    title: '✅ تم الحفظ',
                    text: 'الأسعار الجديدة نافذة الآن',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: "#121214",
                    color: "#fff"
                });
            }
        });
    }

    setActive(productId, active) {
        if (!window.chatooAuth || !window.chatooAuth.checkAdmin()) return;
        
        const product = SHOP_CONFIG.products.find(p => p.id === productId);
        if (product) {
            product.active = active;
            localStorage.setItem('chatoo_custom_prices', JSON.stringify(
                SHOP_CONFIG.products.map(p => ({ id: p.id, price: p.price, active: p.active }))
            ));
            if (window.chatoo) window.chatoo.renderShopProducts();
            this.showPanel(); // إعادة فتح اللوحة لتحديث المشهد
        }
    }

    loadCustomPrices() {
        const saved = localStorage.getItem('chatoo_custom_prices');
        if (saved) {
            try {
                const custom = JSON.parse(saved);
                custom.forEach(c => {
                    const product = SHOP_CONFIG.products.find(p => p.id === c.id);
                    if (product) {
                        product.price = c.price;
                        if (c.active !== undefined) product.active = c.active;
                    }
                });
            } catch (e) {}
        }
    }
}

// تهيئة
window.chatooAdmin = null;
document.addEventListener('DOMContentLoaded', () => {
    window.chatooAdmin = new ChatooAdmin();
    window.chatooAdmin.loadCustomPrices();
    console.log('👑 Admin Panel Ready for Kamikaz007');
});
