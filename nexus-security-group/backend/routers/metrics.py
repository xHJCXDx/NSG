from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.get("/summary")
def get_metrics_summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Total mentions
    total_mentions = db.execute(text("SELECT COUNT(*) FROM social_mentions")).scalar()
    
    # Sentiment distribution
    sentiment_counts = db.execute(text("""
        SELECT sentiment_label, COUNT(*) 
        FROM sentiment_analysis 
        GROUP BY sentiment_label
    """)).fetchall()
    sentiment_dist = {row[0]: row[1] for row in sentiment_counts}
    
    # Alerts count
    alerts_count = db.execute(text("SELECT COUNT(*) FROM alerts")).scalar()
    
    return {
        "total_mentions": total_mentions,
        "sentiment_distribution": sentiment_dist,
        "alerts_count": alerts_count
    }

@router.get("/mentions")
def get_recent_mentions(db: Session = Depends(get_db), limit: int = 50, current_user=Depends(get_current_user)):
    mentions = db.execute(text("""
        SELECT mention_id, platform, text_content, created_at, author_username 
        FROM social_mentions 
        ORDER BY created_at DESC 
        LIMIT :limit
    """), {"limit": limit}).fetchall()
    return [
        {
            "id": row[0],
            "platform": row[1],
            "text": row[2],
            "created_at": row[3],
            "author": row[4]
        } for row in mentions
    ]
