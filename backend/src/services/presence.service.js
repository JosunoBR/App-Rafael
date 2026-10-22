class PresenceService {
  constructor() {
    // orderId -> Map(userId -> { userId, userName, userRole, lastSeenAt })
    this.presenceMap = new Map();
    this.TIMEOUT_MS = 40000; // 40 segundos de tolerância para timeout inativo
  }

  record(orderId, user) {
    if (!orderId || !user) return [];
    const now = Date.now();
    const cleanOrderId = String(orderId);

    if (!this.presenceMap.has(cleanOrderId)) {
      this.presenceMap.set(cleanOrderId, new Map());
    }

    const orderUsers = this.presenceMap.get(cleanOrderId);
    const userId = String(user.id || user.email || 'anon');

    orderUsers.set(userId, {
      userId,
      userName: user.nome || user.email || 'Usuário',
      userRole: user.role || 'operador',
      lastSeenAt: now
    });

    return this._getActiveViewers(cleanOrderId, userId, now);
  }

  leave(orderId, userId) {
    if (!orderId || !userId) return;
    const cleanOrderId = String(orderId);
    const orderUsers = this.presenceMap.get(cleanOrderId);
    if (orderUsers) {
      orderUsers.delete(String(userId));
      if (orderUsers.size === 0) {
        this.presenceMap.delete(cleanOrderId);
      }
    }
  }

  getViewers(orderId, excludeUserId) {
    if (!orderId) return [];
    return this._getActiveViewers(String(orderId), excludeUserId ? String(excludeUserId) : null, Date.now());
  }

  _getActiveViewers(orderId, excludeUserId, now) {
    const orderUsers = this.presenceMap.get(orderId);
    if (!orderUsers) return [];

    const active = [];
    for (const [uid, record] of orderUsers.entries()) {
      if (now - record.lastSeenAt > this.TIMEOUT_MS) {
        orderUsers.delete(uid);
      } else if (uid !== excludeUserId) {
        active.push({
          userId: record.userId,
          userName: record.userName,
          userRole: record.userRole,
          lastSeenAt: record.lastSeenAt
        });
      }
    }

    if (orderUsers.size === 0) {
      this.presenceMap.delete(orderId);
    }

    return active;
  }
}

module.exports = new PresenceService();
