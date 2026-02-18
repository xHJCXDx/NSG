from flask import Flask, request, jsonify
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob

app = Flask(__name__)
analyzer = SentimentIntensityAnalyzer()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    try:
        data = request.json
        input_payload = data.get('text', '')
        tweet_data = {}
        text = ''

        if isinstance(input_payload, dict):
            tweet_data = input_payload
            text = tweet_data.get('text_content', '')
        else:
            text = str(input_payload)

        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # VADER analysis
        vader_scores = analyzer.polarity_scores(text)
        
        # TextBlob analysis
        blob = TextBlob(text)
        textblob_scores = {
            'polarity': blob.sentiment.polarity,
            'subjectivity': blob.sentiment.subjectivity
        }
        
        # Ensemble: promedio de VADER compound y TextBlob polarity
        ensemble_score = (vader_scores['compound'] + textblob_scores['polarity']) / 2
        
        # Clasificación final
        if ensemble_score >= 0.05:
            label = 'positive'
        elif ensemble_score <= -0.05:
            label = 'negative'
        else:
            label = 'neutral'
        
        # Confidence score basado en convergencia de métodos
        score_diff = abs(vader_scores['compound'] - textblob_scores['polarity'])
        confidence = 1.0 - (score_diff / 2)  # Normalizado 0-1
        
        response_data = tweet_data.copy()
        response_data['sentiment'] = {
            'vader': vader_scores,
            'textblob': textblob_scores,
            'ensemble_score': round(ensemble_score, 4),
            'sentiment_label': label,
            'confidence_score': round(confidence, 3)
        }
        
        # Fallback for direct API usage without tweet wrapper (legacy support)
        if not tweet_data:
             return jsonify(response_data['sentiment']), 200

        return jsonify(response_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
