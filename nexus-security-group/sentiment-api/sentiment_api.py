from flask import Flask, request, jsonify
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import logging
import os

app = Flask(__name__)
analyzer = SentimentIntensityAnalyzer()

# Configure logging
log_level = os.environ.get('LOG_LEVEL', 'INFO')
logging.basicConfig(level=log_level, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health():
    logger.debug('Health check request received')
    return jsonify({'status': 'healthy', 'version': '1.1'}), 200

@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    try:
        # Bearer token authentication
        auth_header = request.headers.get('Authorization')
        expected_token = os.environ.get('API_TOKEN')

        if expected_token:
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Unauthorized'}), 401
            
            token = auth_header.split(' ')[1]
            if token != expected_token:
                return jsonify({'error': 'Unauthorized'}), 401

        data = request.json
        text = data.get('text', '')
        if not text:
            logger.warning('Sentiment analysis request with empty text')
            return jsonify({'error': 'No text provided'}), 400

        # Truncate large texts
        truncated = False
        if len(text) > 5000:
            logger.warning(f'Text exceeds max length: {len(text)} chars. Truncating.')
            text = text[:5000]
            truncated = True

        logger.debug(f'Analyzing sentiment for text: {text[:50]}...')

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

        # Confidence score basado en convergencia de métodos (CLAMPED 0-1)
        score_diff = abs(vader_scores['compound'] - textblob_scores['polarity'])
        confidence = max(0.0, min(1.0, 1.0 - (score_diff / 2)))  # Clamp to [0, 1]

        response = {
            'vader': vader_scores,
            'textblob': textblob_scores,
            'ensemble_score': round(ensemble_score, 4),
            'sentiment_label': label,
            'confidence_score': round(confidence, 3)
        }
        
        if truncated:
            response['truncated'] = True

        logger.info(f'Analysis complete: label={label}, confidence={confidence:.3f}')
        return jsonify(response), 200

    except Exception as e:
        logger.error(f'Error during sentiment analysis: {str(e)}', exc_info=True)
        return jsonify({'error': 'Internal server error during sentiment analysis', 'details': str(e)}), 500

if __name__ == '__main__':
    logger.info('Starting Sentiment API v1.1')
    logger.info('Endpoints: GET /health, POST /analyze')
    logger.info('Listening on 0.0.0.0:5000')
    app.run(host='0.0.0.0', port=5000, debug=False)
