import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socketService } from '../services/socketService'
import { useAuth } from '../contexts/AuthContext'
import { Article } from '../types/Article'

interface NewsUpdateData {
  type: 'new' | 'updated' | 'deleted'
  article: Article
  timestamp: number
}

interface UserUpdateData {
  type: string
  data: any
  timestamp: number
}

interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  lastPing: number | null
}

interface UseRealTimeUpdatesOptions {
  onNewsUpdate?: (data: NewsUpdateData) => void
  onUserUpdate?: (data: UserUpdateData) => void
  onConnectionStatusChange?: (status: ConnectionStatus) => void
  autoConnect?: boolean
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const { user, token } = useAuth()
  const queryClient = useQueryClient()
  const optionsRef = useRef(options)
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Handle news updates
  const handleNewsUpdate = useCallback((data: NewsUpdateData) => {
    console.log('Received news update:', data)
    
    // Update React Query cache
    queryClient.setQueryData(['articles'], (oldData: any) => {
      if (!oldData) return oldData
      
      const { articles = [], ...rest } = oldData
      
      switch (data.type) {
        case 'new':
          // Add new article to the beginning of the list
          return {
            ...rest,
            articles: [data.article, ...articles]
          }
        
        case 'updated':
          // Update existing article
          const updatedArticles = articles.map((article: Article) =>
            article.id === data.article.id ? data.article : article
          )
          return {
            ...rest,
            articles: updatedArticles
          }
        
        case 'deleted':
          // Remove deleted article
          const filteredArticles = articles.filter((article: Article) =>
            article.id !== data.article.id
          )
          return {
            ...rest,
            articles: filteredArticles
          }
        
        default:
          return oldData
      }
    })
    
    // Invalidate related queries to ensure consistency
    queryClient.invalidateQueries(['articles'])
    queryClient.invalidateQueries(['article', data.article.id])
    
    // Call custom handler if provided
    if (optionsRef.current.onNewsUpdate) {
      optionsRef.current.onNewsUpdate(data)
    }
  }, [queryClient])

  // Handle user-specific updates
  const handleUserUpdate = useCallback((data: UserUpdateData) => {
    console.log('Received user update:', data)
    
    // Handle different types of user updates
    switch (data.type) {
      case 'preferences':
        queryClient.invalidateQueries(['user', 'preferences'])
        break
      case 'history':
        queryClient.invalidateQueries(['user', 'history'])
        break
      default:
        break
    }
    
    // Call custom handler if provided
    if (optionsRef.current.onUserUpdate) {
      optionsRef.current.onUserUpdate(data)
    }
  }, [queryClient])

  // Handle connection status changes
  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    console.log('Connection status changed:', status)
    
    // Call custom handler if provided
    if (optionsRef.current.onConnectionStatusChange) {
      optionsRef.current.onConnectionStatusChange(status)
    }
  }, [])

  // Connect to Socket.io when user is authenticated
  useEffect(() => {
    if (user && token && options.autoConnect !== false) {
      console.log('Connecting to Socket.io...')
      
      socketService.connect(token).catch(error => {
        console.error('Failed to connect to Socket.io:', error)
      })
    }
    
    return () => {
      if (!user || !token) {
        socketService.disconnect()
      }
    }
  }, [user, token, options.autoConnect])

  // Set up event listeners
  useEffect(() => {
    const unsubscribeNews = socketService.on('news-update', handleNewsUpdate)
    const unsubscribeUser = socketService.on('user-update', handleUserUpdate)
    const unsubscribeStatus = socketService.on('connection-status', handleConnectionStatusChange)
    
    return () => {
      unsubscribeNews()
      unsubscribeUser()
      unsubscribeStatus()
    }
  }, [handleNewsUpdate, handleUserUpdate, handleConnectionStatusChange])

  // Subscribe to geographic region
  const subscribeToRegion = useCallback((bounds: { north: number, south: number, east: number, west: number }) => {
    socketService.subscribeToRegion(bounds)
  }, [])

  // Unsubscribe from geographic region
  const unsubscribeFromRegion = useCallback((bounds: { north: number, south: number, east: number, west: number }) => {
    socketService.unsubscribeFromRegion(bounds)
  }, [])

  // Manual connection control
  const connect = useCallback(async () => {
    if (token) {
      await socketService.connect(token)
    }
  }, [token])

  const disconnect = useCallback(() => {
    socketService.disconnect()
  }, [])

  const reconnect = useCallback(async () => {
    if (token) {
      await socketService.reconnect(token)
    }
  }, [token])

  return {
    // Connection status
    isConnected: socketService.isConnected,
    isConnecting: socketService.isConnecting,
    connectionError: socketService.connectionError,
    lastPingTime: socketService.lastPingTime,
    connectionStatus: socketService.getConnectionStatus(),
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    
    // Region subscription
    subscribeToRegion,
    unsubscribeFromRegion,
  }
}