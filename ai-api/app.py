from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load a pre-trained model for sentiment analysis
# Ye model text ko analyze karke sentiment batayega (e.g., 'POSITIVE', 'NEGATIVE')
try:
    sentiment_analyzer = pipeline("sentiment-analysis")
    logger.info("Sentiment analysis model loaded successfully!")
except Exception as e:
    logger.error(f"Error loading sentiment analysis model: {str(e)}")
    sentiment_analyzer = None

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "AI Mental Health API is running!",
        "version": "1.0",
        "endpoints": {
            "predict": "/predict (POST)",
            "health": "/ (GET)"
        }
    })

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return jsonify({"status": "OK"})
    
    try:
        # Get JSON data from request
        data = request.get_json(force=True)
        logger.info(f"Received request data: {data}")
        
        if not data:
            return jsonify({
                "error": "No JSON data provided",
                "status": "error"
            }), 400
        
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({
                "error": "No text provided or text is empty",
                "status": "error"
            }), 400
        
        if len(text) > 1000:
            return jsonify({
                "error": "Text too long. Please keep it under 1000 characters.",
                "status": "error"
            }), 400
        
        if not sentiment_analyzer:
            return jsonify({
                "error": "Sentiment analysis model not available",
                "status": "error"
            }), 500
        
        # Analyze the sentiment of the input text
        logger.info(f"Analyzing text: {text[:50]}...")
        result = sentiment_analyzer(text)
        sentiment = result[0]['label']
        score = result[0]['score']
        
        logger.info(f"Analysis result: {sentiment} with confidence {score}")
        
        # Enhanced recommendations based on sentiment and confidence
        recommendations = get_personalized_recommendation(sentiment, score, text)
        
        response_data = {
            "sentiment": sentiment,
            "recommendation": recommendations['message'],
            "confidence_score": score,
            "additional_tips": recommendations['tips'],
            "status": "success"
        }
        
        logger.info(f"Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}")
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "status": "error"
        }), 500

def get_personalized_recommendation(sentiment, confidence, text):
    """Generate personalized recommendations based on sentiment analysis"""
    
    # Convert text to lowercase for keyword checking
    text_lower = text.lower()
    
    if sentiment == 'POSITIVE':
        if confidence > 0.9:
            message = "🌟 You're radiating positive energy! This is wonderful to see."
            tips = [
                "🎵 Listen to your favorite uplifting music",
                "📞 Share this positive energy with a friend",
                "📝 Write down what made you feel good today",
                "🌱 Use this momentum for a creative project"
            ]
        else:
            message = "😊 You seem to be feeling good! Let's build on these positive vibes."
            tips = [
                "🚶‍♀️ Take a pleasant walk outside",
                "📖 Read something inspiring",
                "🧘‍♀️ Practice gratitude meditation",
                "💪 Try a fun physical activity"
            ]
    
    elif sentiment == 'NEGATIVE':
        # Check for specific negative emotions
        if any(word in text_lower for word in ['anxious', 'anxiety', 'worried', 'stress']):
            message = "😌 I understand you're feeling anxious. Remember, this feeling will pass."
            tips = [
                "🫁 Try deep breathing exercises (4-7-8 technique)",
                "🧘‍♀️ Practice a 5-minute mindfulness meditation",
                "📱 Use a calming app like Headspace or Calm",
                "☎️ Consider talking to a trusted friend or counselor"
            ]
        elif any(word in text_lower for word in ['sad', 'depressed', 'down', 'upset']):
            message = "💙 I hear that you're going through a tough time. Your feelings are valid."
            tips = [
                "🌅 Try to get some natural sunlight",
                "🎨 Express yourself through art, writing, or music",
                "🏃‍♀️ Light exercise can help boost mood",
                "🤗 Reach out to someone who cares about you"
            ]
        elif any(word in text_lower for word in ['angry', 'mad', 'frustrated', 'irritated']):
            message = "😤 It sounds like you're feeling frustrated. Let's work on channeling this energy."
            tips = [
                "💨 Take 10 deep breaths before reacting",
                "🏋️‍♀️ Try physical exercise to release tension",
                "📝 Write down your feelings in a journal",
                "🎯 Focus on what you can control in the situation"
            ]
        else:
            message = "💭 I sense you might be going through something difficult. Remember, it's okay to not be okay."
            tips = [
                "🛁 Take a warm bath or shower",
                "📚 Read a comforting book or watch a feel-good movie",
                "🍵 Make yourself a warm drink",
                "💬 Consider talking to a mental health professional"
            ]
    
    else:  # NEUTRAL or unknown
        message = "🤔 Your feelings seem mixed right now, which is completely normal."
        tips = [
            "📓 Try journaling to explore your thoughts",
            "🚶‍♀️ Take a mindful walk to clear your head",
            "🎵 Listen to music that resonates with your mood",
            "🧘‍♀️ Try a brief meditation or breathing exercise"
        ]
    
    return {
        'message': message,
        'tips': tips
    }

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": ["/", "/predict"],
        "status": "error"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal server error",
        "status": "error"
    }), 500

if __name__ == '__main__':
    print("🚀 Starting AI Mental Health API...")
    print("📡 Server will be available at: http://127.0.0.1:5001")
    print("🔍 Health check: http://127.0.0.1:5001/")
    print("🧠 Prediction endpoint: http://127.0.0.1:5001/predict")
    print("=" * 50)
    
    app.run(host='127.0.0.1', port=5001, debug=True)