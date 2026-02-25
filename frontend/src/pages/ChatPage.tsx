import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Paperclip, Send, ArrowLeft, ShieldCheck, User, X, FileText } from 'lucide-react'
import './Chat.css'

const API_URL = 'http://127.0.0.1:8000'

type Message = {
    id: number
    sender_id: number
    content: string
    created_at: string
    attachment_url?: string
    attachment_type?: string
    attachment_public_id?: string
}

export default function ChatPage({ token }: { token: string | null }) {
    const { conversationId } = useParams()
    const [messages, setMessages] = useState<Message[]>([])
    const [content, setContent] = useState('')
    const [partner] = useState({ name: 'Member', is_verified: true })
    const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)
    const [attachment, setAttachment] = useState<{ url: string, type: string, public_id: string } | null>(null)
    const [uploading, setUploading] = useState(false)
    const navigate = useNavigate()
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!token) return

        // Fetch my profile to know my ID
        fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => setCurrentUser(data))
            .catch(err => console.error("Auth fetch failed", err))

        const fetchMessages = () => {
            fetch(`${API_URL}/messages/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((r) => r.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        setMessages(data)
                    }
                })
        }
        fetchMessages()
        const interval = setInterval(fetchMessages, 3000)
        return () => clearInterval(interval)
    }, [conversationId, token])

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !token) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_URL}/messages/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            })
            if (!res.ok) throw new Error('Upload failed')
            const data = await res.json()
            setAttachment({
                url: data.url,
                type: data.resource_type,
                public_id: data.public_id
            })
        } catch (err) {
            console.error(err)
            alert('Failed to upload media')
        } finally {
            setUploading(false)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!content.trim() && !attachment) || !token) return

        const payload = {
            content: content.trim() || undefined,
            attachment_url: attachment?.url,
            attachment_type: attachment?.type,
            attachment_public_id: attachment?.public_id
        }

        setContent('')
        setAttachment(null)

        try {
            await fetch(`${API_URL}/messages/${conversationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            })
        } catch (err) { console.error(err) }
    }

    return (
        <div className="chat-room-elite">
            <header className="chat-room-header">
                <button className="btn-back-elite" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="chat-partner-brief">
                    <div className="partner-identity">
                        <User size={18} className="emerald-glow" />
                        <span className="partner-name">{partner.name}</span>
                        {partner.is_verified && <ShieldCheck size={14} className="emerald-glow" />}
                    </div>
                    <span className="status-indicator">Active in thread</span>
                </div>
            </header>

            <div className="messages-thread" ref={scrollRef}>
                <AnimatePresence>
                    {messages.map((m, idx) => {
                        const isMine = currentUser && m.sender_id === currentUser.id
                        return (
                            <motion.div
                                key={m.id || idx}
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className={`msg-bubble-elite ${isMine ? 'mine' : 'other'}`}
                            >
                                {m.attachment_url && (
                                    <div className="msg-attachment">
                                        {m.attachment_type === 'image' && (
                                            <img src={m.attachment_url} alt="Attachment" className="attached-img" onClick={() => window.open(m.attachment_url, '_blank')} />
                                        )}
                                        {m.attachment_type === 'video' && (
                                            <video src={m.attachment_url} controls className="attached-video" />
                                        )}
                                        {m.attachment_type === 'raw' && (
                                            <a href={m.attachment_url} target="_blank" rel="noreferrer" className="attached-file">
                                                <FileText size={20} />
                                                <span>Document.pdf</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                {m.content && <div className="msg-text">{m.content}</div>}
                                <span className="msg-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <div className="chat-input-area">
                {attachment && (
                    <div className="attachment-preview glass">
                        {attachment.type === 'image' ? (
                            <img src={attachment.url} alt="Preview" />
                        ) : (
                            <div className="file-icon-preview">
                                <FileText size={24} />
                            </div>
                        )}
                        <div className="attachment-meta">
                            <span className="attachment-name">Attached {attachment.type}</span>
                            <span className="attachment-status">Ready to send</span>
                        </div>
                        <button className="remove-attachment" onClick={() => setAttachment(null)}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSend} className="chat-input-wrap">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        hidden
                        accept="image/*,video/*,application/pdf"
                    />

                    <button
                        type="button"
                        className="btn-attach-elite"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <div className="spinner-tiny" /> : <Paperclip size={20} />}
                    </button>

                    <input
                        className="chat-input-elite"
                        placeholder={uploading ? "Syncing media..." : "Compose a secure message..."}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={uploading}
                    />
                    <button type="submit" className="btn-send-elite" disabled={uploading}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    )
}
