import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text before analyzing!');
      return;
    }
    
    setLoading(true);
    setResponse(null);
    
    try {
      // User ka text Node.js backend ko bheja
      const res = await axios.post('http://localhost:5000/analyze-mood', { 
        text: inputText 
      });
      
      setResponse(res.data);
      
      // History mein add karo
      const newEntry = {
        text: inputText,
        result: res.data,
        timestamp: new Date().toLocaleString()
      };
      setHistory(prev => [newEntry, ...prev.slice(0, 4)]); // Keep only last 5 entries
      
    } catch (error) {
      console.error("Error during API call:", error);
      let errorMessage = "Something went wrong. Please try again.";
      
      if (error.response) {
        errorMessage = `Server Error: ${error.response.status} - ${error.response.data.error || 'Unknown error'}`;
      } else if (error.request) {
        errorMessage = "Unable to connect to server. Please check if all servers are running.";
      }
      
      setResponse({ error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getSentimentColor = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive': return '#28a745';
      case 'negative': return '#dc3545';
      case 'neutral': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getSentimentEmoji = (sentiment) => {
    switch(sentiment?.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      case 'neutral': return '😐';
      default: return '🤔';
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: 'auto',
        backgroundColor: 'white',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          color: 'white',
          padding: '30px 20px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>
            AI Mental Health Companion 🧠💭
          </h1>
          <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
            Share your thoughts and get personalized mood insights
          </p>
        </div>

        {/* Main Content */}
        <div style={{ padding: '30px' }}>
          {/* Input Section */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '10px', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              How are you feeling today?
            </label>
            <textarea
              style={{ 
                width: '100%', 
                minHeight: '120px', 
                padding: '15px', 
                fontSize: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontFamily: 'Arial, sans-serif',
                resize: 'vertical',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              placeholder="Share your thoughts, feelings, or describe your day... (Press Ctrl+Enter to analyze)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
            <div style={{ 
              textAlign: 'right', 
              marginTop: '5px', 
              color: '#666', 
              fontSize: '14px' 
            }}>
              {inputText.length} characters
            </div>
          </div>

          {/* Analyze Button */}
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            style={{ 
              width: '100%',
              padding: '15px 20px', 
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading 
                ? 'linear-gradient(45deg, #ccc, #999)' 
                : 'linear-gradient(45deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              transform: loading ? 'none' : 'translateY(0)',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }
            }}
          >
            {loading ? '🔄 Analyzing your mood...' : '🎯 Analyze My Mood'}
          </button>

          {/* Results Section */}
          {response && (
            <div style={{ 
              marginTop: '30px', 
              padding: '25px', 
              border: response.error ? '2px solid #dc3545' : '2px solid #28a745',
              borderRadius: '15px',
              backgroundColor: response.error ? '#fff5f5' : '#f8fff9',
              animation: 'fadeIn 0.5s ease-in'
            }}>
              {response.error ? (
                <div>
                  <h3 style={{ color: '#dc3545', margin: '0 0 15px 0' }}>
                    ❌ Error Occurred
                  </h3>
                  <p style={{ color: '#721c24', margin: 0 }}>{response.error}</p>
                </div>
              ) : (
                <div>
                  <h3 style={{ 
                    color: '#155724', 
                    margin: '0 0 20px 0',
                    fontSize: '1.5rem'
                  }}>
                    📊 Mood Analysis Results
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <strong>Sentiment:</strong> 
                      <span style={{ 
                        color: getSentimentColor(response.sentiment),
                        fontSize: '1.2rem',
                        marginLeft: '10px'
                      }}>
                        {getSentimentEmoji(response.sentiment)} {response.sentiment?.toUpperCase()}
                      </span>
                    </div>
                    
                    <div style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <strong>Confidence Score:</strong> 
                      <span style={{ 
                        color: '#667eea',
                        fontSize: '1.2rem',
                        marginLeft: '10px'
                      }}>
                        📈 {Math.round(response.confidence_score * 100)}%
                      </span>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        marginTop: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${response.confidence_score * 100}%`,
                          height: '100%',
                          backgroundColor: '#667eea',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <strong>💡 Recommendation:</strong>
                      <p style={{ 
                        margin: '10px 0 0 0',
                        color: '#333',
                        lineHeight: '1.6'
                      }}>
                        {response.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0, color: '#333' }}>📚 Recent Analysis History</h3>
                <button
                  onClick={clearHistory}
                  style={{
                    padding: '5px 15px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Clear History
                </button>
              </div>
              
              {history.map((entry, index) => (
                <div key={index} style={{
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '10px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    {entry.timestamp}
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                    <strong>Input:</strong> {entry.text.substring(0, 100)}
                    {entry.text.length > 100 && '...'}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    <span style={{ color: getSentimentColor(entry.result.sentiment) }}>
                      {getSentimentEmoji(entry.result.sentiment)} {entry.result.sentiment}
                    </span>
                    <span style={{ marginLeft: '15px', color: '#667eea' }}>
                      {Math.round(entry.result.confidence_score * 100)}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          color: '#666',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            💡 Tip: Press <kbd style={{
              padding: '2px 6px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              fontSize: '12px'
            }}>Ctrl+Enter</kbd> to quickly analyze your mood
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;