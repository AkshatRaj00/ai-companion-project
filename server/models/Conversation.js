// models/Conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    // User identification (for now, we'll use session-based)
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    
    // User's input text
    userText: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    },
    
    // AI Analysis Results
    sentiment: {
        type: String,
        required: true,
        enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED']
    },
    
    confidenceScore: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    
    recommendation: {
        type: String,
        required: true
    },
    
    additionalTips: [{
        type: String
    }],
    
    // Metadata
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // Processing information
    processingTime: {
        type: Number, // milliseconds
        default: 0
    },
    
    // User feedback (for future improvement)
    userFeedback: {
        helpful: {
            type: Boolean,
            default: null
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        }
    },
    
    // Analytics data
    textLength: {
        type: Number,
        default: function() {
            return this.userText ? this.userText.length : 0;
        }
    },
    
    // Detected emotions/keywords for advanced analytics
    detectedEmotions: [{
        emotion: String,
        confidence: Number
    }],
    
    // IP and user agent for analytics (anonymous)
    metadata: {
        userAgent: String,
        ipHash: String, // hashed for privacy
        country: String,
        language: String
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'conversations'
});

// Indexes for better query performance
ConversationSchema.index({ sessionId: 1, timestamp: -1 });
ConversationSchema.index({ sentiment: 1, timestamp: -1 });
ConversationSchema.index({ timestamp: -1 });

// Virtual for formatted date
ConversationSchema.virtual('formattedDate').get(function() {
    return this.timestamp.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Static methods for analytics
ConversationSchema.statics.getAnalytics = async function(sessionId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        {
            $match: {
                sessionId: sessionId,
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$sentiment',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidenceScore' }
            }
        }
    ];
    
    return await this.aggregate(pipeline);
};

// Instance method for similar conversations
ConversationSchema.methods.findSimilar = function() {
    return this.model('Conversation').find({
        sentiment: this.sentiment,
        confidenceScore: { $gte: this.confidenceScore - 0.1 },
        _id: { $ne: this._id }
    }).limit(5);
};

module.exports = mongoose.model('Conversation', ConversationSchema);

// models/Session.js
const SessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Session statistics
    conversationCount: {
        type: Number,
        default: 0
    },
    
    totalProcessingTime: {
        type: Number,
        default: 0
    },
    
    // Mood trends
    moodTrend: {
        positive: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 }
    },
    
    // First and last interaction
    firstInteraction: {
        type: Date,
        default: Date.now
    },
    
    lastInteraction: {
        type: Date,
        default: Date.now
    },
    
    // User preferences (for future features)
    preferences: {
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        notificationEnabled: { type: Boolean, default: false }
    },
    
    // Session metadata
    userAgent: String,
    ipHash: String,
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'sessions'
});

// Update session statistics
SessionSchema.methods.updateStats = function(sentiment) {
    this.conversationCount += 1;
    this.lastInteraction = new Date();
    
    if (sentiment === 'POSITIVE') this.moodTrend.positive += 1;
    else if (sentiment === 'NEGATIVE') this.moodTrend.negative += 1;
    else this.moodTrend.neutral += 1;
    
    return this.save();
};

const Session = mongoose.model('Session', SessionSchema);

// models/index.js - Export all models
module.exports = {
    Conversation: mongoose.model('Conversation', ConversationSchema),
    Session: Session
};