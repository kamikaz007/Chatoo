// chatoo-blockchain.js – FINAL PAYMENT FIX
// المسؤول: Kamikaz007

class ChatooBlockchain {
    constructor() {
        this.sdkReady = false;
        this.transactionHistory = JSON.parse(
            localStorage.getItem('chatoo_tx_history') || '[]'
        );
    }

    initSDK() {
        if (typeof Pi !== 'undefined' && !this.sdkReady) {
            Pi.init({ version: "2.0", sandbox: true });
            this.sdkReady = true;
            console.log('✅ Pi SDK Ready');
        }
    }

    renderTransferModal() {
        this.initSDK();

        Swal.fire({
            title: '💎 تحويل Pi (Testnet)',
            html: `
                <div style="text-align:right;color:#fff;">
                    <label style="color:#ffd700;">📥 عنوان المستلم (Wallet Address):</label>
                    <input id="bc-recipient" type="text" placeholder="G..."
                        style="width:100%;padding:12px;background:#1a1a1d;color:#fff;
                        border:1px solid rgba(255,215,0,0.2);border-radius:12px;
                        margin:8px 0;direction:ltr;font-family:monospace;font-size:11px;">
                    <label style="color:#ffd700;">💰 الكمية:</label>
                    <input id="bc-amount" type="number" step="0.01" min="0.01" placeholder="0.00"
                        style="width:100%;padding:12px;background:#1a1a1d;color:#fff;
                        border:1px solid rgba(255,215,0,0.2);border-radius:12px;
                        margin:8px 0;direction:ltr;">
                    <label style="color:#ffd700;">📝 ملاحظة:</label>
                    <input id="bc-memo" placeholder="Chatoo"
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
                const recipient = document.getElementById('bc-recipient').value.trim();
                const amount = document.getElementById('bc-amount').value;
                const memo = document.getElementById('bc-memo').value || 'Chatoo';

                if (!recipient || !recipient.startsWith('G') || recipient.length !== 56) {
                    Swal.showValidationMessage('عنوان محفظة غير صحيح (يبدأ بـ G ويتكون من 56 حرف)');
                    return false;
                }
                if (!amount || parseFloat(amount) <= 0) {
                    Swal.showValidationMessage('كمية غير صحيحة');
                    return false;
                }
                return { recipient, amount: parseFloat(amount), memo };
            }
        }).then(r => {
            if (r.isConfirmed) {
                this.doPayment(r.value.recipient, r.value.amount, r.value.memo);
            }
        });
    }

    async doPayment(recipient, amount, memo) {
        if (typeof Pi === 'undefined') {
            Swal.fire({
                title: '⚠️',
                text: 'افتح من Pi Browser',
                icon: 'warning',
                background: "#121214",
                color: "#fff"
            });
            return;
        }

        this.initSDK();

        let auth;
        try {
            auth = await Pi.authenticate(
                ['payments', 'username'],
                (payment) => {
                    console.log('Incomplete payment found:', payment);
                    this.onIncompletePaymentFound(payment);
                }
            );
        } catch (e) {
            Swal.fire({
                title: 'خطأ في المصادقة',
                text: e.message,
                icon: 'error',
                background: "#121214",
                color: "#fff"
            });
            return;
        }

        if (!auth || !auth.user) {
            Swal.fire({
                title: 'خطأ',
                text: 'فشل المصادقة',
                icon: 'error',
                background: "#121214",
                color: "#fff"
            });
            return;
        }

        const userId = auth.user.username;
        sessionStorage.setItem("pi_user", userId);
        sessionStorage.setItem("pi_token", auth.accessToken);
        if (auth.user.wallet_address) {
            sessionStorage.setItem("pi_address", auth.user.wallet_address);
        }

        Pi.createPayment({
            amount: amount,
            memo: memo,
            metadata: {
                app: "Chatoo",
                userId,
                recipient,
                timestamp: Date.now()
            }
        }, {
            onReadyForServerApproval: async (paymentId) => {
                console.log('⏳ Approving paymentId:', paymentId);
                try {
                    const res = await fetch('/.netlify/functions/payment-approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentId })
                    });
                    const data = await res.json();
                    console.log('✅ Approved:', data);
                } catch (e) {
                    console.error('❌ Approve error:', e);
                }
            },

            onReadyForServerCompletion: async (paymentId, txid) => {
                console.log('⏳ Completing txid:', txid);
                try {
                    const res = await fetch('/.netlify/functions/payment-complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentId, txid })
                    });
                    const data = await res.json();

                    if (!res.ok) {
                        console.error('❌ Complete failed:', data);
                        Swal.fire({
                            title: 'خطأ في إتمام الدفع',
                            text: JSON.stringify(data.error || data),
                            icon: 'error',
                            background: "#121214",
                            color: "#fff"
                        });
                        return;
                    }

                    console.log('✅ Completed:', data);
                } catch (e) {
                    console.error('❌ Complete error:', e);
                    Swal.fire({
                        title: 'خطأ في الاتصال',
                        text: e.message,
                        icon: 'error',
                        background: "#121214",
                        color: "#fff"
                    });
                    return;
                }

                this.transactionHistory.unshift({
                    paymentId, txid, amount, memo,
                    userId, recipient,
                    timestamp: Date.now(),
                    status: 'completed'
                });
                if (this.transactionHistory.length > 50) {
                    this.transactionHistory = this.transactionHistory.slice(0, 50);
                }
                localStorage.setItem(
                    'chatoo_tx_history',
                    JSON.stringify(this.transactionHistory)
                );

                Swal.fire({
                    title: '🎉 تم الدفع!',
                    html: `
                        <p style="color:#ffd700;font-size:28px;font-weight:900;">
                            ${amount} π
                        </p>
                        <small style="opacity:0.5;font-family:monospace;">
                            TX: ${txid}
                        </small>
                    `,
                    icon: 'success',
                    background: "#121214",
                    color: "#fff",
                    confirmButtonColor: "#ffd700"
                });

                if (window.db && window.chatoo?.state?.room) {
                    window.db.collection("rooms_v2")
                        .doc(window.chatoo.state.room)
                        .collection("m")
                        .add({
                            u: userId,
                            val: `💸 تم تحويل ${amount} π إلى ${recipient.slice(0,8)}... - ${memo}`,
                            type: 'gift',
                            txid: txid,
                            t: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(() => {});
                }

                if (window.chatoo) {
                    window.chatoo.gainXP(20);
                }
                if (window.chatooAchievements) {
                    window.chatooAchievements.trackTip('sent');
                }
            },

            onCancel: (paymentId) => {
                console.log('Payment cancelled:', paymentId);
                Swal.fire({
                    title: '❌ تم الإلغاء',
                    icon: 'info',
                    background: "#121214",
                    color: "#fff",
                    timer: 2000,
                    showConfirmButton: false
                });
            },

            onError: (error, payment) => {
                console.error('Payment error:', error, payment);
                Swal.fire({
                    title: 'خطأ في الدفع',
                    text: error.message || 'حدث خطأ غير متوقع',
                    icon: 'error',
                    background: "#121214",
                    color: "#fff"
                });
            }
        });
    }

    async getAccountBalance(address) {
        try {
            const res = await fetch(
                `${CHATOO_CONFIG.piNetwork.horizonEndpoint}/accounts/${address}`
            );
            if (!res.ok) throw new Error('Account not found');
            const data = await res.json();
            const piBalance = data.balances?.find(b => b.asset_type === 'native');
            return {
                balance: parseFloat(piBalance?.balance || 0),
                address
            };
        } catch (e) {
            console.warn('Balance fetch failed:', e.message);
            return { balance: 0, address };
        }
    }

    onIncompletePaymentFound(payment) {
        console.warn('⚠️ Incomplete payment:', payment);
        if (payment?.identifier) {
            fetch('/.netlify/functions/payment-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: payment.identifier,
                    txid: payment.transaction?.txid || ''
                })
            }).catch(() => {});
        }
    }

    async checkNetworkStatus() {
        try {
            const res = await fetch(
                `${CHATOO_CONFIG.piNetwork.horizonEndpoint}/`
            );
            return {
                online: res.ok,
                network: CHATOO_CONFIG.app.network,
                rpcEndpoint: CHATOO_CONFIG.piNetwork.horizonEndpoint
            };
        } catch (e) {
            return {
                online: false,
                network: CHATOO_CONFIG.app.network,
                rpcEndpoint: CHATOO_CONFIG.piNetwork.horizonEndpoint
            };
        }
    }
}

const chatooBlock = new ChatooBlockchain();
window.chatooBlock = chatooBlock;

console.log('💰 Pi Payment System Ready');
