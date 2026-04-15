const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));  // <- root folder ကို serve လုပ်မယ်
app.use(session({
    secret: 'luxcy-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ==================== HTML ROUTES ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer.html'));
});

app.get('/customer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==================== FILE UPLOAD SETUP ====================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + unique + path.extname(file.originalname));
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Background upload
const bgStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const bgDir = path.join(__dirname, 'uploads/backgrounds');
        if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
        cb(null, bgDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bg-' + unique + path.extname(file.originalname));
    }
});
const uploadBg = multer({ storage: bgStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ==================== DATA FILES ====================
const usersFile = path.join(__dirname, 'users.json');
const ordersFile = path.join(__dirname, 'orders.json');
const injectionsFile = path.join(__dirname, 'injections.json');
const referralsFile = path.join(__dirname, 'referrals.json');
const agentsFile = path.join(__dirname, 'agents.json');
const settingsFile = path.join(__dirname, 'settings.json');
const rechargeRequestsFile = path.join(__dirname, 'recharge_requests.json');
const withdrawRequestsFile = path.join(__dirname, 'withdraw_requests.json');

// ==================== DATA HELPERS ====================
function readUsers() { 
    try { return JSON.parse(fs.readFileSync(usersFile)); } 
    catch(e) { return []; } 
}
function writeUsers(users) { fs.writeFileSync(usersFile, JSON.stringify(users, null, 2)); }

function readOrders() { 
    try { return JSON.parse(fs.readFileSync(ordersFile)); } 
    catch(e) { return []; } 
}
function writeOrders(orders) { fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2)); }

function readInjections() { 
    try { return JSON.parse(fs.readFileSync(injectionsFile)); } 
    catch(e) { return []; } 
}
function writeInjections(inj) { fs.writeFileSync(injectionsFile, JSON.stringify(inj, null, 2)); }

function readReferrals() { 
    try { return JSON.parse(fs.readFileSync(referralsFile)); } 
    catch(e) { return {}; } 
}
function writeReferrals(ref) { fs.writeFileSync(referralsFile, JSON.stringify(ref, null, 2)); }

function readAgents() { 
    try { return JSON.parse(fs.readFileSync(agentsFile)); } 
    catch(e) { return []; } 
}
function writeAgents(agents) { fs.writeFileSync(agentsFile, JSON.stringify(agents, null, 2)); }

function readSettings() { 
    try { return JSON.parse(fs.readFileSync(settingsFile)); } 
    catch(e) { return {}; } 
}
function writeSettings(settings) { fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2)); }

function readRechargeRequests() {
    try { return JSON.parse(fs.readFileSync(rechargeRequestsFile)); }
    catch(e) { return []; }
}
function writeRechargeRequests(requests) { fs.writeFileSync(rechargeRequestsFile, JSON.stringify(requests, null, 2)); }

function readWithdrawRequests() {
    try { return JSON.parse(fs.readFileSync(withdrawRequestsFile)); }
    catch(e) { return []; }
}
function writeWithdrawRequests(requests) { fs.writeFileSync(withdrawRequestsFile, JSON.stringify(requests, null, 2)); }

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==================== INITIALIZE DATA ====================
function initData() {
    if (!fs.existsSync(usersFile)) {
        const adminHash = bcrypt.hashSync('admin123', 10);
        const demoHash = bcrypt.hashSync('123456', 10);
        const demoWithdrawHash = bcrypt.hashSync('654321', 10);
        const users = [
            { id: 1, username: 'admin', passwordHash: adminHash, role: 'admin', createdAt: new Date().toISOString() },
            { id: 1001, username: 'demo_user', email: 'demo@example.com', phone: '+1234567890', passwordHash: demoHash, withdrawalPasswordHash: demoWithdrawHash, balance: 23.00, invitationCode: 'DEMO123', superior: null, referralEarnings: 0, regTime: new Date().toISOString(), tasks: { completed: 0, total: 40 }, disabled: false, walletAddress: null, creditScore: 100 }
        ];
        writeUsers(users);
    }
    if (!fs.existsSync(ordersFile)) {
        const orders = [
            { id: 1001, name: "Desk lamp LED adjustable", imagePath: null, price: 14.90, status: "active", createdAt: new Date().toISOString().split('T')[0] },
            { id: 1002, name: "Protective smartphone case", imagePath: null, price: 23.40, status: "active", createdAt: new Date().toISOString().split('T')[0] },
            { id: 1003, name: "Mechanical keyboard RGB", imagePath: null, price: 38.90, status: "active", createdAt: new Date().toISOString().split('T')[0] }
        ];
        writeOrders(orders);
    }
    if (!fs.existsSync(injectionsFile)) writeInjections([]);
    if (!fs.existsSync(referralsFile)) writeReferrals({});
    if (!fs.existsSync(agentsFile)) writeAgents([]);
    if (!fs.existsSync(rechargeRequestsFile)) writeRechargeRequests([]);
    if (!fs.existsSync(withdrawRequestsFile)) writeWithdrawRequests([]);
    if (!fs.existsSync(settingsFile)) {
        const settings = {
            brandName: 'LUXCY',
            aboutCompanyContent: 'Premium Task Ecosystem',
            usdtWalletAddress: 'TCfRPvLHWkRCpaqyVkF2xaHTzqsrVr9oMf',
            minBalanceForOrder: 10,
            styles: {
                body: { backgroundType: 'gradient', backgroundColor: '#0a0f1a', backgroundImage: null, gradient: 'linear-gradient(135deg, #0a0f1a 0%, #0f1622 100%)', animation: 'none' },
                icon: { color: '#ffd796', size: '28px', hoverEffect: 'scale', hoverColor: '#ffffff', shadow: '0 4px 12px rgba(0,0,0,0.3)' },
                card: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,215,150,0.1)', borderRadius: '24px' },
                button: { gradient: 'linear-gradient(135deg, #ffd796, #ffb347)', hoverGradient: 'linear-gradient(135deg, #ffb347, #ffd796)', borderRadius: '40px' }
            }
        };
        writeSettings(settings);
    }
}
initData();

// ==================== SOCKET.IO ====================
const userSockets = new Map();
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('register', (userId) => {
        userSockets.set(userId, socket.id);
        console.log(`✅ User ${userId} registered`);
    });
    socket.on('disconnect', () => {
        for (let [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) userSockets.delete(userId);
        }
    });
});

function emitToUser(userId, event, data) {
    const socketId = userSockets.get(userId);
    if (socketId) io.to(socketId).emit(event, data);
}

// ==================== ADMIN AUTH ====================
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        req.session.admin = true;
        return res.json({ success: true, role: 'admin' });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/admin/check', (req, res) => {
    if (req.session.admin) res.json({ loggedIn: true, role: 'admin' });
    else res.json({ loggedIn: false });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ==================== ADMIN USER MANAGEMENT ====================
app.get('/api/admin/users', (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    let users = readUsers().filter(u => u.role !== 'admin');
    res.json(users);
});

app.post('/api/admin/users', async (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    const { username, email, phone, password, withdrawalPassword, invitationCode } = req.body;
    if (!username || !email || !phone || !password || !withdrawalPassword) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    let users = readUsers();
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username exists' });
    }
    const newUser = {
        id: Date.now(),
        username, email, phone,
        passwordHash: bcrypt.hashSync(password, 10),
        withdrawalPasswordHash: bcrypt.hashSync(withdrawalPassword, 10),
        balance: 0,
        invitationCode: generateInviteCode(),
        superior: null,
        referralEarnings: 0,
        regTime: new Date().toISOString(),
        tasks: { completed: 0, total: 0 },
        disabled: false,
        walletAddress: null,
        creditScore: 100,
        role: 'customer'
    };
    users.push(newUser);
    writeUsers(users);
    res.json({ success: true, user: newUser });
});

app.post('/api/admin/users/:id/toggle-disable', (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    let users = readUsers();
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (user) {
        user.disabled = !user.disabled;
        writeUsers(users);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.post('/api/admin/users/:id/balance', (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    let users = readUsers();
    const user = users.find(u => u.id === parseInt(req.params.id));
    const { amount, type } = req.body;
    if (user) {
        if (type === 'add') user.balance += amount;
        else if (type === 'subtract') user.balance -= amount;
        writeUsers(users);
        emitToUser(user.id, 'balance_update', { userId: user.id, newBalance: user.balance });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.post('/api/admin/users/:id/add-orders', (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
    const id = parseInt(req.params.id);
    const { count } = req.body;
    if (!count || count <= 0) return res.status(400).json({ error: 'Invalid count' });
    
    let users = readUsers();
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const oldTotal = user.tasks.total;
    const newTotal = oldTotal + count;
    user.tasks.total = newTotal;
    writeUsers(users);
    
    let injections = readInjections();
    for (let i = oldTotal + 1; i <= newTotal; i++) {
        injections.push({
            id: Date.now() + i,
            userId: id,
            orderNumber: i,
            orderId: 1001,
            commissionType: 'percent',
            commissionValue: 0.5,
            injectionAmount: 0,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    }
    writeInjections(injections);
    emitToUser(user.id, 'task_update', { userId: user.id, completed: user.tasks.completed, total: user.tasks.total });
    res.json({ success: true, newTotal });
});

// ==================== CUSTOMER API ====================
app.post('/api/customer/register', async (req, res) => {
    const { username, email, phone, password, withdrawalPassword, invitationCode } = req.body;
    if (!username || !email || !phone || !password || !withdrawalPassword || !invitationCode) {
        return res.status(400).json({ error: 'All fields required' });
    }
    let users = readUsers();
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username exists' });
    }
    const referrer = users.find(u => u.invitationCode === invitationCode);
    if (!referrer) {
        return res.status(400).json({ error: 'Invalid invitation code' });
    }
    const newUser = {
        id: Date.now(),
        username, email, phone,
        passwordHash: bcrypt.hashSync(password, 10),
        withdrawalPasswordHash: bcrypt.hashSync(withdrawalPassword, 10),
        balance: 0,
        invitationCode: generateInviteCode(),
        superior: referrer.username,
        referralEarnings: 0,
        regTime: new Date().toISOString(),
        tasks: { completed: 0, total: 0 },
        disabled: false,
        walletAddress: null,
        creditScore: 100,
        role: 'customer'
    };
    users.push(newUser);
    writeUsers(users);
    res.json({ success: true });
});

app.post('/api/customer/login', (req, res) => {
    const { username, password } = req.body;
    let users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user || user.disabled) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.customerId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username, balance: user.balance } });
});

app.get('/api/customer/check', (req, res) => {
    if (req.session.customerId) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/customer/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/customer/profile', (req, res) => {
    if (!req.session.customerId) return res.status(401).json({ error: 'Unauthorized' });
    let users = readUsers();
    const user = users.find(u => u.id === req.session.customerId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
        id: user.id,
        username: user.username,
        balance: user.balance,
        invitationCode: user.invitationCode,
        tasks: user.tasks,
        creditScore: user.creditScore || 100
    });
});

app.get('/api/customer/next-injection', (req, res) => {
    if (!req.session.customerId) return res.status(401).json({ error: 'Unauthorized' });
    let users = readUsers();
    const user = users.find(u => u.id === req.session.customerId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const nextTask = user.tasks.completed + 1;
    if (nextTask > user.tasks.total) return res.json(null);
    
    let injections = readInjections();
    const pending = injections.find(i => i.userId === user.id && i.status === 'pending' && i.orderNumber === nextTask);
    if (!pending) return res.json(null);
    
    let orders = readOrders();
    const order = orders.find(o => o.id === pending.orderId) || orders[0];
    
    res.json({
        injection: pending,
        order: {
            id: order.id,
            name: order.name,
            price: order.price,
            image: order.imagePath,
            commissionValue: pending.commissionValue
        }
    });
});

app.post('/api/customer/complete-task', async (req, res) => {
    if (!req.session.customerId) return res.status(401).json({ error: 'Unauthorized' });
    let users = readUsers();
    let user = users.find(u => u.id === req.session.customerId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.tasks.completed >= user.tasks.total) {
        return res.status(400).json({ error: 'No more tasks' });
    }
    
    const nextTask = user.tasks.completed + 1;
    let injections = readInjections();
    const pending = injections.find(i => i.userId === user.id && i.status === 'pending' && i.orderNumber === nextTask);
    
    let profitGain = 0;
    if (pending) {
        const randomPercent = 53 + Math.random() * 26;
        const orderAmount = user.balance * (randomPercent / 100);
        profitGain = orderAmount + (orderAmount * pending.commissionValue / 100);
        user.balance += profitGain;
        pending.status = 'triggered';
        pending.triggeredAt = new Date().toISOString();
        writeInjections(injections);
    }
    
    user.tasks.completed += 1;
    writeUsers(users);
    
    emitToUser(user.id, 'balance_update', { userId: user.id, newBalance: user.balance });
    emitToUser(user.id, 'task_update', { userId: user.id, completed: user.tasks.completed, total: user.tasks.total });
    
    res.json({ success: true, completed: user.tasks.completed, total: user.tasks.total, profitGain });
});

app.get('/api/customer/records', (req, res) => {
    if (!req.session.customerId) return res.status(401).json({ error: 'Unauthorized' });
    let injections = readInjections();
    const records = injections.filter(i => i.userId === req.session.customerId && i.status === 'triggered');
    res.json(records);
});

app.get('/api/customer/live-commissions', (req, res) => {
    const names = ['Somchai', 'Malee', 'John', 'Emily', 'David', 'Sarah', 'Luna', 'Hein'];
    const entries = [];
    for (let i = 0; i < 10; i++) {
        entries.push({ name: names[Math.floor(Math.random() * names.length)], profit: (Math.random() * 19000 + 1000).toFixed(2) });
    }
    res.json(entries);
});

app.get('/api/customer/settings', (req, res) => {
    let settings = readSettings();
    res.json({ brandName: settings.brandName, usdtWalletAddress: settings.usdtWalletAddress });
});

// ==================== START SERVER ====================
server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                    LUXCY LUXURY SYSTEM                        ║
    ╠══════════════════════════════════════════════════════════════╣
    ║   🚀 Server: http://localhost:${PORT}                         ║
    ║   👥 Customer: http://localhost:${PORT}/customer.html         ║
    ║   🔧 Admin: http://localhost:${PORT}/admin.html               ║
    ║                                                              ║
    ║   🔐 Admin Login: admin / admin123                           ║
    ║   👤 Demo Customer: demo_user / 123456                       ║
    ║                                                              ║
    ║   📡 Socket.IO: ENABLED                                      ║
    ╚══════════════════════════════════════════════════════════════╝
    `);
});