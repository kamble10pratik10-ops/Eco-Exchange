import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquare, Clock, ChevronRight, Package } from 'lucide-react'
import './Chat.css'

const API_URL = 'http://127.0.0.1:8000'

type Conversation = {
    id: number
    listing_id: number
    listing_title: string
    listing_image?: string
    other_user_name: string
    last_message?: string
    updated_at: string
}

export default function ChatListPage({ token }: { token: string | null }) {
    const [convos, setConvos] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        fetch(`${API_URL}/messages/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setConvos(data))
            .finally(() => setLoading(false))
    }, [token])

    if (loading) return <div className="loading-container-elite"><span>Connecting to ambient thread...</span></div>

    return (
        <div className="messages-page-elite">
            <motion.div
                className="messages-header"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <h1 className="text-gradient">Communications</h1>
            </motion.div>

            {convos.length === 0 ? (
                <div className="empty-state-elite">
                    <MessageSquare size={64} />
                    <h3>No active negotiations</h3>
                    <p>Your messages with sellers and buyers will appear here.</p>
                </div>
            ) : (
                <motion.div
                    className="chat-list-elite"
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                >
                    {convos.map((c) => (
                        <motion.div key={c.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <Link to={`/chat/${c.id}`} className="convo-card-elite">
                                <div className="item-thumbnail-elite">
                                    {c.listing_image ? <img src={c.listing_image} alt="" /> : <Package size={24} />}
                                </div>

                                <div className="convo-info">
                                    <div className="convo-top">
                                        <span className="partner-name">{c.other_user_name}</span>
                                        <span className="convo-time">{new Date(c.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="convo-listing-tag emerald-badge" style={{ fontSize: '0.65rem', display: 'inline-block', marginBottom: '4px' }}>
                                        {c.listing_title}
                                    </div>
                                    <p className="last-msg">{c.last_message || 'Start a secure conversation...'}</p>
                                </div>

                                <ChevronRight size={20} className="chevron-faint" color="var(--text-secondary)" />
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    )
}
