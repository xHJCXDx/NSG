FROM python:3.9-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir flask vaderSentiment textblob gunicorn

# Download textblob corpora
RUN python -m textblob.download_corpora

# Create a non-root user
RUN useradd -m appuser
USER appuser

COPY sentiment_api.py .

EXPOSE 5000

# Use Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "sentiment_api:app"]
