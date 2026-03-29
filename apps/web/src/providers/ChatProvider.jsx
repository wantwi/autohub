import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { getEnv } from '@/lib/env'
import { useAuthStore } from '@/stores/authStore'

const ChatContext = createContext(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

export function useChatUnread() {
  const ctx = useContext(ChatContext)
  return ctx?.unreadCount ?? 0
}

export function ChatProvider({ children }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const listenersRef = useRef(new Set())

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnected(false)
      setUnreadCount(0)
      return
    }

    const { apiBaseUrl } = getEnv()
    const wsUrl = apiBaseUrl.replace(/\/v1\/?$/, '')

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('new_message', (msg) => {
      if (msg.senderId !== user.id) {
        setUnreadCount((c) => c + 1)
      }
      for (const fn of listenersRef.current) {
        fn('new_message', msg)
      }
    })

    socket.on('messages_read', (payload) => {
      for (const fn of listenersRef.current) {
        fn('messages_read', payload)
      }
    })

    socket.on('typing', (payload) => {
      for (const fn of listenersRef.current) {
        fn('typing', payload)
      }
    })

    socket.on('message_reaction', (payload) => {
      for (const fn of listenersRef.current) {
        fn('message_reaction', payload)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [token, user])

  const sendMessage = useCallback((conversationId, body, attachmentUrl, attachmentType, replyToId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Not connected'))
      const payload = { conversationId, body }
      if (attachmentUrl && attachmentType) {
        payload.attachmentUrl = attachmentUrl
        payload.attachmentType = attachmentType
      }
      if (replyToId) {
        payload.replyToId = replyToId
      }
      const timeout = setTimeout(() => reject(new Error('Server did not respond in time')), 15000)
      socketRef.current.emit('send_message', payload, (resp) => {
        clearTimeout(timeout)
        if (resp?.error) reject(new Error(resp.error))
        else resolve(resp?.data)
      })
    })
  }, [])

  const reactToMessage = useCallback((messageId, emoji) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Not connected'))
      socketRef.current.emit('react_message', { messageId, emoji }, (resp) => {
        if (resp?.error) reject(new Error(resp.error))
        else resolve(resp?.data)
      })
    })
  }, [])

  const removeReaction = useCallback((messageId) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) return reject(new Error('Not connected'))
      socketRef.current.emit('remove_reaction', { messageId }, (resp) => {
        if (resp?.error) reject(new Error(resp.error))
        else resolve(resp?.data)
      })
    })
  }, [])

  const markRead = useCallback((conversationId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) return resolve()
      socketRef.current.emit('mark_read', { conversationId }, () => resolve())
    })
  }, [])

  const startTyping = useCallback((conversationId) => {
    socketRef.current?.emit('typing', { conversationId })
  }, [])

  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('join_conversation', { conversationId })
  }, [])

  const leaveConversation = useCallback((conversationId) => {
    socketRef.current?.emit('leave_conversation', { conversationId })
  }, [])

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn)
    return () => listenersRef.current.delete(fn)
  }, [])

  const setUnread = useCallback((n) => setUnreadCount(n), [])

  return (
    <ChatContext.Provider
      value={{
        connected,
        unreadCount,
        setUnread,
        sendMessage,
        reactToMessage,
        removeReaction,
        markRead,
        startTyping,
        joinConversation,
        leaveConversation,
        subscribe,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
