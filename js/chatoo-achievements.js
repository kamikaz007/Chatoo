// chatoo-achievements.js - نظام الإنجازات
// المسؤول: Kamikaz007

class ChatooAchievements {
    constructor() {
        this.achievements = ACHIEVEMENTS_CONFIG.achievements;
        this.userStats = this._loadStats();
        this.unlockedAchievements = JSON.parse(localStorage.getItem('chatoo_unlocked_achievements') || '[]');
        this.listeners = [];
    }

    _loadStats() {
        const stored = localStorage.getItem('chatoo_achievement_stats');
        return stored ? JSON.parse(stored) : {
            messagesSent: 0,
            tipsSent: 0,
            tipsReceived: 0,
            totalXP: 0,
            venuesVisited: 0,
            nightMessages: 0,
            shopPurchases: 0,
            referrals: 0,
            mapOpens: 0,
            consecutiveDays: this._calculateConsecutiveDays(),
            lastLoginDate: new Date().toDateString(),
            loginDates: JSON.parse(localStorage.getItem('chatoo_login_dates') || '[]')
        };
    }

    _saveStats() {
        localStorage.setItem('chatoo_achievement_stats', JSON.stringify(this.userStats));
    }

    _saveUnlocked() {
        localStorage.setItem('chatoo_unlocked_achievements', JSON.stringify(this.unlockedAchievements));
    }

    _calculateConsecutiveDays() {
        const dates = JSON.parse(localStorage.getItem('chatoo_login_dates') || '[]');
        if (dates.length === 0) return 1;
        dates.sort();
        let consecutive = 1;
        let maxConsecutive = 1;
        for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1]);
            const curr = new Date(dates[i]);
            const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                consecutive++;
                maxConsecutive = Math.max(maxConsecutive, consecutive);
            } else {
                consecutive = 1;
            }
        }
        return maxConsecutive;
    }

    trackLogin() {
        const today = new Date().toDateString();
        const dates = this.userStats.loginDates;
        if (!dates.includes(today)) {
            dates.push(today);
            localStorage.setItem('chatoo_login_dates', JSON.stringify(dates));
        }
        this.userStats.consecutiveDays = this._calculateConsecutiveDays();
        this.userStats.lastLoginDate = today;
        this._saveStats();
        this.checkAchievements();
    }

    trackMessage(hour = null) {
        this.userStats.messagesSent++;
        const msgHour = hour || new Date().getHours();
        if (msgHour >= 0 && msgHour < 5) {
            this.userStats.nightMessages++;
        }
        this._saveStats();
        this.checkAchievements();
    }

    trackTip(direction) {
        if (direction === 'sent') {
            this.userStats.tipsSent++;
        } else {
            this.userStats.tipsReceived++;
        }
        this._saveStats();
        this.checkAchievements();
    }

    trackXP(totalXP) {
        this.userStats.totalXP = totalXP;
        this._saveStats();
        this.checkAchievements();
    }

    trackVenueVisit() {
        this.userStats.venuesVisited++;
        this._saveStats();
        this.checkAchievements();
    }

    trackShopPurchase() {
        this.userStats.shopPurchases++;
        this._saveStats();
        this.checkAchievements();
    }

    trackReferral() {
        this.userStats.referrals++;
        this._saveStats();
        this.checkAchievements();
    }

    trackMapOpen() {
        this.userStats.mapOpens++;
        this._saveStats();
        this.checkAchievements();
    }

    checkAchievements() {
        const newlyUnlocked = [];
        
        this.achievements.forEach(achievement => {
            if (this.unlockedAchievements.includes(achievement.id)) return;
            
            let conditionMet = false;
            const stats = this.userStats;
            const cond = achievement.condition;
            
            if (cond.messagesSent && stats.messagesSent >= cond.messagesSent) conditionMet = true;
            if (cond.tipsSent && stats.tipsSent >= cond.tipsSent) conditionMet = true;
            if (cond.tipsReceived && stats.tipsReceived >= cond.tipsReceived) conditionMet = true;
            if (cond.totalXP && stats.totalXP >= cond.totalXP) conditionMet = true;
            if (cond.venuesVisited && stats.venuesVisited >= cond.venuesVisited) conditionMet = true;
            if (cond.nightMessages && stats.nightMessages >= cond.nightMessages) conditionMet = true;
            if (cond.consecutiveDays && stats.consecutiveDays >= cond.consecutiveDays) conditionMet = true;
            if (cond.shopPurchases && stats.shopPurchases >= cond.shopPurchases) conditionMet = true;
            if (cond.referrals && stats.referrals >= cond.referrals) conditionMet = true;
            if (cond.mapOpens && stats.mapOpens >= cond.mapOpens) conditionMet = true;
            
            if (conditionMet) {
                this.unlockedAchievements.push(achievement.id);
                newlyUnlocked.push(achievement);
                this._onAchievementUnlocked(achievement);
            }
        });
        
        if (newlyUnlocked.length > 0) {
            this._saveUnlocked();
        }
        
        return newlyUnlocked;
    }

    _onAchievementUnlocked(achievement) {
        this.listeners.forEach(callback => {
            try { callback(achievement); } catch (e) {}
        });
        
        if (window.chatooNotif) {
            window.chatooNotif.achievementUnlocked(achievement.name, achievement.xpReward);
        }
        
        if (['rare', 'epic', 'legendary', 'secret'].includes(achievement.rarity)) {
            const rarityConfig = ACHIEVEMENTS_CONFIG.rarity[achievement.rarity];
            
            Swal.fire({
                title: '🏆 إنجاز جديد!',
                html: `
                    <div style="text-align:center;color:#fff;padding:20px 10px;">
                        <div style="font-size:70px;margin-bottom:12px;filter:drop-shadow(0 0 20px ${rarityConfig.color});">${achievement.icon}</div>
                        <h2 style="color:${rarityConfig.color};margin:10px 0;font-size:24px;text-shadow:0 0 15px ${rarityConfig.color};">${achievement.name}</h2>
                        <p style="opacity:0.85;font-size:14px;margin:8px 0;">${achievement.description}</p>
                        <span style="display:inline-block;background:${rarityConfig.color}22;color:${rarityConfig.color};padding:4px 14px;border-radius:20px;font-size:10px;font-weight:bold;letter-spacing:1px;margin:8px 0;">${rarityConfig.label}</span>
                        <div style="display:flex;justify-content:center;gap:20px;margin-top:16px;">
                            <div style="text-align:center;">
                                <span style="color:#ffd700;font-weight:900;font-size:22px;">+${achievement.xpReward}</span>
                                <br><small style="opacity:0.6;">XP</small>
                            </div>
                            <div style="text-align:center;">
                                <span style="color:#ffd700;font-weight:900;font-size:22px;">+${achievement.piReward}</span>
                                <br><small style="opacity:0.6;">Pi</small>
                            </div>
                        </div>
                    </div>
                `,
                background: '#0d0d12',
                color: '#fff',
                confirmButtonColor: rarityConfig.color,
                confirmButtonText: '🎉 رائع!',
                customClass: {
                    popup: 'achievement-popup'
                }
            });
        }
        
        if (window.chatoo && typeof window.chatoo.gainXP === 'function') {
            window.chatoo.gainXP(achievement.xpReward);
        }
    }

    onAchievementUnlocked(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    getProgress() {
        const total = this.achievements.length;
        const unlocked = this.unlockedAchievements.length;
        return {
            total,
            unlocked,
            percentage: Math.round((unlocked / total) * 100),
            achievements: this.achievements.map(a => ({
                ...a,
                unlocked: this.unlockedAchievements.includes(a.id)
            }))
        };
    }

    getTotalPiEarned() {
        return this.achievements
            .filter(a => this.unlockedAchievements.includes(a.id))
            .reduce((sum, a) => sum + a.piReward, 0);
    }

    renderAchievementsList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const progress = this.getProgress();
        const totalPiEarned = this.getTotalPiEarned();
        const rarities = ACHIEVEMENTS_CONFIG.rarity;
        
        let html = `
            <div style="text-align:center;margin-bottom:24px;">
                <div style="font-size:52px;filter:drop-shadow(0 0 12px #ffd700);">🏆</div>
                <h3 style="color:#fff;margin:10px 0 4px;font-size:22px;">${progress.unlocked} / ${progress.total} إنجاز</h3>
                <div style="background:rgba(255,255,255,0.04);border-radius:30px;height:10px;overflow:hidden;margin:14px 0;box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);">
                    <div style="width:${progress.percentage}%;height:100%;background:linear-gradient(90deg, #ffd700, #ff8c00, #ff6b6b);border-radius:30px;transition:width 1.2s ease;box-shadow:0 0 12px rgba(255,215,0,0.5);"></div>
                </div>
                <div style="display:flex;justify-content:center;gap:16px;color:rgba(255,255,255,0.5);font-size:11px;">
                    <span>${progress.percentage}% مكتمل</span>
                    ${totalPiEarned > 0 ? `<span>💰 ${totalPiEarned} π مكتسبة</span>` : ''}
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
        `;

        progress.achievements.forEach(a => {
            const rarity = rarities[a.rarity] || rarities.common;
            const unlocked = a.unlocked;
            
            html += `
                <div style="
                    background:${unlocked ? `linear-gradient(135deg, ${rarity.color}11, rgba(255,255,255,0.02))` : 'rgba(255,255,255,0.02)'};
                    border:1px solid ${unlocked ? rarity.color + '55' : 'rgba(255,255,255,0.04)'};
                    border-radius:18px;
                    padding:14px 16px;
                    display:flex;
                    align-items:center;
                    gap:14px;
                    opacity:${unlocked ? '1' : '0.45'};
                    transition:all 0.4s ease;
                    ${unlocked && rarity.glow ? `box-shadow:0 0 16px ${rarity.color}22;` : ''}
                ">
                    <div style="
                        font-size:30px;
                        width:48px;height:48px;
                        display:flex;align-items:center;justify-content:center;
                        border-radius:50%;
                        background:${unlocked ? rarity.color + '18' : 'rgba(255,255,255,0.03)'};
                        flex-shrink:0;
                    ">${unlocked ? a.icon : a.secret ? '❓' : '🔒'}</div>
                    <div style="flex-grow:1;min-width:0;">
                        <b style="font-size:13px;color:${unlocked ? '#fff' : 'rgba(255,255,255,0.4)'};display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${unlocked ? a.name : a.secret && !unlocked ? a.hint || 'إنجاز سري' : a.name}
                        </b>
                        <small style="opacity:0.4;font-size:10px;display:block;margin-top:2px;">
                            ${unlocked ? a.description : a.secret && !unlocked ? (a.hint || 'لم يُفتح بعد') : 'لم يُفتح بعد'}
                        </small>
                    </div>
                    <div style="text-align:center;flex-shrink:0;">
                        <span style="
                            background:${rarity.color}22;
                            color:${rarity.color};
                            padding:3px 10px;
                            border-radius:14px;
                            font-size:8px;
                            font-weight:800;
                            letter-spacing:0.8px;
                            display:inline-block;
                            border:1px solid ${rarity.color}44;
                        ">${rarity.label}</span>
                        ${unlocked ? `<br><small style="color:#ffd700;font-weight:700;font-size:10px;">+${a.xpReward} XP</small>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
}

// تهيئة النظام
window.chatooAchievements = null;
document.addEventListener('DOMContentLoaded', () => {
    window.chatooAchievements = new ChatooAchievements();
    window.chatooAchievements.trackLogin();
    console.log('🏆 Achievements System Ready');
});
