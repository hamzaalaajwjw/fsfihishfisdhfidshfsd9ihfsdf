// التهيئة مع Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAl3XunFOwHpGw-4_VYyETMtoLgk4mnRpQ",
    authDomain: "a3len-3ad54.firebaseapp.com",
    databaseURL: "https://a3len-3ad54-default-rtdb.firebaseio.com",
    projectId: "a3len-3ad54",
    storageBucket: "a3len-3ad54.firebasestorage.app",
    messagingSenderId: "767338034080",
    appId: "1:767338034080:web:801d77fb74c0aa56e92ac5"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// عناصر DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const loginLoading = document.getElementById('login-loading');
const userInfo = document.getElementById('user-info');
const displayUsername = document.getElementById('display-username');
const copyUsernameBtn = document.getElementById('copy-username');
const goToChatBtn = document.getElementById('go-to-chat');
const currentUsername = document.getElementById('current-username');
const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const chatsList = document.getElementById('chats-list');
const chatHeader = document.getElementById('chat-header');
const messagesContainer = document.getElementById('messages-container');
const messageInputContainer = document.getElementById('message-input-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const typingUser = document.getElementById('typing-user');

// متغيرات التطبيق
let currentUser = null;
let currentChatId = null;
let currentReceiver = null;
let typingTimeout = null;

// توليد اسم مستخدم عشوائي بطول 32 حرفاً
function generateUsername() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let username = '';
    for (let i = 0; i < 32; i++) {
        username += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return username;
}

// تسجيل الدخول المجهول
loginBtn.addEventListener('click', async () => {
    loginBtn.classList.add('hidden');
    loginLoading.classList.remove('hidden');
    
    try {
        const userCredential = await auth.signInAnonymously();
        currentUser = userCredential.user;
        
        // توليد اسم مستخدم جديد أو جلب الموجود
        const userRef = database.ref('users/' + currentUser.uid);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            const username = generateUsername();
            await userRef.set({
                username: username,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            displayUsername.textContent = username;
        } else {
            displayUsername.textContent = snapshot.val().username;
        }
        
        loginLoading.classList.add('hidden');
        userInfo.classList.remove('hidden');
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        alert('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        loginBtn.classList.remove('hidden');
        loginLoading.classList.add('hidden');
    }
});

// نسخ اسم المستخدم
copyUsernameBtn.addEventListener('click', () => {
    const username = displayUsername.textContent;
    navigator.clipboard.writeText(username).then(() => {
        const originalText = copyUsernameBtn.innerHTML;
        copyUsernameBtn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
        copyUsernameBtn.classList.add('btn-primary');
        copyUsernameBtn.classList.remove('btn-secondary');
        
        setTimeout(() => {
            copyUsernameBtn.innerHTML = originalText;
            copyUsernameBtn.classList.remove('btn-primary');
            copyUsernameBtn.classList.add('btn-secondary');
        }, 2000);
    });
});

// الانتقال لشاشة الدردشة
goToChatBtn.addEventListener('click', () => {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    loadUserData();
    loadChatsList();
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        try {
            await auth.signOut();
            location.reload();
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }
});

// تحميل بيانات المستخدم
async function loadUserData() {
    if (!currentUser) return;
    
    const userRef = database.ref('users/' + currentUser.uid);
    const snapshot = await userRef.once('value');
    
    if (snapshot.exists()) {
        currentUsername.textContent = snapshot.val().username;
    }
}

// البحث عن مستخدم
searchBtn.addEventListener('click', searchUser);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchUser();
});

async function searchUser() {
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length !== 32) {
        alert('اسم المستخدم يجب أن يكون 32 حرفاً بالضبط');
        return;
    }
    
    if (searchTerm === currentUsername.textContent) {
        alert('لا يمكنك البحث عن نفسك!');
        return;
    }
    
    try {
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('username').equalTo(searchTerm).once('value');
        
        searchResults.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                const userElement = document.createElement('div');
                userElement.className = 'search-result-item';
                userElement.innerHTML = `
                    <p><strong>اسم المستخدم:</strong> ${user.username}</p>
                    <p class="timestamp">منذ: ${formatTime(user.createdAt)}</p>
                `;
                
                userElement.addEventListener('click', () => {
                    startChat(childSnapshot.key, user.username);
                });
                
                searchResults.appendChild(userElement);
            });
        } else {
            searchResults.innerHTML = '<p style="text-align: center; color: #666;">لم يتم العثور على المستخدم</p>';
        }
    } catch (error) {
        console.error('خطأ في البحث:', error);
        alert('حدث خطأ أثناء البحث');
    }
}

// بدء محادثة جديدة
async function startChat(receiverId, receiverUsername) {
    if (!currentUser || !receiverId) return;
    
    // إنشاء معرف فريد للمحادثة
    const chatId = [currentUser.uid, receiverId].sort().join('_');
    currentChatId = chatId;
    currentReceiver = {
        id: receiverId,
        username: receiverUsername
    };
    
    // التحقق من وجود المحادثة أو إنشاؤها
    const chatRef = database.ref('chats/' + chatId);
    const snapshot = await chatRef.once('value');
    
    if (!snapshot.exists()) {
        await chatRef.set({
            participants: {
                [currentUser.uid]: true,
                [receiverId]: true
            },
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastMessage: '',
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    // عرض منطقة المحادثة
    showChatArea();
    loadMessages();
    
    // إضافة المحادثة للقائمة
    addChatToList(receiverUsername, receiverId);
}

// عرض منطقة الدردشة
function showChatArea() {
    const headerPlaceholder = document.querySelector('.header-placeholder');
    if (headerPlaceholder) {
        headerPlaceholder.classList.add('hidden');
    }
    
    chatHeader.innerHTML = `
        <div class="chat-header-info">
            <h3><i class="fas fa-user"></i> محادثة مع: <span class="username">${currentReceiver.username}</span></h3>
            <div class="chat-actions">
                <button id="clear-chat" class="btn btn-small btn-secondary">
                    <i class="fas fa-trash"></i> مسح المحادثة
                </button>
            </div>
        </div>
    `;
    
    messageInputContainer.classList.remove('hidden');
    messagesContainer.innerHTML = '<div class="messages" id="messages"></div>';
    
    // إضافة حدث مسح المحادثة
    document.getElementById('clear-chat').addEventListener('click', clearChat);
}

// تحميل الرسائل
function loadMessages() {
    if (!currentChatId) return;
    
    const messagesRef = database.ref('messages/' + currentChatId);
    
    // حذف المشاهدات السابقة
    messagesRef.off();
    
    messagesRef.orderByChild('timestamp').on('value', (snapshot) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                displayMessage(message);
            });
            
            // التمرير للأسفل
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        } else {
            messagesDiv.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">لا توجد رسائل بعد. ابدأ المحادثة الآن!</p>';
        }
    });
    
    // الاستماع لكتابة الرسائل
    setupTypingListener();
}

// عرض رسالة
function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === currentUser.uid ? 'message-sent' : 'message-received'}`;
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        ${message.senderId !== currentUser.uid ? `<div class="message-sender">${message.senderName}</div>` : ''}
        <div class="message-text">${message.text}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesDiv.appendChild(messageElement);
}

// إرسال رسالة
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId || !currentReceiver) return;
    
    try {
        // جلب اسم المستخدم الحالي
        const userRef = database.ref('users/' + currentUser.uid);
        const snapshot = await userRef.once('value');
        const currentUserData = snapshot.val();
        
        // إنشاء الرسالة
        const messageId = database.ref().child('messages').push().key;
        const messageData = {
            text: text,
            senderId: currentUser.uid,
            senderName: currentUserData.username,
            receiverId: currentReceiver.id,
            receiverName: currentReceiver.username,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            chatId: currentChatId
        };
        
        // حفظ الرسالة
        await database.ref('messages/' + currentChatId + '/' + messageId).set(messageData);
        
        // تحديث آخر رسالة في المحادثة
        await database.ref('chats/' + currentChatId).update({
            lastMessage: text,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        // إعلام المستلم
        await sendNotification(currentReceiver.id, 'رسالة جديدة', text);
        
        // مسح حقل الإدخال
        messageInput.value = '';
        
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        alert('حدث خطأ أثناء إرسال الرسالة');
    }
}

// إرسال إشعار للمستلم
async function sendNotification(userId, title, body) {
    try {
        await database.ref('notifications/' + userId).push().set({
            title: title,
            body: body,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false,
            chatId: currentChatId
        });
    } catch (error) {
        console.error('خطأ في إرسال الإشعار:', error);
    }
}

// تحميل قائمة المحادثات
async function loadChatsList() {
    if (!currentUser) return;
    
    const chatsRef = database.ref('chats');
    
    chatsRef.orderByChild(`participants/${currentUser.uid}`).equalTo(true).on('value', async (snapshot) => {
        chatsList.innerHTML = '';
        
        if (snapshot.exists()) {
            const chats = [];
            
            snapshot.forEach((childSnapshot) => {
                const chat = childSnapshot.val();
                chat.id = childSnapshot.key;
                chats.push(chat);
            });
            
            // ترتيب المحادثات حسب آخر رسالة
            chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            
            for (const chat of chats) {
                // الحصول على معلومات المستخدم الآخر
                const otherParticipantId = Object.keys(chat.participants).find(id => id !== currentUser.uid);
                if (otherParticipantId) {
                    const userRef = database.ref('users/' + otherParticipantId);
                    const userSnapshot = await userRef.once('value');
                    
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();
                        addChatToList(userData.username, otherParticipantId, chat.lastMessage, chat.lastMessageTime);
                    }
                }
            }
        } else {
            chatsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">لا توجد محادثات بعد</p>';
        }
    });
}

// إضافة محادثة للقائمة
function addChatToList(username, userId, lastMessage = 'بدء المحادثة', lastMessageTime = null) {
    // التحقق من عدم وجود المحادثة مسبقاً
    const existingChat = Array.from(chatsList.children).find(item => 
        item.dataset.userId === userId
    );
    
    if (existingChat) {
        existingChat.querySelector('.chat-preview').textContent = lastMessage || 'بدء المحادثة';
        existingChat.querySelector('.chat-time').textContent = lastMessageTime ? formatTime(lastMessageTime) : 'الآن';
        chatsList.prepend(existingChat);
        return;
    }
    
    const chatElement = document.createElement('div');
    chatElement.className = 'chat-item';
    chatElement.dataset.userId = userId;
    
    const timeText = lastMessageTime ? formatTime(lastMessageTime) : 'الآن';
    
    chatElement.innerHTML = `
        <div class="chat-item-header">
            <div class="chat-username">${username}</div>
            <div class="chat-time">${timeText}</div>
        </div>
        <div class="chat-preview">${lastMessage || 'بدء المحادثة'}</div>
    `;
    
    chatElement.addEventListener('click', () => {
        // إزالة النشاط من جميع المحادثات
        Array.from(chatsList.children).forEach(item => {
            item.classList.remove('active');
        });
        
        // إضافة النشاط للمحادثة المحددة
        chatElement.classList.add('active');
        
        // تحميل المحادثة
        startChat(userId, username);
    });
    
    chatsList.prepend(chatElement);
}

// إعداد الاستماع للكتابة
function setupTypingListener() {
    if (!currentChatId || !currentReceiver) return;
    
    const typingRef = database.ref('typing/' + currentChatId + '/' + currentUser.uid);
    
    // الاستماع لكتابة المستخدم الآخر
    database.ref('typing/' + currentChatId + '/' + currentReceiver.id).on('value', (snapshot) => {
        if (snapshot.exists() && snapshot.val()) {
            typingUser.textContent = currentReceiver.username;
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    });
    
    // إرسال حالة الكتابة
    messageInput.addEventListener('input', () => {
        if (messageInput.value.trim()) {
            typingRef.set(true);
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                typingRef.set(false);
            }, 2000);
        } else {
            typingRef.set(false);
        }
    });
    
    // إيقاف الكتابة عند ترك الحقل
    messageInput.addEventListener('blur', () => {
        typingRef.set(false);
    });
}

// مسح المحادثة
async function clearChat() {
    if (!currentChatId || !confirm('هل تريد مسح جميع الرسائل في هذه المحادثة؟')) return;
    
    try {
        await database.ref('messages/' + currentChatId).remove();
        
        // تحديث آخر رسالة
        await database.ref('chats/' + currentChatId).update({
            lastMessage: '',
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        // تحديث واجهة المستخدم
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">لا توجد رسائل بعد. ابدأ المحادثة الآن!</p>';
        }
        
    } catch (error) {
        console.error('خطأ في مسح المحادثة:', error);
        alert('حدث خطأ أثناء مسح المحادثة');
    }
}

// تنسيق الوقت
function formatTime(timestamp) {
    if (!timestamp) return 'الآن';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-EG');
}

// تهيئة التطبيق عند التحميل
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
    } else {
        currentUser = null;
    }
});
