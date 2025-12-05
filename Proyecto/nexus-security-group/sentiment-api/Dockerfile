FROM python:3.9-slim

WORKDIR /app

RUN pip install --no-cache-dir flask vaderSentiment textblob

RUN python -m textblob.download_corpora

COPY sentiment_api.py .

EXPOSE 5000

CMD ["python", "sentiment_api.py"]
