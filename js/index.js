import { auth, db }
finally {
 document.getElementById('articleSpinner')?.classList.add('hidden');
} from './firebase-config.js';
import { collection, getDocs, addDoc, query, orderBy, limit, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

class ArticleManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.currentUser = auth.currentUser;
        await this.loadTrendingArticles();
        await this.loadRecentArticles();
        this.setupEventListeners();
    }

    async loadTrendingArticles() {
        const articlesRef = collection(db, "articles");
        const q = query(articlesRef, orderBy("likes", "desc"), limit(6));
        const snapshot = await getDocs(q);
        
        const container = document.getElementById('trendingArticles');
        container.innerHTML = '';
        
        snapshot.forEach(async (docSnapshot) => {
            const article = docSnapshot.data();
            const author = await this.getUserInfo(article.authorId);
            
            container.innerHTML += `
                <div class="bg-white rounded-xl shadow-lg overflow-hidden article-card">
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">${article.title}</h3>
                        <p class="text-gray-600 mb-4">${article.content.substring(0, 100)}...</p>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3 space-x-reverse">
                                <img src="${author.avatar}" class="w-10 h-10 rounded-full">
                                <span class="font-medium">${author.username}</span>
                            </div>
                            <div class="flex space-x-4 space-x-reverse">
                                <button class="text-gray-500 hover:text-red-500" onclick="articleManager.likeArticle('${docSnapshot.id}')">
                                    ❤️ ${article.likes || 0}
                                </button>
                                <button class="text-gray-500 hover:text-blue-500">
                                    💬 ${article.comments || 0}
                                </button>
                            </div>
                        </div>
                        <button onclick="window.location.href='profile.html?userId=${article.authorId}'" 
                                class="mt-4 text-purple-600 hover:text-purple-700">
                            عرض الملف الشخصي
                        </button>
                    </div>
                </div>
            `;
        });
    }

    async loadRecentArticles() {
        const articlesRef = collection(db, "articles");
        const q = query(articlesRef, orderBy("createdAt", "desc"), limit(10));
        const snapshot = await getDocs(q);
        
        const container = document.getElementById('recentArticles');
        container.innerHTML = '';
        
        snapshot.forEach(async (docSnapshot) => {
            const article = docSnapshot.data();
            const author = await this.getUserInfo(article.authorId);
            
            container.innerHTML += `
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center space-x-3 space-x-reverse">
                            <img src="${author.avatar}" class="w-12 h-12 rounded-full">
                            <div>
                                <h4 class="font-bold">${author.username}</h4>
                                <p class="text-sm text-gray-500">${new Date(article.createdAt).toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                        <button class="text-purple-600 hover:text-purple-700" 
                                onclick="articleManager.followUser('${article.authorId}')">
                            متابعة
                        </button>
                    </div>
                    
                    <h3 class="text-xl font-bold text-gray-800 mb-3">${article.title}</h3>
                    <p class="text-gray-700 mb-4">${article.content}</p>
                    
                    <div class="flex items-center justify-between border-t pt-4">
                        <div class="flex space-x-6 space-x-reverse">
                            <button class="flex items-center space-x-2 space-x-reverse text-gray-600 hover:text-red-500"
                                    onclick="articleManager.likeArticle('${docSnapshot.id}')">
                                <span>❤️</span>
                                <span>${article.likes || 0}</span>
                            </button>
                            <button class="flex items-center space-x-2 space-x-reverse text-gray-600 hover:text-blue-500">
                                <span>💬</span>
                                <span>تعليق</span>
                            </button>
                        </div>
                        <button onclick="window.location.href='profile.html?userId=${article.authorId}'" 
                                class="text-purple-600 hover:text-purple-700">
                            عرض الملف الشخصي →
                        </button>
                    </div>
                </div>
            `;
        });
    }

    async getUserInfo(userId) {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                return userDoc.data();
            }
        } catch (error) {
        console.error(error);

            console.error("Error fetching user:", error);
        }
        return {
            username: "مستخدم",
            avatar: "https://ui-avatars.com/api/?name=User&background=667eea&color=fff"
        };
    }

    async likeArticle(articleId) {
        if (!this.currentUser) {
            alert('يجب تسجيل الدخول للإعجاب بالمقالات');
            return;
        }

        try {
            const articleRef = doc(db, "articles", articleId);
            const articleDoc = await getDoc(articleRef);
            
            if (articleDoc.exists()) {
                const article = articleDoc.data();
                await updateDoc(articleRef, {
                    likes: (article.likes || 0) + 1
                });
                this.loadTrendingArticles();
                this.loadRecentArticles();
            }
        } catch (error) {
        console.error(error);

            console.error("Error liking article:", error);
        }
    }

    async followUser(userId) {
        if (!this.currentUser) {
            alert('يجب تسجيل الدخول لمتابعة المستخدمين');
            return;
        }

        try {
            const currentUserRef = doc(db, "users", this.currentUser.uid);
            await updateDoc(currentUserRef, {
                following: arrayUnion(userId)
            });

            const targetUserRef = doc(db, "users", userId);
            await updateDoc(targetUserRef, {
                followers: arrayUnion(this.currentUser.uid)
            });

            alert('تمت المتابعة بنجاح!');
        } catch (error) {
        console.error(error);

            console.error("Error following user:", error);
        }
    }

    setupEventListeners() {
        // زر إنشاء مقال
        const createArticleBtn = document.getElementById('createArticleBtn');
        const createArticleModal = document.getElementById('createArticleModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelArticleBtn = document.getElementById('cancelArticleBtn');
        const articleForm = document.getElementById('articleForm');

        if (createArticleBtn) {
            createArticleBtn.addEventListener('click', () => {
                if (!this.currentUser) {
                    window.location.href = 'login.html';
                    return;
                }
                createArticleModal.classList.remove('hidden');
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                createArticleModal.classList.add('hidden');
            });
        }

        if (cancelArticleBtn) {
            cancelArticleBtn.addEventListener('click', () => {
                createArticleModal.classList.add('hidden');
            });
        }

        if (articleForm) {
            articleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const title = document.getElementById('articleTitle').value;
                const content = document.getElementById('articleContent').value;
                
                try {
                    await addDoc(collection(db, "articles"), {
                        title: title,
                        content: content,
                        authorId: this.currentUser.uid,
                        authorName: this.currentUser.displayName,
                        likes: 0,
                        comments: 0,
                        views: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    
                    createArticleModal.classList.add('hidden');
                    articleForm.reset();
                    alert('تم نشر المقال بنجاح!');
                    
                    // تحديث القوائم
                    this.loadRecentArticles();
                    this.loadTrendingArticles();
                    
                } catch (error) {
        console.error(error);

                    console.error("Error publishing article:", error);
                    alert('حدث خطأ أثناء نشر المقال');
                }
            });
        }

        // زر الذهاب للبروفايل
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                if (!this.currentUser) {
                    window.location.href = 'login.html';
                } else {
                    window.location.href = 'profile.html';
                }
            });
        }

        // زر تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.reload();
                } catch (error) {
        console.error(error);

                    console.error("Error signing out:", error);
                }
            });
        }

        // شريط البحث
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchArticles(e.target.value);
            });
        }
    }

    async searchArticles(searchTerm) {
        if (!searchTerm.trim()) {
            this.loadRecentArticles();
            return;
        }

        const articlesRef = collection(db, "articles");
        const snapshot = await getDocs(articlesRef);
        const results = [];

        snapshot.forEach((doc) => {
            const article = doc.data();
            if (article.title.includes(searchTerm) || 
                article.content.includes(searchTerm) ||
                article.authorName.includes(searchTerm)) {
                results.push({ id: doc.id, ...article });
            }
        });

        // عرض نتائج البحث
        const container = document.getElementById('recentArticles');
        container.innerHTML = '<h3 class="text-xl font-bold mb-4">نتائج البحث</h3>';
        
        if (results.length === 0) {
            container.innerHTML += '<p class="text-gray-600">لا توجد نتائج</p>';
            return;
        }

        results.forEach(article => {
            container.innerHTML += `
                <div class="bg-white rounded-lg shadow-md p-6 mb-4">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${article.title}</h3>
                    <p class="text-gray-600 mb-4">${article.content.substring(0, 200)}...</p>
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <span>بواسطة: ${article.authorName}</span>
                        <div class="flex space-x-4 space-x-reverse">
                            <span>❤️ ${article.likes || 0}</span>
                            <span>💬 ${article.comments || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
}

// تهيئة المدير عند تحميل الصفحة
window.articleManager = new ArticleManager();

// تحديث حالة المستخدم
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    window.articleManager.currentUser = user;
});
