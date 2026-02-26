import os
import json
from datetime import datetime, timezone
from typing import Dict, Set

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc

from .database import get_db
from .auth import get_current_user, SECRET_KEY, ALGORITHM
from . import models
from .chat_models import Conversation, Message
from .chat_schemas import (
    ConversationCreate,
    ConversationOut,
    ConversationDetail,
    MessageCreate,
    MessageOut,
    UserMini,
    ListingMini,
)

from jose import jwt, JWTError
import cloudinary
import cloudinary.uploader
from starlette.concurrency import run_in_threadpool

router = APIRouter(tags=["chat"])

# ─── WebSocket connection manager ───

class ConnectionManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        # user_id -> set of WebSocket connections (multiple tabs)
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        print(f"WS: User {user_id} connected")
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            dead = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[user_id].discard(ws)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


manager = ConnectionManager()


# ─── Helper: authenticate WebSocket via token query param ───

def ws_authenticate(token: str, db: Session) -> models.User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, Exception):
        return None
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user


# ─── WebSocket endpoint ───

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query("")):
    db = next(get_db())
    user = ws_authenticate(token, db)
    if not user:
        print("WS AUTH FAILED: Invalid token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        db.close()
        return

    await manager.connect(websocket, user.id)
    
    # Upon connection, mark any messages sent to this user in any conversation as delivered
    db.query(Message).filter(
        Message.is_delivered == False,
        Message.sender_id != user.id
    ).join(Conversation).filter(
        (Conversation.buyer_id == user.id) | (Conversation.seller_id == user.id)
    ).update({"is_delivered": True})
    db.commit()

    # Notify partners that their messages were delivered
    convos = db.query(Conversation).filter((Conversation.buyer_id == user.id) | (Conversation.seller_id == user.id)).all()
    for c in convos:
        other_id = c.seller_id if user.id == c.buyer_id else c.buyer_id
        await manager.send_to_user(other_id, {
            "type": "messages_delivered",
            "conversation_id": c.id,
            "receiver_id": user.id
        })

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "send_message":
                conv_id = data.get("conversation_id")
                content = data.get("content")
                attachment_url = data.get("attachment_url")
                attachment_type = data.get("attachment_type")
                attachment_public_id = data.get("attachment_public_id")

                # Validate conversation exists and user is a participant
                conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if not conv or (user.id != conv.buyer_id and user.id != conv.seller_id):
                    await websocket.send_json({"error": "Invalid conversation"})
                    continue

                # Create message
                msg = Message(
                    conversation_id=conv_id,
                    sender_id=user.id,
                    content=content,
                    attachment_url=attachment_url,
                    attachment_type=attachment_type,
                    attachment_public_id=attachment_public_id,
                )
                db.add(msg)
                conv.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(msg)

                msg_data = {
                    "type": "new_message",
                    "message": {
                        "id": msg.id,
                        "conversation_id": msg.conversation_id,
                        "sender_id": msg.sender_id,
                        "content": msg.content,
                        "attachment_url": msg.attachment_url,
                        "attachment_type": msg.attachment_type,
                        "attachment_public_id": msg.attachment_public_id,
                        "is_read": msg.is_read,
                        "created_at": msg.created_at.isoformat(),
                    },
                }

                # Check if recipient is online
                other_id = conv.seller_id if user.id == conv.buyer_id else conv.buyer_id
                receiver_online = manager.is_online(other_id)
                
                # Update message state
                msg.is_delivered = receiver_online
                db.commit()
                db.refresh(msg)
                
                msg_data = {
                    "type": "new_message",
                    "message": MessageOut.model_validate(msg).model_dump(mode="json")
                }

                # Send to both participants
                await manager.send_to_user(user.id, msg_data)
                await manager.send_to_user(other_id, msg_data)

            elif action == "mark_read":
                conv_id = data.get("conversation_id")
                conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if conv and (user.id == conv.buyer_id or user.id == conv.seller_id):
                    db.query(Message).filter(
                        Message.conversation_id == conv_id,
                        Message.sender_id != user.id,
                        Message.is_read == False,
                    ).update({"is_read": True, "is_delivered": True})
                    db.commit()
                    other_id = conv.seller_id if user.id == conv.buyer_id else conv.buyer_id
                    status_update = {"type": "messages_read", "conversation_id": conv_id, "reader_id": user.id}
                    await manager.send_to_user(user.id, status_update)
                    await manager.send_to_user(other_id, status_update)

            elif action == "typing":
                conv_id = data.get("conversation_id")
                conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                if conv:
                    other_id = conv.seller_id if user.id == conv.buyer_id else conv.buyer_id
                    await manager.send_to_user(other_id, {
                        "type": "typing",
                        "conversation_id": conv_id,
                        "user_id": user.id,
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
    except Exception as e:
        print(f"WS ERROR: {str(e)}")
        manager.disconnect(websocket, user.id)
    finally:
        db.close()


# ─── REST endpoints ───

@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_or_get_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a conversation for a listing, or return existing one."""
    listing = db.query(models.Listing).filter(models.Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot chat with yourself")

    # Check if conversation already exists
    existing = db.query(Conversation).filter(
        Conversation.listing_id == payload.listing_id,
        Conversation.buyer_id == current_user.id,
        Conversation.seller_id == listing.owner_id,
    ).first()

    if existing:
        return _build_conversation_out(existing, current_user.id, db)

    conv = Conversation(
        listing_id=payload.listing_id,
        buyer_id=current_user.id,
        seller_id=listing.owner_id,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return _build_conversation_out(conv, current_user.id, db)


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all conversations for the current user."""
    convos = (
        db.query(Conversation)
        .filter(or_(Conversation.buyer_id == current_user.id, Conversation.seller_id == current_user.id))
        .order_by(desc(Conversation.updated_at))
        .all()
    )
    return [_build_conversation_out(c, current_user.id, db) for c in convos]


@router.get("/convo/{conversation_id}", response_model=list[MessageOut])
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    print(f"DEBUG: Backend fetching messages for ID {conversation_id}", flush=True)
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id not in (conv.buyer_id, conv.seller_id):
        raise HTTPException(status_code=403, detail="Access denied")

    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()
    
    # Mark as read
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    
    return messages


@router.get("/convo/{conversation_id}/detail", response_model=ConversationOut)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get metadata for a specific conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id != conv.buyer_id and current_user.id != conv.seller_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return _build_conversation_out(conv, current_user.id, db)


@router.post("/convo/{conversation_id}", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send a message in a conversation (REST fallback)."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.id not in (conv.buyer_id, conv.seller_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Delivery Check
    other_id = conv.seller_id if current_user.id == conv.buyer_id else conv.buyer_id
    receiver_online = manager.is_online(other_id)

    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
        attachment_url=payload.attachment_url,
        attachment_type=payload.attachment_type,
        attachment_public_id=payload.attachment_public_id,
        is_delivered=receiver_online,
        is_read=False
    )
    db.add(msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)
    
    print(f"DEBUG: Processing outgoing message for convo {conversation_id} from {current_user.id}")
    # Broadcast to recipient if online
    msg_data = {"type": "new_message", "message": MessageOut.model_validate(msg).model_dump(mode="json")}
    await manager.send_to_user(other_id, msg_data)
    
    return msg


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    """Upload an image or video to Cloudinary."""
    try:
        # Configure Cloudinary
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        api_key = os.environ.get("CLOUDINARY_API_KEY")
        api_secret = os.environ.get("CLOUDINARY_API_SECRET")

        if not all([cloud_name, api_key, api_secret]):
            raise HTTPException(status_code=500, detail="Cloudinary credentials missing in server .env file")

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )

        # Determine resource type
        content_type = file.content_type or ""
        if content_type.startswith("video"):
            resource_type = "video"
        elif content_type == "application/pdf":
            resource_type = "raw"
        elif content_type.startswith("image"):
            resource_type = "image"
        else:
            resource_type = "auto"

        # Read file content as bytes
        file_bytes = await file.read()
        
        # Run in threadpool to avoid blocking event loop
        result = await run_in_threadpool(
            cloudinary.uploader.upload,
            file_bytes,
            folder="exo_exchange_chat",
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True
        )

        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": result.get("resource_type", resource_type),
        }
    except Exception as e:
        print(f"UPLOAD ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Attachment upload failed: {str(e)}")
@router.get("/cloudinary-signature")
def get_cloudinary_signature(
    current_user: models.User = Depends(get_current_user),
):
    """Generate a signature for direct browser → Cloudinary uploads."""
    try:
        import time
        import cloudinary.utils
        
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        api_key = os.environ.get("CLOUDINARY_API_KEY")
        api_secret = os.environ.get("CLOUDINARY_API_SECRET")

        if not all([cloud_name, api_key, api_secret]):
            raise HTTPException(status_code=500, detail="Cloudinary credentials missing")

        timestamp = int(time.time())
        params = {
            "timestamp": timestamp,
            "folder": "exo_exchange_listings",
        }
        
        signature = cloudinary.utils.api_sign_request(params, api_secret)
        
        return {
            "signature": signature,
            "timestamp": timestamp,
            "api_key": api_key,
            "cloud_name": cloud_name,
            "folder": "exo_exchange_listings"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Helpers ───

def _build_conversation_out(conv: Conversation, current_user_id: int, db: Session) -> dict:
    """Build ConversationOut with last_message and unread_count."""
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(desc(Message.created_at))
        .first()
    )

    unread = (
        db.query(func.count(Message.id))
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user_id,
            Message.is_read == False,
        )
        .scalar()
    )

    return ConversationOut(
        id=conv.id,
        listing_id=conv.listing_id,
        buyer_id=conv.buyer_id,
        seller_id=conv.seller_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        buyer=UserMini.model_validate(conv.buyer),
        seller=UserMini.model_validate(conv.seller),
        listing=ListingMini.model_validate(conv.listing),
        last_message=MessageOut.model_validate(last_msg) if last_msg else None,
        unread_count=unread or 0,
    )
