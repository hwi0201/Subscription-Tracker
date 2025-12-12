// Storage Management
const Storage = {
    STORAGE_KEY: 'subscriptions',

    // Get all subscriptions
    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            return [];
        }
    },

    // Save all subscriptions
    saveAll(subscriptions) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subscriptions));
            return true;
        } catch (error) {
            console.error('Error saving subscriptions:', error);
            return false;
        }
    },

    // Add a new subscription
    add(subscription) {
        const subscriptions = this.getAll();
        subscription.id = Date.now().toString();
        subscription.createdAt = new Date().toISOString();
        subscriptions.push(subscription);
        this.saveAll(subscriptions);
        return subscription;
    },

    // Update a subscription
    update(id, updates) {
        const subscriptions = this.getAll();
        const index = subscriptions.findIndex(s => s.id === id);
        if (index !== -1) {
            subscriptions[index] = { ...subscriptions[index], ...updates };
            this.saveAll(subscriptions);
            return subscriptions[index];
        }
        return null;
    },

    // Delete a subscription
    delete(id) {
        const subscriptions = this.getAll();
        const filtered = subscriptions.filter(s => s.id !== id);
        this.saveAll(filtered);
        return filtered.length < subscriptions.length;
    },

    // Get subscription by ID
    getById(id) {
        const subscriptions = this.getAll();
        return subscriptions.find(s => s.id === id);
    },

    // Clear all data
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};
