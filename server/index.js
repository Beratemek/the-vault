
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// MONGODB CONNECTION
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('FATAL: MONGO_URI is not defined in .env file!');
    process.exit(1);
}

let isDbConnected = false; 
// FORCE MEMORY FOR DEBUGGING if DB is failing hard
// Remove this line to try DB again later
// isDbConnected = false; 

const usersOverride = []; // In-memory fallback

mongoose.connect(MONGO_URI)
  .then(async () => {
      console.log('[DB] MongoDB Atlas Connected Successfully');
      isDbConnected = true;
      
      // Debug: List all collections with document counts
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('[DB] Available collections:', collections.map(c => c.name));
      
      // Count documents in each collection
      for (const col of collections) {
          const count = await mongoose.connection.db.collection(col.name).countDocuments();
          console.log(`[DB] Collection "${col.name}" has ${count} documents`);
      }
  })
  .catch((err) => {
      console.error('[DB] MongoDB Connection Error (Using In-Memory Fallback):', err.message);
      isDbConnected = false;
  });

// SCHEMAS helper
const createModel = (name, schema) => {
    return mongoose.models[name] || mongoose.model(name, schema);
};

const ApplicationSchema = new mongoose.Schema({
    username: String,
    dob: String,
    livenessImage: String, 
    status: { type: String, default: 'PENDING_REVIEW' },
    createdAt: { type: Date, default: Date.now }
});
const Application = createModel('Application', ApplicationSchema);

const MemberSchema = new mongoose.Schema({
   memberId: String,
   email: String,
   paymentToken: String,
   tier: { type: String, default: 'VAULT_PREMIUM' },
   joinedAt: { type: Date, default: Date.now }
});
const Member = createModel('Member', MemberSchema);

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // username
    receiver: { type: String, required: true }, // username
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Message = createModel('Message', MessageSchema);
// Indexes for common queries
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ createdAt: -1 });

// NOTIFICATION SCHEMA
const NotificationSchema = new mongoose.Schema({
    recipient: { type: String, required: true }, // username
    type: { type: String, required: true }, // 'message', 'admin_broadcast', 'like', 'match', 'system'
    title: { type: String, required: true },
    body: { type: String, default: '' },
    sender: { type: String, default: '' }, // username or 'Admin'
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // Additional data (chatUser, etc.)
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = createModel('Notification', NotificationSchema);

const notificationsOverride = []; // In-memory fallback for notifications
const messagesOverride = []; // In-memory fallback for messages

// AUTH SCHEMA
// AUTH SCHEMA
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    fullName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    lastUsernameChange: { type: Date },
    isMember: { type: Boolean, default: false }, // Gold Star
    isVerified: { type: Boolean, default: false }, // Aesthetic Verification
    isAnonymous: { type: Boolean, default: false }, // Privacy
    notifications: { type: Boolean, default: true }, // Push/Email Notifications
    photos: { type: [String], default: [] },
    likedUsers: { type: [String], default: [] },
    seenUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] }, // Blocked usernames
    followers: { type: [String], default: [] },     // User IDs who follow me
    following: { type: [String], default: [] },    // User IDs I follow
    details: {
        hobbies: { type: [String], default: [] },
        smoking: { type: String, default: 'Belirtilmedi' }, 
        relationshipGoal: { type: String, default: 'Belirtilmedi' },
        gender: { type: String, default: 'Belirtilmedi' }
    },
    interestedIn: { type: [String], default: [] },
    location: {
        city: { type: String, default: '' },
        lat: Number,
        lng: Number
    },
    createdAt: { type: Date, default: Date.now }
});
const User = createModel('User', UserSchema);
// Indexes for performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ isMember: 1 });
UserSchema.index({ 'location.city': 1 });

// ... (other code)

// USERS - UPDATE PROFILE
app.put('/api/users/profile', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        // Mock ID extraction
        let userId = token;
        if (userId.startsWith('Bearer ')) userId = userId.slice(7);
        userId = userId.replace('mock-jwt-', '');

        const { fullName, bio, username, avatar, isAnonymous, details, interestedIn, location } = req.body;

        if (isDbConnected) {
            const updates = {};
            if (fullName !== undefined) updates.fullName = fullName;
            if (bio !== undefined) updates.bio = bio;
            if (avatar !== undefined) updates.avatar = avatar;
            if (isAnonymous !== undefined) updates.isAnonymous = isAnonymous;
            if (details !== undefined) updates.details = details;
            if (interestedIn !== undefined) updates.interestedIn = interestedIn;
            if (location !== undefined) updates.location = location;
            if (req.body.notifications !== undefined) updates.notifications = req.body.notifications;
            
            // Username change logic (simplified)
            if (username) {
                const dup = await User.findOne({ username, _id: { $ne: userId } });
                if (dup) return res.status(400).json({ error: 'Username taken' });
                updates.username = username;
            }

            const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
            return res.json({ success: true, user: updatedUser });
        } else {
            const userIndex = usersOverride.findIndex(u => u._id === userId);
            if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
            
            const user = usersOverride[userIndex];
            if (fullName !== undefined) user.fullName = fullName;
            if (bio !== undefined) user.bio = bio;
            if (avatar !== undefined) user.avatar = avatar;
            if (isAnonymous !== undefined) user.isAnonymous = isAnonymous;
            if (details !== undefined) user.details = details;
            if (interestedIn !== undefined) user.interestedIn = interestedIn;
            if (location !== undefined) user.location = location;
            if (req.body.notifications !== undefined) user.notifications = req.body.notifications;

            if (username && username !== user.username) {
                 const dup = usersOverride.find(u => u.username === username && u._id !== userId);
                 if (dup) return res.status(400).json({ error: 'Username taken' });
                 user.username = username;
            }
            
            usersOverride[userIndex] = user;
            return res.json({ success: true, user });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// AUTH - REGISTER
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        if (isDbConnected) {
            const existingUser = await User.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }
            const newUser = new User({ username, email, password, fullName });
            await newUser.save();
            const token = `mock-jwt-${newUser._id}`;
            return res.json({ success: true, token, user: newUser });
        } else {
            const existingUser = usersOverride.find(u => u.email === email || u.username === username);
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }
            const newUser = { 
                _id: 'mem-' + Date.now(), 
                username, email, password, fullName, 
                isMember: false, isVerified: false, 
                createdAt: new Date(),
                stats: { posts: 0, followers: 0, following: 0 },
                blockedUsers: []
            };
            usersOverride.push(newUser);
            const token = `mock-jwt-${newUser._id}`;
            return res.json({ success: true, token, user: newUser });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// AUTH - LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, identifier, password } = req.body; 
        const loginHandles = identifier || username;

        if (!loginHandles || !password) {
            return res.status(400).json({ error: 'Please provide credentials' });
        }

        let user;
        if (isDbConnected) {
            user = await User.findOne({ 
                $or: [{ email: loginHandles }, { username: loginHandles }] 
            });
        } else {
            user = usersOverride.find(u => u.email === loginHandles || u.username === loginHandles);
        }

        if (!user || user.password !== password) {
             return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = `mock-jwt-${user._id}`;
        return res.json({ success: true, token, user });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// USERS - SEARCH
app.get('/api/users/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, users: [] });

        let users = [];
        if (isDbConnected) {
            users = await User.find({
                $or: [
                    { username: { $regex: q, $options: 'i' } },
                    { fullName: { $regex: q, $options: 'i' } }
                ],
                isVerified: true,
                isAnonymous: { $ne: true }
            })
            .select('username fullName avatar bio isMember isVerified')
            .limit(20);
        } else {
            const lowerQ = q.toLowerCase();
            users = usersOverride
                .filter(u => 
                    ((u.username && u.username.toLowerCase().includes(lowerQ)) || 
                    (u.fullName && u.fullName.toLowerCase().includes(lowerQ))) &&
                    u.isVerified === true &&
                    !u.isAnonymous
                )
                .map(u => ({
                    _id: u._id,
                    username: u.username,
                    fullName: u.fullName,
                    avatar: u.avatar,
                    bio: u.bio,
                    isMember: u.isMember,
                    isVerified: u.isVerified
                }))
                .slice(0, 20);
        }

        return res.json({ success: true, users });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// USERS - GET PROFILE
app.get('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const token = req.headers.authorization;
        let me;

        if (token) {
            let cleanToken = token;
            if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
            const myId = cleanToken.replace('mock-jwt-', '');
            if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
            if (!me) me = usersOverride.find(u => u._id === myId);
        }

        let user;
        if (isDbConnected) {
            user = await User.findOne({ username });
        } else {
            user = usersOverride.find(u => u.username === username);
        }

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Handle anonymous users - only visible to users they follow
        if (user.isAnonymous) {
            // Check if the requesting user is someone the anonymous user is following
            const userFollowing = user.following || [];
            const canViewProfile = me && userFollowing.map(id => id.toString()).includes(me._id.toString());
            
            if (canViewProfile) {
                // This user can see the anonymous user's profile (they were followed/contacted)
                let isFollowing = false;
                if (me && user.followers) {
                    isFollowing = user.followers.map(id => id.toString()).includes(me._id.toString());
                }
                
                return res.json({
                    success: true,
                    user: {
                        _id: user._id,
                        username: user.username,
                        fullName: user.fullName,
                        bio: user.bio,
                        avatar: user.avatar,
                        isMember: user.isMember,
                        isVerified: user.isVerified,
                        isAnonymous: true,
                        photos: user.photos || [],
                        details: user.details || {},
                        stats: {
                            posts: user.photos ? user.photos.length : 0,
                            followers: user.followers ? user.followers.length : 0,
                            following: user.following ? user.following.length : 0
                        },
                        isFollowing: isFollowing
                    }
                });
            } else {
                // Hidden profile for others
                const randomCode = user._id ? user._id.toString().slice(-6).toUpperCase() : 'UNK000';
                return res.json({
                    success: true,
                    user: {
                        username: `Member_${randomCode}`,
                        fullName: 'Gizli Üye',
                        bio: 'Bu kullanıcı gizliliğe önem veriyor.',
                        avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                        isMember: user.isMember,
                        isVerified: user.isVerified,
                        photos: [], // Hide photos
                        isAnonymous: true,
                        stats: { posts: 0, followers: 0, following: 0 }
                    }
                });
            }
        }

        let isFollowing = false;
        if (me && user.followers) {
            // Check if my ID is in their followers list
            isFollowing = user.followers.map(id => id.toString()).includes(me._id.toString());
        }

        return res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                bio: user.bio,
                avatar: user.avatar,
                isMember: user.isMember,
                isVerified: user.isVerified,
                photos: user.photos || [],
                details: user.details || {},
                stats: {
                    posts: user.photos ? user.photos.length : 0,
                    followers: user.followers ? user.followers.length : 0,
                    following: user.following ? user.following.length : 0
                },
                isFollowing: isFollowing
            }
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// USERS - FOLLOW
app.post('/api/users/follow/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const targetUsername = req.params.username;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        if (me.username === targetUsername) return res.status(400).json({ error: 'Cannot follow self' });

        let targetUser;
        if (isDbConnected) targetUser = await User.findOne({ username: targetUsername });
        else targetUser = usersOverride.find(u => u.username === targetUsername);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        // Initialize arrays
        if (!me.following) me.following = [];
        if (!targetUser.followers) targetUser.followers = [];

        // Add
        const targetIdStr = targetUser._id.toString();
        const myIdStr = me._id.toString();

        if (!me.following.includes(targetIdStr)) {
            me.following.push(targetIdStr);
        }
        if (!targetUser.followers.includes(myIdStr)) {
            targetUser.followers.push(myIdStr);
        }

        if (isDbConnected) {
            await me.save();
            await targetUser.save();
        }

        return res.json({ success: true, isFollowing: true });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// USERS - UNFOLLOW
app.post('/api/users/unfollow/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const targetUsername = req.params.username;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        let targetUser;
        if (isDbConnected) targetUser = await User.findOne({ username: targetUsername });
        else targetUser = usersOverride.find(u => u.username === targetUsername);
        if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

        // Remove
        const targetIdStr = targetUser._id.toString();
        const myIdStr = me._id.toString();

        if (me.following) {
            me.following = me.following.filter(id => id.toString() !== targetIdStr);
        }
        if (targetUser.followers) {
            targetUser.followers = targetUser.followers.filter(id => id.toString() !== myIdStr);
        }

        if (isDbConnected) {
            await me.save();
            await targetUser.save();
        }

        return res.json({ success: true, isFollowing: false });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET FOLLOWERS LIST
app.get('/api/users/:username/followers', async (req, res) => {
    try {
        const { username } = req.params;
        
        let user;
        if (isDbConnected) {
            user = await User.findOne({ username });
        } else {
            user = usersOverride.find(u => u.username === username);
        }
        
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        
        const followerIds = user.followers || [];
        let followers = [];
        
        if (isDbConnected) {
            followers = await User.find({ _id: { $in: followerIds } })
                .select('username fullName avatar isMember isVerified');
        } else {
            followers = usersOverride
                .filter(u => followerIds.includes(u._id))
                .map(u => ({
                    username: u.username,
                    fullName: u.fullName,
                    avatar: u.avatar,
                    isMember: u.isMember,
                    isVerified: u.isVerified
                }));
        }
        
        res.json({ success: true, users: followers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET FOLLOWING LIST
app.get('/api/users/:username/following', async (req, res) => {
    try {
        const { username } = req.params;
        
        let user;
        if (isDbConnected) {
            user = await User.findOne({ username });
        } else {
            user = usersOverride.find(u => u.username === username);
        }
        
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        
        const followingIds = user.following || [];
        let following = [];
        
        if (isDbConnected) {
            following = await User.find({ _id: { $in: followingIds } })
                .select('username fullName avatar isMember isVerified');
        } else {
            following = usersOverride
                .filter(u => followingIds.includes(u._id))
                .map(u => ({
                    username: u.username,
                    fullName: u.fullName,
                    avatar: u.avatar,
                    isMember: u.isMember,
                    isVerified: u.isVerified
                }));
        }
        
        res.json({ success: true, users: following });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// UPDATE: AUTH - GET CURRENT USER
app.get('/api/auth/me', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const cleanToken = token.replace('Bearer ', '');
        if (!cleanToken.startsWith('mock-jwt-')) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const userId = cleanToken.replace('mock-jwt-', '');
        let user;

        if (isDbConnected) {
             // Validate ObjectId
            if (mongoose.Types.ObjectId.isValid(userId)) {
                 user = await User.findById(userId);
            }
        } else {
            user = usersOverride.find(u => u._id === userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ 
            success: true, 
            user: { 
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName || '',
                bio: user.bio || '',
                avatar: user.avatar || '',
                isMember: user.isMember || false,
                isVerified: user.isVerified || false,
                isAnonymous: user.isAnonymous || false,
                notifications: user.notifications !== false, // default true
                photos: user.photos || [],
                details: user.details || {},
                interestedIn: user.interestedIn || [],
                location: user.location || { city: '' },
                stats: {
                    posts: user.photos ? user.photos.length : 0,
                    followers: user.followers ? user.followers.length : 0,
                    following: user.following ? user.following.length : 0
                }
            } 
        });

    } catch (err) {
        console.error('[API] Auth Me Error:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// ... (Other endpoints remain) ...

// ADMIN - FORCE UPGRADE (Temporary Tool)
app.get('/api/admin/upgrade/:username', async (req, res) => {
    const { username } = req.params;
    try {
        let user;
        if (isDbConnected) {
            user = await User.findOne({ username });
            if (user) {
                user.isMember = true;
                user.isVerified = true;
                await user.save();
            }
        } else {
            user = usersOverride.find(u => u.username === username);
            if (user) {
                user.isMember = true;
                user.isVerified = true;
            }
        }

        if (user) {
            return res.json({ success: true, message: `User ${username} is now a VIP Member & Verified.` });
        } else {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});



// ADMIN - GET ALL USERS (Simple List for Selection)
app.get('/api/admin/users', async (req, res) => {
    try {
        let users = [];
        if (isDbConnected) {
            users = await User.find({}).select('username fullName avatar');
        } else {
            users = usersOverride.map(u => ({ username: u.username, fullName: u.fullName, avatar: u.avatar }));
        }
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADMIN - SEND BULK MESSAGE
app.post('/api/admin/send-message', async (req, res) => {
    try {
        const { recipients, message } = req.body; // recipients: ['username1', 'username2'] or 'all'
        if (!message) return res.status(400).json({ error: 'Message required' });

        const sender = 'The Vault Admin'; // System sender

        let targetUsernames = [];

        if (recipients === 'all') {
             if (isDbConnected) {
                 const allUsers = await User.find({}).select('username');
                 targetUsernames = allUsers.map(u => u.username);
             } else {
                 targetUsernames = usersOverride.map(u => u.username);
             }
        } else if (Array.isArray(recipients)) {
            targetUsernames = recipients;
        }

        console.log(`[ADMIN] Sending message to ${targetUsernames.length} users: ${message}`);

        if (isDbConnected) {
            const messages = targetUsernames.map(username => ({
                sender,
                receiver: username,
                text: message,
                createdAt: new Date()
            }));
            await Message.insertMany(messages);
        } else {
            targetUsernames.forEach(username => {
                messagesOverride.push({
                    sender,
                    receiver: username,
                    text: message,
                    createdAt: new Date()
                });
            });
        }

        res.json({ success: true, count: targetUsernames.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADMIN - DELETE USER
app.delete('/api/admin/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (isDbConnected) {
             await User.findOneAndDelete({ username });
        } else {
             const idx = usersOverride.findIndex(u => u.username === username);
             if (idx !== -1) usersOverride.splice(idx, 1);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADMIN - UPDATE USER
app.put('/api/admin/users/:originalUsername', async (req, res) => {
    try {
        const { originalUsername } = req.params;
        const updates = req.body; // { username, fullName, ... }

        if (isDbConnected) {
            await User.findOneAndUpdate({ username: originalUsername }, updates);
        } else {
            const user = usersOverride.find(u => u.username === originalUsername);
            if (user) {
                Object.assign(user, updates);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADMIN - CREATE USER
app.post('/api/admin/create-user', async (req, res) => {
    try {
        const { username, password, fullName } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and Password required' });
        }

        // Auto-generate email if not provided (required by schema)
        const email = req.body.email || `${username.toLowerCase().replace(/\s+/g, '')}@thevault.local`;

        if (isDbConnected) {
            // Check duplicate username
            const existsUsername = await User.findOne({ username });
            if (existsUsername) return res.status(400).json({ success: false, error: 'Username already exists' });
            
            // Check duplicate email
            const existsEmail = await User.findOne({ email });
            if (existsEmail) return res.status(400).json({ success: false, error: 'Email already exists' });

            await User.create({
                username,
                password,
                fullName: fullName || '',
                email,
                avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                notifications: true,
                photos: [],
                isMember: false,
                isVerified: false,
                isAnonymous: false
            });
        } else {
             const exists = usersOverride.find(u => u.username === username);
             if (exists) return res.status(400).json({ success: false, error: 'User exists' });

            usersOverride.push({ 
                username,
                password,
                fullName: fullName || '',
                email,
                _id: Date.now().toString(),
                avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                notifications: true,
                photos: [],
                isMember: false,
                isVerified: false,
                isAnonymous: false
            });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ADMIN - DASHBOARD STATS
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        let stats = {
            totalUsers: 0,
            vipUsers: 0,
            verifiedUsers: 0,
            anonymousUsers: 0,
            recentUsers: [] // Last 20 registered
        };

        if (isDbConnected) {
            stats.totalUsers = await User.countDocuments({});
            stats.vipUsers = await User.countDocuments({ isMember: true });
            stats.verifiedUsers = await User.countDocuments({ isVerified: true });
            stats.anonymousUsers = await User.countDocuments({ isAnonymous: true });
            stats.recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(20).select('username fullName avatar createdAt');
        } else {
            stats.totalUsers = usersOverride.length;
            stats.vipUsers = usersOverride.filter(u => u.isMember).length;
            stats.verifiedUsers = usersOverride.filter(u => u.isVerified).length;
            stats.anonymousUsers = usersOverride.filter(u => u.isAnonymous).length;
            stats.recentUsers = usersOverride.slice(-20).reverse().map(u => ({
                username: u.username, fullName: u.fullName, avatar: u.avatar, createdAt: u.createdAt
            }));
        }

        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET VIP MEMBERS - For Discover Page VIP Section
app.get('/api/users/vip', async (req, res) => {
    try {
        let vipUsers = [];
        
        if (isDbConnected) {
            vipUsers = await User.find({ isMember: true })
                .select('username fullName avatar photos location details')
                .sort({ createdAt: -1 })
                .limit(20);
        } else {
            vipUsers = usersOverride
                .filter(u => u.isMember)
                .slice(0, 20)
                .map(u => ({
                    username: u.username,
                    fullName: u.fullName,
                    avatar: u.avatar,
                    photos: u.photos,
                    location: u.location,
                    details: u.details
                }));
        }
        
        res.json({ success: true, users: vipUsers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADMIN - BULK ACTION
app.post('/api/admin/bulk-action', async (req, res) => {
    try {
        const { usernames, action } = req.body;
        // action: 'makeVip', 'removeVip', 'verify', 'unverify', 'delete'

        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return res.status(400).json({ success: false, error: 'No users selected' });
        }

        let affected = 0;

        if (isDbConnected) {
            if (action === 'makeVip') {
                const result = await User.updateMany({ username: { $in: usernames } }, { isMember: true });
                affected = result.modifiedCount;
            } else if (action === 'removeVip') {
                const result = await User.updateMany({ username: { $in: usernames } }, { isMember: false });
                affected = result.modifiedCount;
            } else if (action === 'verify') {
                const result = await User.updateMany({ username: { $in: usernames } }, { isVerified: true });
                affected = result.modifiedCount;
            } else if (action === 'unverify') {
                const result = await User.updateMany({ username: { $in: usernames } }, { isVerified: false });
                affected = result.modifiedCount;
            } else if (action === 'delete') {
                const result = await User.deleteMany({ username: { $in: usernames } });
                affected = result.deletedCount;
            }
        } else {
            usernames.forEach(uname => {
                const user = usersOverride.find(u => u.username === uname);
                if (user) {
                    affected++;
                    if (action === 'makeVip') user.isMember = true;
                    else if (action === 'removeVip') user.isMember = false;
                    else if (action === 'verify') user.isVerified = true;
                    else if (action === 'unverify') user.isVerified = false;
                    else if (action === 'delete') {
                        const idx = usersOverride.indexOf(user);
                        if (idx > -1) usersOverride.splice(idx, 1);
                    }
                }
            });
        }

        res.json({ success: true, affected });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});



// ADMIN - GET ALL USERS (Simple List for Selection)
app.get('/api/admin/users', async (req, res) => {
    try {
        let users = [];
        console.log('[ADMIN] Fetching users, isDbConnected:', isDbConnected);
        
        if (isDbConnected) {
            // Try direct collection access first for debugging
            const usersCollection = mongoose.connection.db.collection('users');
            const directUsers = await usersCollection.find({}).toArray();
            console.log('[ADMIN] Direct query found:', directUsers.length, 'users');
            
            users = directUsers.map(u => ({
                username: u.username,
                fullName: u.fullName,
                avatar: u.avatar,
                isMember: u.isMember,
                isVerified: u.isVerified,
                isAnonymous: u.isAnonymous
            }));
            console.log('[ADMIN] Mapped', users.length, 'users');
        } else {
            users = usersOverride.map(u => ({ 
                username: u.username, 
                fullName: u.fullName, 
                avatar: u.avatar,
                isMember: u.isMember,
                isVerified: u.isVerified,
                isAnonymous: u.isAnonymous
            }));
            console.log('[ADMIN] Found', users.length, 'users from memory');
        }
        res.json({ success: true, users });
    } catch (err) {
        console.log('[ADMIN] Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ADMIN - SEND BULK MESSAGE
app.post('/api/admin/send-message', async (req, res) => {
    try {
        const { recipients, message } = req.body; // recipients: ['username1', 'username2'] or 'all'
        if (!message) return res.status(400).json({ error: 'Message required' });

        const sender = 'The Vault Admin'; // System sender

        let targetUsernames = [];

        if (recipients === 'all') {
             if (isDbConnected) {
                 const allUsers = await User.find({}).select('username');
                 targetUsernames = allUsers.map(u => u.username);
             } else {
                 targetUsernames = usersOverride.map(u => u.username);
             }
        } else if (Array.isArray(recipients)) {
            targetUsernames = recipients;
        }

        console.log(`[ADMIN] Sending message to ${targetUsernames.length} users: ${message}`);
        console.log(`[ADMIN] isDbConnected: ${isDbConnected}`);

        if (isDbConnected) {
            // Create messages
            const messages = targetUsernames.map(username => ({
                sender,
                receiver: username,
                text: message,
                createdAt: new Date()
            }));
            await Message.insertMany(messages);

            // Create notifications for each user
            const notifications = targetUsernames.map(username => ({
                recipient: username,
                type: 'admin_broadcast',
                title: 'The Vault Admin',
                body: message.length > 100 ? message.substring(0, 100) + '...' : message,
                sender: 'Admin',
                data: { chatUser: 'The Vault Admin' },
                isRead: false,
                createdAt: new Date()
            }));
            console.log('[ADMIN] Creating notifications:', notifications.length);
            const insertedNotifications = await Notification.insertMany(notifications);
            console.log('[ADMIN] Notifications created:', insertedNotifications.length);
        } else {
            targetUsernames.forEach(username => {
                // Create message
                messagesOverride.push({
                    sender,
                    receiver: username,
                    text: message,
                    createdAt: new Date()
                });
                // Create notification
                notificationsOverride.push({
                    _id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    recipient: username,
                    type: 'admin_broadcast',
                    title: 'The Vault Admin',
                    body: message.length > 100 ? message.substring(0, 100) + '...' : message,
                    sender: 'Admin',
                    data: { chatUser: 'The Vault Admin' },
                    isRead: false,
                    createdAt: new Date()
                });
            });
        }

        res.json({ success: true, count: targetUsernames.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// USER - UPLOAD PHOTOS
app.post('/api/users/photos', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        const { photoUrl } = req.body; // Expecting Base64 or URL
        if (!photoUrl) return res.status(400).json({ error: 'Photo required' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        if (isDbConnected) {
             me.photos.push(photoUrl);
             await me.save();
        } else {
             if (!me.photos) me.photos = [];
             me.photos.push(photoUrl);
        }
        return res.json({ success: true, photos: me.photos });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// USER - DELETE PHOTO
app.delete('/api/users/photos', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        const { photoIndex } = req.body;
        // Strictly require index now for safety and performance
        if (photoIndex === undefined || photoIndex === null) {
            return res.status(400).json({ error: 'Photo index required' });
        }

        const myId = token.replace(/^Bearer /, '').replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        const idx = Number(photoIndex);
        if (isNaN(idx)) return res.status(400).json({ error: 'Invalid index' });

        if (me.photos && idx >= 0 && idx < me.photos.length) {
            me.photos.splice(idx, 1);
            if (isDbConnected) await me.save();
        } else {
             return res.status(400).json({ error: 'Invalid photo index range' });
        }
        
        return res.json({ success: true, photos: me.photos });

    } catch (err) {
        console.error('Delete error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// GET RANDOM PHOTOS FROM VERIFIED NON-VIP USERS
// GET RANDOM PHOTOS FROM VERIFIED USERS (Discover Feed)
app.get('/api/users/photos/random', async (req, res) => {
    try {
        const token = req.headers.authorization;
        let myId = null;
        if (token) {
            let cleanToken = token.replace('Bearer ', '');
            if (cleanToken.startsWith('mock-jwt-')) {
                myId = cleanToken.replace('mock-jwt-', '');
            }
        }

        let me;
        if (myId) {
             if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
             if (!me) me = usersOverride.find(u => u._id === myId);
        }

        const seenList = me ? (me.seenUsers || []) : [];
        // Also exclude Blocked users
        const blockedList = me ? (me.blockedUsers || []) : [];
        const excludeList = [...seenList, ...blockedList];
        if (me) excludeList.push(me.username); // Exclude self
        
        console.log(`[RANDOM] Request from ${me ? me.username : 'anon'}. Excluding ${excludeList.length} users.`);

        let candidates = [];
        if (isDbConnected) {
            // MongoDB Query
            let query = { 
                // isVerified: true, // Allow all users for now
                isAnonymous: { $ne: true },
                username: { $nin: excludeList },
                photos: { $exists: true, $not: { $size: 0 } } 
            };
            
            // Gender Preference Filter
            if (me && me.interestedIn && me.interestedIn.length > 0) {
                query['details.gender'] = { $in: me.interestedIn };
            }

            candidates = await User.find(query).select('photos username avatar details interestedIn location isMember isAnonymous');
        } else {
            // Memory Fallback
            candidates = usersOverride.filter(u => 
                // u.isVerified && // Allow all
                !u.isAnonymous && 
                u.photos && u.photos.length > 0 &&
                !excludeList.includes(u.username) &&
                // Gender Filter (Memory)
                (!me || !me.interestedIn || me.interestedIn.length === 0 || (u.details && me.interestedIn.includes(u.details.gender)))
            );
        }
        
        
        // Distance Calculation Helper
        function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
            var R = 6371; // Radius of the earth in km
            var dLat = deg2rad(lat2-lat1); 
            var dLon = deg2rad(lon2-lon1); 
            var a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            var d = R * c; // Distance in km
            return d;
        }

        function deg2rad(deg) {
            return deg * (Math.PI/180);
        }

        // NEW SORTING LOGIC:
        // Priority 1: VIP members (isMember=true, isAnonymous=false) first
        // Priority 2: Location proximity
        // Priority 3: Regular users
        
        const myLat = me?.location?.lat;
        const myLng = me?.location?.lng;
        const myCity = (me?.location?.city || '').toLowerCase().trim();

        candidates.sort((a, b) => {
            // VIP Priority (non-anonymous VIP members first)
            const aIsVip = a.isMember && !a.isAnonymous;
            const bIsVip = b.isMember && !b.isAnonymous;
            
            if (aIsVip && !bIsVip) return -1; // A is VIP, B is not -> A first
            if (!aIsVip && bIsVip) return 1;  // B is VIP, A is not -> B first
            
            // If same VIP status, sort by distance
            let distA = 100000; // Default: Far
            let distB = 100000;

            // Calculate distance for A
            if (myLat && myLng && a.location?.lat && a.location?.lng) {
                distA = getDistanceFromLatLonInKm(myLat, myLng, a.location.lat, a.location.lng);
            } else if (myCity && a.location?.city && a.location.city.toLowerCase().trim() === myCity) {
                distA = 20; // Same city match
            }

            // Calculate distance for B
            if (myLat && myLng && b.location?.lat && b.location?.lng) {
                distB = getDistanceFromLatLonInKm(myLat, myLng, b.location.lat, b.location.lng);
            } else if (myCity && b.location?.city && b.location.city.toLowerCase().trim() === myCity) {
                distB = 20;
            }
             
            return distA - distB;
        });

        let allPhotos = [];
        candidates.forEach(user => {
            if (user.photos && user.photos.length > 0) {
                // Pick ONE random photo per user to avoid duplicates in feed
                const randomPhoto = user.photos[Math.floor(Math.random() * user.photos.length)];
                allPhotos.push({ 
                     photo: randomPhoto, 
                     username: user.username, 
                     avatar: user.avatar,
                     isMember: user.isMember || false,
                     details: user.details || {},
                     location: user.location // Send location to frontend
                });
            }
        });

        // Keep sorted order (VIP first, then by distance)
        allPhotos = allPhotos.slice(0, 50);
        return res.json({ success: true, photos: allPhotos });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// AESTHETIC MEMBER - SUBMIT APPLICATION
app.post('/api/aesthetic/apply', async (req, res) => {
  try {
      const { username, dob, livenessImage } = req.body;
      
      if (!username || !livenessImage) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const isLive = true; 
      
      if (isLive) {
          if (isDbConnected) {
            const newApp = new Application({
                username,
                dob,
                livenessImage
            });
            await newApp.save();
            
            // Auto-verify user for this demo
            await User.findOneAndUpdate({ username }, { isVerified: true });

            return res.status(200).json({ 
                success: true, 
                message: 'Application successful. Account Verified.',
                applicationId: newApp._id
            });
          } else {
             // Memory fallback
             const user = usersOverride.find(u => u.username === username);
             if (user) {
                 user.isVerified = true;
                 // Note: isMember remains false (standard user)
             }

             return res.status(200).json({  
                success: true, 
                message: 'Application saved (Memory). Account Verified.',
                applicationId: 'MEM-' + Date.now()
            });
          }
      } else {
          return res.status(400).json({ success: false, error: 'Liveness check failed.' });
      }
  } catch (err) {
      console.error('[API] Aesthetic Error:', err);
      return res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// VAULT MEMBER - SUBSCRIBE (SECURE)
app.post('/api/vault/subscribe', async (req, res) => {
    try {
        const { paymentToken, email } = req.body; 
        const token = req.headers.authorization;

        if (!paymentToken) {
            return res.status(400).json({ success: false, error: 'Invalid Payment Token' });
        }

        const memberId = `VAULT-${Math.floor(Math.random() * 10000)}`;
        let userToUpdate = null;

        console.log('[API] Subscribe Request:', { hasToken: !!token, emailInBody: email });

        if (token) {
             const cleanToken = token.replace('Bearer ', '');
             if (cleanToken.startsWith('mock-jwt-')) {
                 const userId = cleanToken.replace('mock-jwt-', '');
                 
                 if (isDbConnected && mongoose.Types.ObjectId.isValid(userId)) {
                     userToUpdate = await User.findById(userId);
                 } else {
                     userToUpdate = usersOverride.find(u => u._id === userId);
                 }
             }
        } 
        
        if (!userToUpdate && email) {
             if (isDbConnected) {
                 userToUpdate = await User.findOne({ email });
             } else {
                 userToUpdate = usersOverride.find(u => u.email === email);
             }
        }

        if (isDbConnected) {
            const newMember = new Member({
                memberId,
                email: email || (userToUpdate ? userToUpdate.email : 'anonymous@vault.com'),
                paymentToken
            });
            await newMember.save();

            if (userToUpdate) {
                userToUpdate.isMember = true;
                userToUpdate.isVerified = true; 
                await userToUpdate.save();
            }
        } else {
             if (userToUpdate) {
                 userToUpdate.isMember = true;
                 userToUpdate.isVerified = true;
             }
        }

        return res.status(200).json({
            success: true,
            message: 'Subscription Active. Welcome to The Vault.',
            transactionId: `TXN-${Date.now()}`,
            memberId: memberId
        });
    } catch (err) {
        console.error('[API] Subscription Error:', err);
        return res.status(500).json({ success: false, error: 'Database Subscription Error' });
    }
});

// MESSAGES - GET CONVERSATIONS LIST
app.get('/api/messages/conversations', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        let me;
        if (isDbConnected) {
             if (mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        }
        if (!me) me = usersOverride.find(u => u._id === myId);
        
        if (!me) return res.status(404).json({ error: 'User not found' });
        const myUsername = me.username;

        let conversationPartners = new Set();
        let lastMessages = {};

        if (isDbConnected) {
            const messages = await Message.find({
                $or: [{ sender: myUsername }, { receiver: myUsername }]
            }).sort({ createdAt: -1 });

            messages.forEach(msg => {
                const partner = msg.sender === myUsername ? msg.receiver : msg.sender;
                if (!conversationPartners.has(partner)) {
                    conversationPartners.add(partner);
                    lastMessages[partner] = msg;
                }
            });
        } else {
             const messages = messagesOverride.filter(m => 
                m.sender === myUsername || m.receiver === myUsername
            ).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            messages.forEach(msg => {
                const partner = msg.sender === myUsername ? msg.receiver : msg.sender;
                if (!conversationPartners.has(partner)) {
                    conversationPartners.add(partner);
                    lastMessages[partner] = msg;
                }
            });
        }

        const conversations = [];
        for (const username of conversationPartners) {
            // Handle system users like "The Vault Admin"
            if (username === 'The Vault Admin') {
                conversations.push({
                    username: 'The Vault Admin',
                    avatar: 'https://cdn-icons-png.flaticon.com/512/1246/1246326.png', // Gold shield icon
                    lastMessage: lastMessages[username]?.text || '',
                    isAdmin: true
                });
                continue;
            }

            let user;
            if (isDbConnected) user = await User.findOne({ username });
            else user = usersOverride.find(u => u.username === username);

            if (user) {
                conversations.push({
                    username: user.username,
                    avatar: user.avatar,
                    lastMessage: lastMessages[username]?.text || ''
                });
            }
        }

        return res.json({ success: true, conversations });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// MESSAGES - GET HISTORY
app.get('/api/messages/:otherUser', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const otherUser = req.params.otherUser.trim();
        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected) {
             if (mongoose.Types.ObjectId.isValid(myId)) {
                 me = await User.findById(myId);
             }
        }
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me) return res.status(404).json({ error: 'User not found' });
        const myUsername = me.username;
        
        let messages = [];
        if (isDbConnected) {
            messages = await Message.find({
                $or: [
                    { sender: myUsername, receiver: otherUser },
                    { sender: otherUser, receiver: myUsername }
                ]
            }).sort({ createdAt: 1 });
        } else {
            messages = messagesOverride.filter(m => 
                (m.sender === myUsername && m.receiver === otherUser) ||
                (m.sender === otherUser && m.receiver === myUsername)
            ).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        
        return res.json({ success: true, messages });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// MESSAGES - SEND
app.post('/api/messages', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me) return res.status(404).json({ error: 'User not found' });

        const { receiver, text } = req.body;
        const myUsername = me.username;

        // Check if receiver exists & Blocking Logic
        let receiverUser;
        if (isDbConnected) {
             receiverUser = await User.findOne({ username: receiver });
        } else {
             receiverUser = usersOverride.find(u => u.username === receiver);
        }

        if (!receiverUser) return res.status(404).json({ error: 'Receiver not found' });

        // BLOCKING CHECK
        if (me.blockedUsers && me.blockedUsers.includes(receiver)) {
            return res.status(403).json({ error: 'You have blocked this user. Unblock to send message.' });
        }
        if (receiverUser.blockedUsers && receiverUser.blockedUsers.includes(myUsername)) {
            return res.status(403).json({ error: 'You are blocked by this user.' });
        }

        if (!me.isMember) {
             let conversationExists = false;
             if (isDbConnected) {
                  const existingMsg = await Message.findOne({
                      $or: [
                          { sender: myUsername, receiver },
                          { sender: receiver, receiver: myUsername }
                      ]
                  });
                  if (existingMsg) conversationExists = true;
             } else {
                  const existingMsg = messagesOverride.find(m => 
                      (m.sender === myUsername && m.receiver === receiver) ||
                      (m.sender === receiver && m.receiver === myUsername)
                  );
                  if (existingMsg) conversationExists = true;
             }
             if (!conversationExists) {
                  return res.status(403).json({ success: false, error: 'Sadece VIP üyeler yeni sohbet başlatabilir.' });
             }
        }

        if (isDbConnected) {
            const newMsg = new Message({ sender: myUsername, receiver, text });
            await newMsg.save();
            
            // Create notification for receiver
            const newNotification = new Notification({
                recipient: receiver,
                type: 'message',
                title: me.fullName || myUsername,
                body: text.length > 50 ? text.substring(0, 50) + '...' : text,
                sender: myUsername,
                data: { chatUser: myUsername },
                isRead: false
            });
            await newNotification.save();
            
            return res.json({ success: true, message: newMsg });
        } else {
            const newMsg = { 
                _id: 'msg-' + Date.now(),
                sender: myUsername, 
                receiver, 
                text, 
                createdAt: new Date() 
            };
            messagesOverride.push(newMsg);
            
            // Create notification for receiver
            notificationsOverride.push({
                _id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                recipient: receiver,
                type: 'message',
                title: me.fullName || myUsername,
                body: text.length > 50 ? text.substring(0, 50) + '...' : text,
                sender: myUsername,
                data: { chatUser: myUsername },
                isRead: false,
                createdAt: new Date()
            });
            
            return res.json({ success: true, message: newMsg });
        }

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// MESSAGES - DELETE
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const { id } = req.params;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        
        if (!me) return res.status(404).json({ error: 'User not found' });
        const myUsername = me.username;

        if (isDbConnected) {
             const msg = await Message.findById(id);
             if (!msg) return res.status(404).json({ error: 'Message not found' });
             if (msg.sender !== myUsername) return res.status(403).json({ error: 'You can only delete your own messages' });
             await Message.findByIdAndDelete(id);
        } else {
             const idx = messagesOverride.findIndex(m => m._id === id);
             if (idx === -1) return res.status(404).json({ error: 'Message not found' });
             if (messagesOverride[idx].sender !== myUsername) return res.status(403).json({ error: 'You can only delete your own messages' });
             messagesOverride.splice(idx, 1);
        }

        return res.json({ success: true, message: 'Message deleted' });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// USERS - BLOCK
app.post('/api/users/block/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const targetUsername = req.params.username;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me) return res.status(404).json({ error: 'User not found' });
        if (me.username === targetUsername) return res.status(400).json({ error: 'Cannot block self' });

        if (isDbConnected) {
            if (!me.blockedUsers.includes(targetUsername)) {
                me.blockedUsers.push(targetUsername);
                await me.save();
            }
        } else {
            if (!me.blockedUsers) me.blockedUsers = [];
            if (!me.blockedUsers.includes(targetUsername)) {
                me.blockedUsers.push(targetUsername);
            }
        }

        return res.json({ success: true, message: `User @${targetUsername} blocked.` });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// USERS - UNBLOCK
app.post('/api/users/unblock/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const targetUsername = req.params.username;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me) return res.status(404).json({ error: 'User not found' });

        if (isDbConnected) {
            if (me.blockedUsers && me.blockedUsers.includes(targetUsername)) {
                me.blockedUsers = me.blockedUsers.filter(u => u !== targetUsername);
                await me.save();
            }
        } else {
            if (me.blockedUsers) {
                me.blockedUsers = me.blockedUsers.filter(u => u !== targetUsername);
            }
        }

        return res.json({ success: true, message: `User @${targetUsername} unblocked.` });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/report/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        const targetUsername = req.params.username;
        const { reason, description } = req.body;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        console.log('--- NEW USER REPORT ---');
        console.log(`Reporter: ${me ? me.username : myId}`);
        console.log(`Reported User: ${targetUsername}`);
        console.log(`Reason: ${reason}`);
        console.log(`Description: ${description}`);
        console.log('-----------------------');

        // In a real app, you would save this to a "Reports" collection.
        // const newReport = new Report({ reporter: me._id, reported: targetUsername, reason, description });
        // await newReport.save();

        return res.json({ success: true, message: 'Report submitted successfully.' });
    } catch (err) {
        console.error('Report error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// DISCOVER - LIKE
app.post('/api/users/like/:username', async (req, res) => {
    try {
        console.log('[LIKE] Hit endpoint');
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const targetUsername = req.params.username;
        console.log(`[LIKE] UserID: ${myId} -> Target: ${targetUsername}`);

        const targetUserCheck = isDbConnected 
            ? await User.findOne({ username: targetUsername })
            : usersOverride.find(u => u.username === targetUsername);

        if (!targetUserCheck) return res.status(404).json({ error: 'Target user not found' });

        if (isDbConnected) {
             // Atomic update to prevent race conditions or save errors
             me = await User.findByIdAndUpdate(
                 myId, 
                 { 
                     $addToSet: { 
                         likedUsers: targetUsername, 
                         seenUsers: targetUsername 
                     } 
                 },
                 { new: true }
             );
             
             // BOT AUTO-LIKE MAGIC (Make bots like back instantly)
             if (targetUserCheck.email && targetUserCheck.email.endsWith('@bot.com')) {
                 if (!targetUserCheck.likedUsers.includes(me.username)) {
                      targetUserCheck.likedUsers.push(me.username);
                      await targetUserCheck.save();
                      console.log(`[BOT-MATCH] Bot ${targetUserCheck.username} auto-liked ${me.username}`);
                 }
             }

             // Check match logic
             const isMatch = targetUserCheck.likedUsers && targetUserCheck.likedUsers.includes(me.username);
             
             if (isMatch) {
                 // Send match message logic...
                 const matchMsgText = "It's a Match! 🥂";
                 const exists = await Message.findOne({
                     $or: [
                         { sender: me.username, receiver: targetUsername, text: matchMsgText },
                         { sender: targetUsername, receiver: me.username, text: matchMsgText }
                     ]
                 });
                 if (!exists) {
                     await new Message({ sender: 'System', receiver: me.username, text: `You matched with @${targetUsername}!` }).save();
                     await new Message({ sender: 'System', receiver: targetUsername, text: `You matched with @${me.username}!` }).save();
                     await new Message({ sender: me.username, receiver: targetUsername, text: matchMsgText }).save();
                 }
             }
             
             return res.json({ success: true, match: isMatch });

        } else {
            // Memory Fallback
             let meOverride = usersOverride.find(u => u._id === myId);
             if (!meOverride) return res.status(404).json({ error: 'User not found' });
             
             if (!meOverride.likedUsers) meOverride.likedUsers = [];
             if (!meOverride.seenUsers) meOverride.seenUsers = [];
             
             if (!meOverride.likedUsers.includes(targetUsername)) meOverride.likedUsers.push(targetUsername);
             if (!meOverride.seenUsers.includes(targetUsername)) meOverride.seenUsers.push(targetUsername);
             
             const isMatch = targetUserCheck.likedUsers && targetUserCheck.likedUsers.includes(meOverride.username);
             
             return res.json({ success: true, match: isMatch, memory: true });
        }

    } catch (err) {
        console.error('Like error:', err);
        return res.status(500).json({ error: err.message });
    }
});

// DISCOVER - PASS
app.post('/api/users/pass/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        const cleanToken = token.replace('Bearer ', '').replace('mock-jwt-', '');
        const targetUsername = req.params.username;

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(cleanToken)) me = await User.findById(cleanToken);
        if (!me) me = usersOverride.find(u => u._id === cleanToken);
        if (!me) return res.status(404).json({ error: 'User not found' });

        if (!me.seenUsers) me.seenUsers = [];
        if (!me.seenUsers.includes(targetUsername)) {
            me.seenUsers.push(targetUsername);
        }

        if (isDbConnected) await me.save();

        return res.json({ success: true });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// DISCOVER - UNLIKE (Remove Like)
app.post('/api/users/unlike/:username', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        const targetUsername = req.params.username;

        if (isDbConnected) {
             await User.findByIdAndUpdate(myId, { $pull: { likedUsers: targetUsername } });
        } else {
             const me = usersOverride.find(u => u._id === myId);
             if (me && me.likedUsers) {
                 me.likedUsers = me.likedUsers.filter(u => u !== targetUsername);
             }
        }
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ADMIN - CLEAR BOTS
app.get('/api/admin/clear-bots', async (req, res) => {
    try {
        if (isDbConnected) {
             await User.deleteMany({ email: { $regex: '@bot.com$' } });
        } else {
             const nonBots = usersOverride.filter(u => !u.email.endsWith('@bot.com'));
             usersOverride.length = 0;
             usersOverride.push(...nonBots);
        }
        return res.json({ success: true, message: 'All bots removed.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ADMIN - SEED BOTS
app.get('/api/admin/seed', async (req, res) => {
    try {
        const firstNames = ["Selin", "Elif", "Ayşe", "Fatma", "Zeynep", "Melis", "Deniz", "Ece", "Gizem", "Pelin", "Damla", "Gamze", "Buse", "Ceren", "Derya", "Ezgi", "İrem", "Kübra", "Merve", "Nazlı", "Özge", "Pınar", "Seda", "Sinem", "Tuğba", "Yağmur", "Leyla", "Bahar", "Aslı", "Didem", "Esra", "Funda", "Gözde", "Hande", "Işıl", "Jale", "Lale", "Mine", "Nihan", "Oya", "Sibel", "Yelda", "Zehra"];
        const lastNames = ["Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Polat", "Erdoğan", "Yıldız", "Yalçın"];
        
        const hobbiesList = ["Müzik", "Seyahat", "Spor", "Sanat", "Dans", "Yemek", "Kitap", "Fotoğraf", "Doğa", "Moda", "Sinema", "Teknoloji"];
        const smokingList = ["Sigara Kullanıyorum", "Sigara Kullanmıyorum", "Sosyal İçici"];
        const relationList = ["Ciddi İlişki", "Sadece Eğlence", "Arkadaşlık", "Belirsiz", "Uzun Dönem"];

        if (isDbConnected) {
             await User.deleteMany({ email: { $regex: '@bot.com$' } });
        } else {
             const nonBots = usersOverride.filter(u => !u.email.endsWith('@bot.com'));
             usersOverride.length = 0;
             usersOverride.push(...nonBots);
        }

        let count = 0;
        const bots = [];

        const aestheticPhotos = [
            "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1506956191951-7a88da4435e5?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1554151228-14d9def656ec?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1588953936179-d2a4734c5490?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1464863979621-258859e62245?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1542596594-649edbc13630?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80",
            "https://images.unsplash.com/photo-1532074205216-d0e1f4b87368?ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80"
        ];

        for(let i=0; i<100; i++) {
             const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
             const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
             const rand = Math.floor(Math.random() * 100000);
             const username = `${fn.toLowerCase()}_${ln.toLowerCase()}_${rand}`;
             const email = `${username}@bot.com`; 
             
             const shuffledPhotos = [...aestheticPhotos].sort(() => 0.5 - Math.random());
             const userPhotos = shuffledPhotos.slice(0, 6); 
             
             const avatar = userPhotos[0];

             const h1 = hobbiesList[Math.floor(Math.random() * hobbiesList.length)];
             let h2 = hobbiesList[Math.floor(Math.random() * hobbiesList.length)];
             while(h1 === h2) h2 = hobbiesList[Math.floor(Math.random() * hobbiesList.length)];

             const botUser = {
                 username,
                 email,
                 password: 'password123',
                 fullName: `${fn} ${ln}`,
                 bio: 'Hayatı dolu dolu yaşayan, maceraperest bir ruh. ✈️📸 📍İstanbul',
                 avatar: avatar,
                 isVerified: true,
                 isMember: Math.random() > 0.8,
                 photos: userPhotos,
                 likedUsers: [],
                 seenUsers: [],
                 blockedUsers: [],
                 details: {
                     gender: 'Kadın',
                     hobbies: [h1, h2],
                     smoking: smokingList[Math.floor(Math.random() * smokingList.length)],
                     relationshipGoal: relationList[Math.floor(Math.random() * relationList.length)]
                 },
                 createdAt: new Date()
             };
             bots.push(botUser);
        }
        
        if (isDbConnected) {
            for (const bot of bots) {
                 await new User(bot).save();
                 count++;
            }
            return res.json({ success: true, message: `${count} Female Bots seeded to DB` });
        } else {
            bots.forEach(bot => {
                bot._id = 'bot-' + Math.random().toString(36).substr(2, 9);
                usersOverride.push(bot);
                count++;
            });
            return res.json({ success: true, message: `${count} Female Bots seeded to Memory` });
        }

    } catch(err) {
        return res.status(500).json({ error: err.message });
    }
});
app.get('/api/admin/users', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        // Authenticate as Admin
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me || me.username !== 'admin') {
            return res.status(403).json({ error: 'Admin access only' });
        }

        let users = [];
        if (isDbConnected) {
            users = await User.find({}).sort({ createdAt: -1 });
        } else {
            users = [...usersOverride].reverse();
        }

        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN - DELETE USER
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me || me.username !== 'admin') {
            return res.status(403).json({ error: 'Admin access only' });
        }

        const { id } = req.params;
        if (id === me._id.toString()) return res.status(400).json({ error: 'Cannot delete self' });

        if (isDbConnected) {
            if (mongoose.Types.ObjectId.isValid(id)) await User.findByIdAndDelete(id);
        } else {
            const idx = usersOverride.findIndex(u => u._id === id);
            if (idx !== -1) usersOverride.splice(idx, 1);
        }

        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN - RESET ALL INTERACTIONS (Fresh Start)
app.get('/api/admin/reset-all-interactions', async (req, res) => {
    try {
        if (isDbConnected) {
            await User.updateMany({}, { $set: { seenUsers: [], likedUsers: [] } });
        } else {
            usersOverride.forEach(u => {
                u.seenUsers = [];
                u.likedUsers = [];
            });
        }
        return res.json({ success: true, message: 'All user interactions (seen/liked) reset.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// DISCOVER - RESET
app.post('/api/users/discover/reset', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        // Keep only liked users in seen list (resetting the passed ones)
        const likedList = me.likedUsers || [];
        const blockedList = me.blockedUsers || [];
        
        // Reset seenUsers to only contain people we have Liked or Blocked (so we don't see them again).
        // People we 'Passed' will be removed from seenUsers, so they appear again.
        if (me.seenUsers) {
            console.log(`[RESET] Before: ${me.seenUsers.length} seen users.`);
            me.seenUsers = me.seenUsers.filter(username => 
                likedList.includes(username) || blockedList.includes(username)
            );
            console.log(`[RESET] After: ${me.seenUsers.length} seen users.`);
        }

        if (isDbConnected) await me.save();

        return res.json({ success: true, message: 'Discovery history reset.' });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// USERS - GET MY LIKES
app.get('/api/users/my-likes', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        const likedUsernames = me.likedUsers || [];
        console.log(`[MY-LIKES] Count: ${likedUsernames.length}`);
        
        let likedProfiles = [];
        if (isDbConnected) {
            likedProfiles = await User.find({ username: { $in: likedUsernames } })
                                      .select('username avatar photos details location');
        } else {
            likedProfiles = usersOverride.filter(u => likedUsernames.includes(u.username))
                                         .map(u => ({
                                             username: u.username,
                                             avatar: u.avatar,
                                             photos: u.photos,
                                             details: u.details,
                                             location: u.location
                                         }));
        }

        return res.json({ success: true, users: likedProfiles });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// USERS - GET PROFILE WHO LIKED ME
app.get('/api/users/liked-me', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });
        
        const myUsername = me.username;
        let likedByMap = [];

        if (isDbConnected) {
             likedByMap = await User.find({ likedUsers: myUsername })
                                    .select('username avatar photos details location');
        } else {
             likedByMap = usersOverride.filter(u => u.likedUsers && u.likedUsers.includes(myUsername))
                                       .map(u => ({
                                             username: u.username,
                                             avatar: u.avatar,
                                             photos: u.photos,
                                             details: u.details,
                                             location: u.location
                                         }));
        }

        return res.json({ success: true, users: likedByMap });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ADMIN - ADD USER
app.post('/api/admin/users', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me || me.username !== 'admin') {
            return res.status(403).json({ error: 'Admin access only' });
        }

        const { username, email, password, fullName, isMember, isVerified } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        const newUserObj = {
            username, email, password, fullName: fullName || '', 
            isMember: !!isMember, isVerified: !!isVerified,
            avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            createdAt: new Date(),
            photos: []
        };

        if (isDbConnected) {
            const exists = await User.findOne({ $or: [{email}, {username}] });
            if (exists) return res.status(400).json({ error: 'User exists' });
            
            const u = new User(newUserObj);
            await u.save();
            res.json({ success: true, user: u });
        } else {
            const exists = usersOverride.find(u => u.username === username || u.email === email);
            if (exists) return res.status(400).json({ error: 'User exists' });

            newUserObj._id = 'mem-' + Date.now();
            usersOverride.push(newUserObj);
            res.json({ success: true, user: newUserObj });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN - UPDATE USER
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');
        
        // Admin Check
        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);

        if (!me || me.username !== 'admin') {
            return res.status(403).json({ error: 'Admin access only' });
        }

        const { id } = req.params;
        const { username, fullName, email, isMember, isVerified, details } = req.body;

        if (isDbConnected) {
             console.log('Admin Update Body:', req.body);
             
             // 1. Check if user exists
             const existingUser = await User.findById(id);
             if (!existingUser) return res.status(404).json({ error: 'User not found' });

             // 2. Duplicate Checks
             if (username && username !== existingUser.username) {
                 const dup = await User.findOne({ username });
                 if (dup) return res.status(400).json({ error: 'Username taken' });
             }
             if (email && email !== existingUser.email) {
                 const dup = await User.findOne({ email });
                 if (dup) return res.status(400).json({ error: 'Email taken' });
             }

             // 3. Prepare Updates
             const updates = {};
             if (username) updates.username = username;
             if (email) updates.email = email;
             if (fullName !== undefined) updates.fullName = fullName;
             if (isMember !== undefined) updates.isMember = isMember;
             if (isVerified !== undefined) updates.isVerified = isVerified;
             if (details !== undefined) updates.details = details;

             // 4. Update
             const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
             return res.json({ success: true, user });

        } else {
             const idx = usersOverride.findIndex(u => u._id === id);
             if (idx === -1) return res.status(404).json({ error: 'User not found' });
             
             const user = usersOverride[idx];

             if (username && username !== user.username) {
                 const dup = usersOverride.find(u => u.username === username);
                 if (dup) return res.status(400).json({ error: 'Username taken' });
                 user.username = username;
             }
             if (email && email !== user.email) {
                 const dup = usersOverride.find(u => u.email === email);
                 if (dup) return res.status(400).json({ error: 'Email taken' });
                 user.email = email;
             }

             if (fullName !== undefined) user.fullName = fullName;
             if (isMember !== undefined) user.isMember = isMember;
             if (isVerified !== undefined) user.isVerified = isVerified;
             if (details !== undefined) user.details = details;

             usersOverride[idx] = user;
             return res.json({ success: true, user });
        }

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// NOTIFICATIONS - GET USER NOTIFICATIONS
app.get('/api/notifications', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        let notifications = [];
        if (isDbConnected) {
            notifications = await Notification.find({ recipient: me.username })
                                              .sort({ createdAt: -1 })
                                              .limit(50);
        } else {
            notifications = notificationsOverride
                .filter(n => n.recipient === me.username)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 50);
        }

        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.json({ success: true, notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NOTIFICATIONS - MARK AS READ
app.put('/api/notifications/read', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        const { notificationId, markAll } = req.body;

        if (isDbConnected) {
            if (markAll) {
                await Notification.updateMany({ recipient: me.username, isRead: false }, { isRead: true });
            } else if (notificationId) {
                await Notification.findByIdAndUpdate(notificationId, { isRead: true });
            }
        } else {
            if (markAll) {
                notificationsOverride.filter(n => n.recipient === me.username).forEach(n => n.isRead = true);
            } else if (notificationId) {
                const notif = notificationsOverride.find(n => n._id === notificationId);
                if (notif) notif.isRead = true;
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NOTIFICATIONS - DELETE SINGLE
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        const notificationId = req.params.id;

        if (isDbConnected) {
            // Only delete if the notification belongs to this user
            const notif = await Notification.findById(notificationId);
            if (notif && notif.recipient === me.username) {
                await Notification.findByIdAndDelete(notificationId);
            }
        } else {
            const idx = notificationsOverride.findIndex(n => n._id === notificationId && n.recipient === me.username);
            if (idx > -1) notificationsOverride.splice(idx, 1);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NOTIFICATIONS - DELETE ALL
app.delete('/api/notifications', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        let cleanToken = token;
        if (cleanToken.startsWith('Bearer ')) cleanToken = cleanToken.slice(7);
        const myId = cleanToken.replace('mock-jwt-', '');

        let me;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(myId)) me = await User.findById(myId);
        if (!me) me = usersOverride.find(u => u._id === myId);
        if (!me) return res.status(404).json({ error: 'User not found' });

        if (isDbConnected) {
            await Notification.deleteMany({ recipient: me.username });
        } else {
            const toRemove = notificationsOverride.filter(n => n.recipient === me.username);
            toRemove.forEach(n => {
                const idx = notificationsOverride.indexOf(n);
                if (idx > -1) notificationsOverride.splice(idx, 1);
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Global Error Handler - The Safety Net
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR]', err);
    if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Something broke!', details: err.message });
    }
});

// Bind to 0.0.0.0 to ensure accessibility
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SECURE] Server running on port ${PORT}`);
});
