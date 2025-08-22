const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import database
const { connectDB, testConnection, getDBStats } = require('./config/database');
const { Conversation, Session } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:5001';

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware - Generate session ID for each user
app.use((req, res, next) => {
    let sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
        sessionId = uuidv4();
        res.setHeader('X-Session-ID', sessionId);
    }
    
    req.sessionId = sessionId;
    next();
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.sessionId) {
        console.log(`🔑 Session ID: ${req.sessionId.substring(0, 8)}...`);
    }
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Request timing middleware
app.use((req, res, next) => {
    req.startTime = Date.now();
    next();
});

// Health check endpoint with database status
app.get('/', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        const dbStats = dbConnected ? await getDBStats() : null;
        
        res.json({
            status: '✅ AI Mental Health Companion Server is running!',
            version: process.env.APP_VERSION || '1.0',
            timestamp: new Date().toISOString(),
            database: {
                connected: dbConnected,
                stats: dbStats
            },
            endpoints: {
                health: 'GET /',
                analyzeMood: 'POST /analyze-mood',
                getHistory: 'GET /history',
                getAnalytics: 'GET /analytics',
                testPythonApi: 'GET /test-python-connection',
                databaseStats: 'GET /db-stats'
            },
            pythonApiUrl: PYTHON_API_URL
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
});

// Test Python API connection
app.get('/test-python-connection', async (req, res) => {
    try {
        console.log('🔍 Testing Python API connection...');
        const response = await axios.get(`${PYTHON_API_URL}/`, {
            timeout: 5000
        });
        
        console.log('✅ Python API connection successful');
        res.json({
            status: 'success',
            message: 'Python API is reachable',
            pythonApiResponse: response.data
        });
    } catch (error) {
        console.error('❌ Python API connection failed:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Cannot connect to Python API',
            error: error.message,
            pythonApiUrl: PYTHON_API_URL
        });
    }
});

// Get database statistics
app.get('/db-stats', async (req, res) => {
    try {
        const stats = await getDBStats();
        res.json({
            status: 'success',
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to get database statistics',
            error: error.message
        });
    }
});

// Get user's conversation history
app.get('/history', async (req, res) => {
    try {
        const { limit = 10, page = 1 } = req.query;
        const sessionId = req.sessionId;
        
        console.log(`📚 Fetching history for session: ${sessionId.substring(0, 8)}...`);
        
        const conversations = await Conversation.find({ sessionId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .select('-__v -sessionId');
            
        const total = await Conversation.countDocuments({ sessionId });
        
        res.json({
            status: 'success',
            data: conversations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching history:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch conversation history',
            error: error.message
        });
    }
});

// Get user analytics
app.get('/analytics', async (req, res) => {
    try {
        const sessionId = req.sessionId;
        const { days = 30 } = req.query;
        
        console.log(`📊 Generating analytics for session: ${sessionId.substring(0, 8)}...`);
        
        // Get analytics using the static method we defined
        const sentimentAnalytics = await Conversation.getAnalytics(sessionId, parseInt(days));
        
        // Get recent trends (last 7 days)
        const recentTrends = await Conversation.find({ sessionId })
            .sort({ timestamp: -1 })
            .limit(7)
            .select('sentiment confidenceScore timestamp');
            
        // Get session info
        const session = await Session.findOne({ sessionId });
        
        res.json({
            status: 'success',
            data: {
                sentimentBreakdown: sentimentAnalytics,
                recentTrends,
                sessionStats: session ? {
                    totalConversations: session.conversationCount,
                    firstInteraction: session.firstInteraction,
                    lastInteraction: session.lastInteraction,
                    moodTrend: session.moodTrend
                } : null,
                period: `${days} days`
            }
        });
        
    } catch (error) {
        console.error('❌ Error generating analytics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate analytics',
            error: error.message
        });
    }
});

// Main mood analysis endpoint with database integration
app.post('/analyze-mood', async (req, res) => {
    console.log('\n🧠 Processing mood analysis request...');
    
    try {
        const { text } = req.body;
        const sessionId = req.sessionId;
        const startTime = req.startTime;
        
        // Input validation
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ 
                error: "Please enter some text to analyze.",
                status: 'error'
            });
        }
        
        const trimmedText = text.trim();
        if (trimmedText.length > 1000) {
            return res.status(400).json({ 
                error: "Text is too long. Please keep it under 1000 characters.",
                status: 'error'
            });
        }
        
        console.log('📤 Sending request to Python AI API...');
        console.log('🔤 Text to analyze:', trimmedText.substring(0, 100) + (trimmedText.length > 100 ? '...' : ''));
        
        // Forward request to Python AI API
        const response = await axios.post(`${PYTHON_API_URL}/predict`, 
            { text: trimmedText },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000,
                validateStatus: (status) => status < 500
            }
        );
        
        if (response.status >= 400) {
            return res.status(response.status).json({
                error: response.data.error || 'AI service error',
                status: 'error'
            });
        }
        
        const aiResult = response.data;
        const processingTime = Date.now() - startTime;
        
        console.log('📥 Received AI analysis result');
        console.log('📊 Sentiment:', aiResult.sentiment, 'Confidence:', Math.round(aiResult.confidence_score * 100) + '%');
        
        // Save conversation to database
        try {
            const conversation = new Conversation({
                sessionId,
                userText: trimmedText,
                sentiment: aiResult.sentiment,
                confidenceScore: aiResult.confidence_score,
                recommendation: aiResult.recommendation,
                additionalTips: aiResult.additional_tips || [],
                processingTime,
                textLength: trimmedText.length,
                metadata: {
                    userAgent: req.headers['user-agent'],
                    ipHash: crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex'),
                    language: req.headers['accept-language']?.split(',')[0] || 'unknown'
                }
            });
            
            await conversation.save();
            console.log('💾 Conversation saved to database');
            
            // Update or create session
            let session = await Session.findOne({ sessionId });
            if (!session) {
                session = new Session({
                    sessionId,
                    userAgent: req.headers['user-agent'],
                    ipHash: crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex')
                });
            }
            
            await session.updateStats(aiResult.sentiment);
            console.log('📊 Session statistics updated');
            
        } catch (dbError) {
            console.error('❌ Database save error:', dbError.message);
            // Continue with response even if database save fails
        }
        
        // Enhanced response with additional data
        const enhancedResponse = {
            ...aiResult,
            timestamp: new Date().toISOString(),
            processingTime,
            sessionId: sessionId.substring(0, 8) + '...', // Partial session ID for client
            status: 'success'
        };
        
        console.log('✅ Mood analysis completed successfully');
        res.json(enhancedResponse);
        
    } catch (error) {
        console.error('\n❌ Error in mood analysis:', error.message);
        
        let errorMessage = "Failed to analyze mood. Please try again.";
        let statusCode = 500;
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage = "Cannot connect to AI service. Please make sure the Python API is running.";
            statusCode = 503;
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = "Request timed out. Please try again.";
            statusCode = 504;
        } else if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data?.error || "AI service error";
        }
        
        res.status(statusCode).json({
            error: errorMessage,
            status: 'error',
            timestamp: new Date().toISOString()
        });
    }
});

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.url}`,
        availableEndpoints: [
            'GET /',
            'GET /test-python-connection',
            'GET /history',
            'GET /analytics',
            'GET /db-stats',
            'POST /analyze-mood'
        ],
        status: 'error'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        status: 'error',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 AI Mental Health Companion - Enhanced Server with MongoDB!');
    console.log('=' .repeat(70));
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🔍 Health: http://localhost:${PORT}/`);
    console.log(`🧠 Analyze: http://localhost:${PORT}/analyze-mood`);
    console.log(`📚 History: http://localhost:${PORT}/history`);
    console.log(`📊 Analytics: http://localhost:${PORT}/analytics`);
    console.log(`🔗 Python API: ${PYTHON_API_URL}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log('=' .repeat(70));
    console.log('📝 Logs will appear below:\n');
});