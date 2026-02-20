import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

type UserMini = { id: number; name: string; email: string }
type ListingMini = { id: number; title: string; price: number }
type MessageType = {
    id: number
    conversation_id: number
    sender_id: number
    content: string | null
    attachment_url: string | null
    attachment_type: string | null
    is_read: boolean
    created_at: string
}
type ConversationType = {
    id: number
    listing_id: number
    buyer_id: number
    seller_id: number
    buyer: UserMini
    seller: UserMini
    listing: ListingMini
    last_message: MessageType | null
    unread_count: number
    updated_at: string
}

export default function ChatListPage({ token }: { token: string | null }) {
    const [conversations, setConversations] = useState<ConversationType[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setCurrentUserId(data.id))
            .catch(() => { })
    }, [token])

    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/chat/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) throw new Error()
                setConversations(await res.json())
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [token])

    if (!token)
        return (
            <div className="chatlist-page">
                <div className="chat-auth-prompt">
                    <div className="auth-prompt-icon">💬</div>
                    <h2>Your Messages</h2>
                    <p>Log in to view your conversations.</p>
                    <Link to="/login" className="auth-prompt-btn">
                        Go to Login
                    </Link>
                </div>
            </div>
        )

    if (loading)
        return <div className="chat-loading"><div className="chat-loading-spinner"></div><p>Loading conversations…</p></div>

    return (
        <div className="chatlist-page">
            <div className="chatlist-header">
                <h2>💬 Messages</h2>
                <p className="chatlist-subtitle">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>

            {conversations.length === 0 ? (
                <div className="chatlist-empty">
                    <div className="chatlist-empty-icon">📭</div>
                    <h3>No conversations yet</h3>
                    <p>Start chatting by clicking "Chat with Seller" on any listing!</p>
                    <Link to="/" className="auth-prompt-btn">Browse Listings</Link>
                </div>
            ) : (
                <div className="chatlist-list">
                    {conversations.map((conv) => {
                        const otherUser = currentUserId === conv.buyer_id ? conv.seller : conv.buyer
                        const lastMsg = conv.last_message

                        return (
                            <div
                                key={conv.id}
                                className={`chatlist-item ${conv.unread_count > 0 ? 'chatlist-item-unread' : ''}`}
                                onClick={() => navigate(`/chat/${conv.id}`)}
                            >
                                <div className="chatlist-avatar">
                                    {otherUser.name.charAt(0).toUpperCase()}
                                    {conv.unread_count > 0 && (
                                        <span className="chatlist-badge">{conv.unread_count}</span>
                                    )}
                                </div>
                                <div className="chatlist-content">
                                    <div className="chatlist-top-row">
                                        <span className="chatlist-name">{otherUser.name}</span>
                                        {lastMsg && (
                                            <span className="chatlist-time">
                                                {formatTime(lastMsg.created_at)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="chatlist-listing-title">
                                        🛒 {conv.listing.title} — ₹{conv.listing.price.toLocaleString()}
                                    </p>
                                    <p className="chatlist-preview">
                                        {lastMsg
                                            ? lastMsg.attachment_url
                                                ? `📎 ${lastMsg.attachment_type === 'video' ? 'Video' : 'Photo'}`
                                                : lastMsg.content || ''
                                            : 'No messages yet'}
                                    </p>
                                </div>
                                <svg className="chatlist-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function formatTime(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHrs = diffMs / (1000 * 60 * 60)

    if (diffHrs < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diffHrs < 48) return 'Yesterday'
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
