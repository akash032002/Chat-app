// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2/promise'); // Using mysql2 for promise-based operations
const cors = require('cors');
//const http = require('http');
const { Server } = require('socket.io');
const http = require('http');
const multer = require('multer'); // For handling file uploads
const path = require('path');
const fs = require('fs'); // For file system operations
const nodemailer = require('nodemailer'); // For sending emails

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN, // Allow all origins for development. In production, specify your frontend URL.
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files from 'uploads' directory

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Files will be stored in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    }
});
const upload = multer({ storage: storage });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // --- ADD THIS SSL CONFIGURATION ---
    ssl: {
        rejectUnauthorized: false // Set to false for now to debug.
                                  // AWS RDS uses valid certificates, but 'false' helps bypass
                                  // potential issues with certificate authority chains in deployment environments.
                                  // You can try 'true' later if it connects successfully with 'false'.
    }
});

// Important: Add error handling for the connection pool
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL database from pool:', err);
        // You might want to exit the process or handle this more gracefully in a real app
    } else {
        console.log('Successfully connected to MySQL database via pool!');
        connection.release(); // Release the connection back to the pool
    }
});

// Make sure your routes/logic use pool.query() or pool.getConnection()
// instead of direct connection.query()

// Nodemailer Transporter (for sending emails)
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'Outlook', 'Yahoo', or direct SMTP
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// In-memory storage for temporary registrations awaiting OTP verification
// In a production app, use a persistent store like Redis or a temporary DB table.
const tempRegistrations = new Map(); // Stores { tempUserId: { name, email, password, otp, otpExpiresAt } }

// Test DB connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to MySQL database!');
        connection.release();
    })
    .catch(err => {
        console.error('Failed to connect to MySQL database:', err);
        process.exit(1); // Exit if DB connection fails
    });

// --- API Endpoints ---

// 1. User Registration (now stores data temporarily)
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if user already exists in the permanent database
        const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        // Check if email is already in pending verification
        for (let [tempId, regData] of tempRegistrations.entries()) {
            if (regData.email === email) {
                // If an existing unverified registration for this email exists and is not expired,
                // you might want to resend OTP or tell them to check their email.
                // For simplicity, we'll just say it's pending verification.
                if (new Date(regData.otpExpiresAt) > new Date()) {
                    return res.status(409).json({ message: 'Email already pending verification. Please check your email for OTP.' });
                } else {
                    // If expired, remove it so they can re-register
                    tempRegistrations.delete(tempId);
                }
            }
        }

        const tempUserId = `temp_${Date.now()}`; // Unique temporary ID
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        // Store registration data temporarily
        tempRegistrations.set(tempUserId, { name, email, password, otp, otpExpiresAt });

        // Send OTP email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Chat App Registration',
            text: `Your One-Time Password (OTP) for Chat App registration is: ${otp}\n\nThis OTP is valid for 10 minutes.`,
            html: `<p>Your One-Time Password (OTP) for Chat App registration is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending OTP email:', error);
                // Even if email fails, we proceed, but log the error.
                // In a production app, you might want to handle this more robustly.
            } else {
                console.log('OTP Email sent:', info.response);
            }
        });

        res.status(201).json({
            message: 'Registration successful! OTP sent to your email for verification.',
            userId: tempUserId // Send tempUserId back for frontend to use in OTP verification
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 2. OTP Verification (now creates the actual user account)
app.post('/api/verify-otp', async (req, res) => {
    const { userId: tempUserId, enteredOtp } = req.body; // Renamed userId to tempUserId for clarity

    const registrationData = tempRegistrations.get(tempUserId);

    if (!registrationData) {
        return res.status(404).json({ message: 'Verification session expired or not found. Please register again.' });
    }

    const now = new Date();
    const otpExpiry = new Date(registrationData.otpExpiresAt);

    if (registrationData.otp === enteredOtp && otpExpiry > now) {
        // OTP is correct and not expired
        // NOW, create the actual user account in the database
        const newUserId = `user_${Date.now()}`; // Generate a permanent user ID
        try {
            const [result] = await pool.execute(
                'INSERT INTO users (id, name, email, password, isAdmin, isApproved, isEmailVerified, otp, otpExpiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newUserId, registrationData.name, registrationData.email, registrationData.password, false, false, true, null, null] // otp and otpExpiresAt cleared
            );

            // Fetch the newly created user's data for the response
            const [newUserRows] = await pool.execute('SELECT id, name, isAdmin, isApproved, isEmailVerified FROM users WHERE id = ?', [newUserId]);
            const newUser = newUserRows[0];

            // Remove temporary registration data after successful account creation
            tempRegistrations.delete(tempUserId);

            res.status(200).json({
                message: 'Account created and verified successfully!',
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    isAdmin: newUser.isAdmin,
                    isApproved: newUser.isApproved,
                    isEmailVerified: newUser.isEmailVerified
                }
            });
        } catch (dbError) {
            console.error('Error inserting user into DB after OTP verification:', dbError);
            res.status(500).json({ message: 'Server error during account creation after OTP verification.' });
        }
    } else if (otpExpiry <= now) {
        // OTP expired, remove temporary data
        tempRegistrations.delete(tempUserId);
        res.status(400).json({ message: 'OTP expired. Please register again to get a new OTP.' });
    } else {
        res.status(400).json({ message: 'Invalid OTP.' });
    }
});


// 3. User Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt:", email); // 👈 Add this

    try {
        const [users] = await pool.execute('SELECT id, name, password, isAdmin, isApproved, isEmailVerified FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || user.password !== password) {
            console.log("Invalid credentials"); // 👈 Add this
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({ message: 'Account not email verified.' });
        }
        if (!user.isApproved) {
            return res.status(403).json({ message: 'Account not approved.' });
        }

        res.status(200).json({
            message: 'Login successful!',
            user: {
                id: user.id,
                name: user.name,
                isAdmin: user.isAdmin,
                isApproved: user.isApproved,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error('🔥 Error during login:', error); // 👈 This will appear in logs
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// 4. Get All Users (for Admin Dashboard)
app.get('/api/users', async (req, res) => {
    try {
        // MODIFIED: Include isEmailVerified in the select query
        const [users] = await pool.execute('SELECT id, name, email, isAdmin, isApproved, otp, otpExpiresAt, isEmailVerified FROM users');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// 5. Approve User
app.put('/api/users/:userId/approve', async (req, res) => {
    const { userId } = req.params;
    try {
        await pool.execute('UPDATE users SET isApproved = TRUE WHERE id = ?', [userId]);
        io.emit('userApproved', userId); // Notify clients about user approval
        res.status(200).json({ message: 'User approved successfully.' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ message: 'Server error approving user.' });
    }
});

// 6. Remove User
app.delete('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
        io.emit('userRemoved', userId); // Notify clients about user removal
        res.status(200).json({ message: 'User removed successfully.' });
    } catch (error) {
        console.error('Error removing user:', error);
        res.status(500).json({ message: 'Server error removing user.' });
    }
});

// 7. Get Chat Messages
app.get('/api/messages', async (req, res) => {
    try {
        const [messages] = await pool.execute('SELECT * FROM messages ORDER BY timestamp ASC');
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error fetching messages.' });
    }
});

// 8. Send Chat Message (with optional file upload)
app.post('/api/messages', upload.single('file'), async (req, res) => {
    const { senderId, senderName, text } = req.body;
    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`; // URL relative to backend server
        fileName = req.file.originalname;
        fileType = req.file.mimetype;
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO messages (senderId, senderName, text, fileUrl, fileName, fileType) VALUES (?, ?, ?, ?, ?, ?)',
            [senderId, senderName, text, fileUrl, fileName, fileType]
        );
        const newMessage = {
            id: result.insertId,
            senderId,
            senderName,
            text,
            fileUrl,
            fileName,
            fileType,
            isDeleted: false,
            timestamp: new Date().toISOString() // Use ISO string for consistency
        };
        io.emit('newMessage', newMessage); // Emit to all connected clients
        res.status(201).json({ message: 'Message sent successfully.', message: newMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error sending message.' });
    }
});

// 9. Delete Chat Message (soft delete)
app.put('/api/messages/:messageId/delete', async (req, res) => {
    const { messageId } = req.params;
    try {
        await pool.execute('UPDATE messages SET isDeleted = TRUE, text = ? WHERE id = ?', ['[This message was deleted by an admin]', messageId]);
        io.emit('messageDeleted', messageId); // Notify clients about soft delete
        res.status(200).json({ message: 'Message soft-deleted successfully.' });
    } catch (error) {
        console.error('Error soft-deleting message:', error);
        res.status(500).json({ message: 'Server error soft-deleting message.' });
    }
});

// 10. Get Viva Questions
app.get('/api/viva-questions', async (req, res) => {
    try {
        const [questions] = await pool.execute('SELECT * FROM viva_questions ORDER BY timestamp ASC');
        res.status(200).json(questions);
    } catch (error) {
        console.error('Error fetching viva questions:', error);
        res.status(500).json({ message: 'Server error fetching viva questions.' });
    }
});

// 11. Add Viva Question
app.post('/api/viva-questions', async (req, res) => {
    const { senderId, senderName, questionText } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO viva_questions (senderId, senderName, questionText) VALUES (?, ?, ?)',
            [senderId, senderName, questionText]
        );
        const newQuestion = {
            id: result.insertId,
            senderId,
            senderName,
            questionText,
            isDeleted: false,
            timestamp: new Date().toISOString()
        };
        io.emit('newVivaQuestion', newQuestion); // Emit to all connected clients
        res.status(201).json({ message: 'Question added successfully.', question: newQuestion });
    } catch (error) {
        console.error('Error adding viva question:', error);
        res.status(500).json({ message: 'Server error adding viva question.' });
    }
});

// 12. Delete Viva Question (soft delete)
app.put('/api/viva-questions/:questionId/delete', async (req, res) => {
    const { questionId } = req.params;
    try {
        await pool.execute('UPDATE viva_questions SET isDeleted = TRUE, questionText = ? WHERE id = ?', ['[This question was deleted by an admin]', questionId]);
        io.emit('vivaQuestionDeleted', questionId); // Notify clients about soft delete
        res.status(200).json({ message: 'Viva question soft-deleted successfully.' });
    } catch (error) {
        console.error('Error soft-deleting viva question:', error);
        res.status(500).json({ message: 'Server error soft-deleting viva question.' });
    }
});

// 13. Get App Settings
app.get('/api/settings', async (req, res) => {
    try {
        const [settings] = await pool.execute('SELECT settingName, settingValue FROM app_settings');
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.settingName] = s.settingValue === 1; // MySQL BOOLEAN (TINYINT(1)) returns 1 or 0
        });
        res.status(200).json(settingsMap);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server error fetching settings.' });
    }
});

// 14. Update App Setting
app.put('/api/settings/:settingName', async (req, res) => {
    const { settingName } = req.params;
    const { settingValue } = req.body;
    try {
        await pool.execute('UPDATE app_settings SET settingValue = ? WHERE settingName = ?', [settingValue, settingName]);
        io.emit('settingUpdated', { settingName, settingValue }); // Notify clients
        res.status(200).json({ message: 'Setting updated successfully.' });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ message: 'Server error updating setting.' });
    }
});


// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected from WebSocket:', socket.id);
    });
});
