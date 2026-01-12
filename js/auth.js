import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

export class AuthManager {
    constructor() {
        this.user = null;
        this.initAuthListener();
    }

    initAuthListener() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            this.updateUI();
        });
    }

    async register(email, password, username) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userAvatar = document.getElementById('userAvatar');

        if (this.user) {
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userAvatar) {
                userAvatar.src = this.user.photoURL || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.displayName || 'User')}&background=667eea&color=fff`;
            }
        } else {
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    }
}
