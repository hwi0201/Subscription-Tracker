// Firebase Firestore Storage Management
const Storage = {
    COLLECTION_NAME: 'subscriptions',
    
    // Initialize - check if Firebase is available
    _checkFirebase() {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('Firebase is not initialized. Please check firebase-config.js');
            return false;
        }
        return true;
    },

    // Get all subscriptions from Firestore
    async getAll() {
        if (!this._checkFirebase()) {
            return [];
        }

        try {
            const snapshot = await db.collection(this.COLLECTION_NAME)
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            return [];
        }
    },

    // Save all subscriptions to Firestore (for import functionality)
    async saveAll(subscriptions) {
        if (!this._checkFirebase()) {
            return false;
        }

        try {
            // Delete all existing subscriptions
            const snapshot = await db.collection(this.COLLECTION_NAME).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // Add all new subscriptions
            if (subscriptions && subscriptions.length > 0) {
                const addBatch = db.batch();
                subscriptions.forEach(sub => {
                    const docRef = db.collection(this.COLLECTION_NAME).doc();
                    // Preserve existing ID if available, otherwise use new doc ID
                    const subscriptionData = { ...sub };
                    if (sub.id) {
                        subscriptionData.id = sub.id;
                    }
                    addBatch.set(docRef, subscriptionData);
                });
                await addBatch.commit();
            }

            return true;
        } catch (error) {
            console.error('Error saving subscriptions:', error);
            return false;
        }
    },

    // Add a new subscription to Firestore
    async add(subscription) {
        if (!this._checkFirebase()) {
            return null;
        }

        try {
            subscription.createdAt = new Date().toISOString();
            const docRef = await db.collection(this.COLLECTION_NAME).add(subscription);
            
            return {
                id: docRef.id,
                ...subscription
            };
        } catch (error) {
            console.error('Error adding subscription:', error);
            return null;
        }
    },

    // Update a subscription in Firestore
    async update(id, updates) {
        if (!this._checkFirebase()) {
            return null;
        }

        try {
            const docRef = db.collection(this.COLLECTION_NAME).doc(id);
            await docRef.update(updates);
            
            const updatedDoc = await docRef.get();
            if (updatedDoc.exists) {
                return {
                    id: updatedDoc.id,
                    ...updatedDoc.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error updating subscription:', error);
            return null;
        }
    },

    // Delete a subscription from Firestore
    async delete(id) {
        if (!this._checkFirebase()) {
            return false;
        }

        try {
            await db.collection(this.COLLECTION_NAME).doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting subscription:', error);
            return false;
        }
    },

    // Get subscription by ID from Firestore
    async getById(id) {
        if (!this._checkFirebase()) {
            return null;
        }

        try {
            const doc = await db.collection(this.COLLECTION_NAME).doc(id).get();
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting subscription:', error);
            return null;
        }
    },

    // Clear all data from Firestore
    async clear() {
        if (!this._checkFirebase()) {
            return false;
        }

        try {
            const snapshot = await db.collection(this.COLLECTION_NAME).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error clearing subscriptions:', error);
            return false;
        }
    },

    // Real-time listener for subscriptions (optional - for live updates)
    onSnapshot(callback) {
        if (!this._checkFirebase()) {
            return () => {}; // Return empty unsubscribe function
        }

        return db.collection(this.COLLECTION_NAME)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const subscriptions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(subscriptions);
            }, (error) => {
                console.error('Error in subscription listener:', error);
            });
    }
};
