// config/database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        
        // Connection event listeners
        mongoose.connection.on('connected', () => {
            console.log('📡 Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  Mongoose disconnected from MongoDB');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('🛑 MongoDB connection closed through app termination');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });

        return conn;
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        
        // More specific error messages
        if (error.name === 'MongooseServerSelectionError') {
            console.error('💡 Possible issues:');
            console.error('   - Check your MongoDB URI in .env file');
            console.error('   - Verify your internet connection');
            console.error('   - Check MongoDB Atlas network access settings');
        }
        
        if (error.name === 'MongoParseError') {
            console.error('💡 Check your MongoDB URI format in .env file');
        }
        
        // Don't exit in development, just log the error
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        
        return null;
    }
};

// Test database connection
const testConnection = async () => {
    try {
        await mongoose.connection.db.admin().command({ ping: 1 });
        console.log('🏓 Database ping successful!');
        return true;
    } catch (error) {
        console.error('❌ Database ping failed:', error.message);
        return false;
    }
};

// Get database statistics
const getDBStats = async () => {
    try {
        const { Conversation, Session } = require('../models');
        
        const stats = await Promise.all([
            Conversation.countDocuments(),
            Session.countDocuments(),
            mongoose.connection.db.stats()
        ]);

        return {
            totalConversations: stats[0],
            totalSessions: stats[1],
            dbStats: {
                collections: stats[2].collections,
                dataSize: Math.round(stats[2].dataSize / 1024) + ' KB',
                indexSize: Math.round(stats[2].indexSize / 1024) + ' KB'
            }
        };
    } catch (error) {
        console.error('❌ Error getting database stats:', error);
        return null;
    }
};

module.exports = {
    connectDB,
    testConnection,
    getDBStats
};