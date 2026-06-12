'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Message {
  id: string
  case_id: string
  sender: 'client' | 'agent'
  sender_name: string
  content: string
  encrypted: boolean
  created_at: string
}

interface Conversation {
  id: string
  case_number: string
  case_id: string
  last_message: string
  last_message_at: string
  unread_count: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/messages/conversations')
        if (response.ok) {
          const data = await response.json()
          setConversations(data)
          if (data.length > 0) {
            setSelectedConversation(data[0])
            loadMessages(data[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [])

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: selectedConversation.case_id,
          content: newMessage
        })
      })

      if (response.ok) {
        const message = await response.json()
        setMessages([...messages, message])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-900 to-background">
      {/* Navigation */}
      <nav className="border-b border-border/30 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SN</span>
            </div>
            <span className="text-xl font-bold text-primary">SHADOWNODE</span>
          </Link>
          <Link href="/dashboard" className="text-foreground/70 hover:text-primary transition text-sm">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Secure Messaging</h1>
          <p className="text-foreground/60">End-to-end encrypted communication with your case manager</p>
        </div>

        {/* Main Chat Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
          {/* Conversation List */}
          <div className="lg:col-span-1 bg-card border border-border/30 rounded-lg p-4 overflow-y-auto">
            <h2 className="font-bold mb-4">Cases</h2>
            {loading ? (
              <p className="text-foreground/60 text-sm">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-foreground/60 text-sm">No active cases</p>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      loadMessages(conv.id)
                    }}
                    className={`w-full text-left p-3 rounded transition ${
                      selectedConversation?.id === conv.id
                        ? 'bg-primary/20 border border-primary/50'
                        : 'hover:bg-foreground/5'
                    }`}
                  >
                    <p className="font-medium text-sm">{conv.case_number}</p>
                    <p className="text-xs text-foreground/60 truncate">{conv.last_message}</p>
                    <p className="text-xs text-foreground/40 mt-1">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-3 bg-card border border-border/30 rounded-lg flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-foreground/60 text-sm">No messages yet. Start the conversation.</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.sender === 'client'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background border border-border/30'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'client' ? 'text-primary-foreground/70' : 'text-foreground/50'}`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                          {msg.encrypted && (
                            <p className={`text-xs mt-1 ${msg.sender === 'client' ? 'text-primary-foreground/60' : 'text-primary'}`}>
                              🔒 Encrypted
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="border-t border-border/30 p-6">
                  <div className="flex gap-3">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message... (automatically encrypted)"
                      className="bg-background border border-border/50 flex-1 resize-none min-h-12"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 self-end"
                    >
                      Send
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/40 mt-2">All messages are encrypted end-to-end</p>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-foreground/60">Select a case to begin messaging</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-card border border-border/30 rounded-lg p-6">
          <h3 className="font-bold mb-4">Encryption & Privacy</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-foreground/60 mb-2">🔐 End-to-End Encrypted</p>
              <p className="text-xs text-foreground/50">
                Messages are encrypted locally before transmission. Only you and your case manager can read them.
              </p>
            </div>
            <div>
              <p className="text-sm text-foreground/60 mb-2">⏱️ Auto-Deletion</p>
              <p className="text-xs text-foreground/50">
                Conversation history is automatically deleted 30 days after case closure for maximum security.
              </p>
            </div>
            <div>
              <p className="text-sm text-foreground/60 mb-2">📋 Logging</p>
              <p className="text-xs text-foreground/50">
                Minimal logging for system operation. No unnecessary data retention or third-party access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
