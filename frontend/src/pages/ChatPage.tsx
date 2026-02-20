import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'
const WS_URL = 'ws://127.0.0.1:8000'

type UserMini = { id: number; name: string; email: string }
type ListingMini = { id: number; title: string; price: number }
type MessageType = {
    id: number
    conversation_id: number
    sender_id: number
    content: string | null
    attachment_url: string | null
    attachment_type: string | null
    attachment_public_id: string | null
    is_read: boolean
    created_at: string
}
type ConversationDetail = {
    id: number
    listing_id: number
    buyer_id: number
    seller_id: number
    buyer: UserMini
    seller: UserMini
    listing: ListingMini
    messages: MessageType[]
}

export default function ChatPage({ token }: { token: string | null }) {
    const { conversationId } = useParams<{ conversationId: string }>()
    const [conversation, setConversation] = useState<ConversationDetail | null>(null)
    const [messages, setMessages] = useState<MessageType[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const [isTyping, setIsTyping] = useState(false)
    const [showAttachMenu, setShowAttachMenu] = useState(false)

    const wsRef = useRef<WebSocket | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    // Get current user
    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setCurrentUserId(data.id))
            .catch(() => { })
    }, [token])

    // Load conversation
    useEffect(() => {
        if (!token || !conversationId) return
        setLoading(true)
        fetch(`${API_URL}/chat/conversations/${conversationId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('Failed to load conversation')
                const data = (await res.json()) as ConversationDetail
                setConversation(data)
                setMessages(data.messages)
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false))
    }, [token, conversationId])

    // WebSocket
    useEffect(() => {
        if (!token) return

        const ws = new WebSocket(`${WS_URL}/chat/ws?token=${token}`)
        wsRef.current = ws

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === 'new_message' && data.message.conversation_id === Number(conversationId)) {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some((m) => m.id === data.message.id)) return prev
                    return [...prev, data.message]
                })
            }
            if (data.type === 'typing' && data.conversation_id === Number(conversationId)) {
                setIsTyping(true)
                setTimeout(() => setIsTyping(false), 2000)
            }
        }

        ws.onopen = () => {
            // Mark messages as read
            ws.send(JSON.stringify({ action: 'mark_read', conversation_id: Number(conversationId) }))
        }

        return () => {
            ws.close()
        }
    }, [token, conversationId])

    // Send message
    const sendMessage = () => {
        if (!input.trim() && !uploading) return
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        wsRef.current.send(
            JSON.stringify({
                action: 'send_message',
                conversation_id: Number(conversationId),
                content: input.trim(),
            }),
        )
        setInput('')
    }

    // Handle typing indicator
    const handleInputChange = (value: string) => {
        setInput(value)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    action: 'typing',
                    conversation_id: Number(conversationId),
                }),
            )
        }
    }

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !token) return

        setUploading(true)
        setShowAttachMenu(false)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_URL}/chat/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })

            if (!res.ok) throw new Error('Upload failed')

            const data = await res.json()

            // Send attachment message via WebSocket
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({
                        action: 'send_message',
                        conversation_id: Number(conversationId),
                        content: '',
                        attachment_url: data.url,
                        attachment_type: data.resource_type,
                        attachment_public_id: data.public_id,
                    }),
                )
            }
        } catch (err: any) {
            alert('Failed to upload file: ' + (err.message || 'Unknown error'))
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Key handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    if (!token)
        return (
            <div className="chat-page">
                <div className="chat-auth-prompt">
                    <div className="auth-prompt-icon">🔒</div>
                    <h2>Login Required</h2>
                    <p>Please log in to access messages.</p>
                    <Link to="/login" className="auth-prompt-btn">
                        Go to Login
                    </Link>
                </div>
            </div>
        )

    if (loading) return <div className="chat-loading"><div className="chat-loading-spinner"></div><p>Loading conversation…</p></div>
    if (error) return <div className="chat-page"><p className="error">{error}</p></div>
    if (!conversation) return null

    const otherUser = currentUserId === conversation.buyer_id ? conversation.seller : conversation.buyer

    return (
        <div className="chat-page">
            {/* Chat header */}
            <div className="chat-header">
                <Link to="/messages" className="chat-back-btn" title="Back to messages">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </Link>
                <div className="chat-header-info">
                    <div className="chat-avatar">{otherUser.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <h3 className="chat-header-name">{otherUser.name}</h3>
                        <p className="chat-header-listing">
                            Re: {conversation.listing.title} — ₹{conversation.listing.price.toLocaleString()}
                        </p>
                    </div>
                </div>
                <Link to={`/listings/${conversation.listing_id}`} className="chat-listing-link" title="View listing">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </Link>
            </div>

            {/* Messages area */}
            <div className="chat-messages">
                <div className="chat-messages-start">
                    <div className="chat-convo-badge">
                        <span>🛒</span> Conversation about <strong>{conversation.listing.title}</strong>
                    </div>
                </div>
                {messages.map((msg) => {
                    const isMine = msg.sender_id === currentUserId
                    return (
                        <div key={msg.id} className={`chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-other'}`}>
                            {!isMine && (
                                <div className="chat-msg-avatar">
                                    {otherUser.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="chat-msg-bubble-wrapper">
                                <div className={`chat-msg-bubble ${isMine ? 'bubble-mine' : 'bubble-other'}`}>
                                    {msg.attachment_url && (
                                        <div className="chat-attachment">
                                            {msg.attachment_type === 'video' ? (
                                                <video
                                                    src={msg.attachment_url}
                                                    controls
                                                    className="chat-attachment-media"
                                                />
                                            ) : (
                                                <img
                                                    src={msg.attachment_url}
                                                    alt="attachment"
                                                    className="chat-attachment-media"
                                                    onClick={() => window.open(msg.attachment_url!, '_blank')}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {msg.content && <p className="chat-msg-text">{msg.content}</p>}
                                </div>
                                <span className="chat-msg-time">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMine && (
                                        <span className={`chat-msg-status ${msg.is_read ? 'read' : ''}`}>
                                            {msg.is_read ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )
                })}
                {isTyping && (
                    <div className="chat-msg chat-msg-other">
                        <div className="chat-msg-avatar">{otherUser.name.charAt(0).toUpperCase()}</div>
                        <div className="chat-typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="chat-input-area">
                <div className="chat-input-row">
                    <div className="chat-attach-wrapper">
                        <button
                            className="chat-attach-btn"
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            title="Attach file"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                        </button>
                        {showAttachMenu && (
                            <div className="chat-attach-menu">
                                <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false) }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    Image
                                </button>
                                <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false) }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                                    Video
                                </button>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" hidden />
                    <textarea
                        className="chat-text-input"
                        placeholder="Type a message…"
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={sendMessage}
                        disabled={!input.trim() || uploading}
                        title="Send"
                    >
                        {uploading ? (
                            <div className="chat-send-spinner"></div>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
