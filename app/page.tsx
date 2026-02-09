'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { FiSend, FiPhoneOff, FiPhone, FiMessageSquare, FiClock, FiUser, FiInfo, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { RiHotelLine, RiVoiceprintFill } from 'react-icons/ri'
import { BiBot } from 'react-icons/bi'
import { HiOutlineSparkles } from 'react-icons/hi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const AGENT_ID = '698a1b3f0769219591839a9c'

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'processing' | 'speaking' | 'ended'

interface TranscriptMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  timestamp: string
}

interface BookingSummary {
  confirmationNumber: string
  checkIn: string
  checkOut: string
  roomType: string
  guests: number
}

// Sample data for demonstration
const SAMPLE_TRANSCRIPT: TranscriptMessage[] = [
  {
    id: 'sample-1',
    role: 'agent',
    text: 'Good evening, welcome to Grand Hotel & Suites. How may I assist you today?',
    timestamp: '8:00 PM',
  },
  {
    id: 'sample-2',
    role: 'user',
    text: "I'd like to book a room for next weekend please.",
    timestamp: '8:00 PM',
  },
  {
    id: 'sample-3',
    role: 'agent',
    text: "I'd be happy to help you with a reservation. Could you please let me know how many guests will be staying, and do you have a preference for room type? We offer Standard, Deluxe, and Suite accommodations.",
    timestamp: '8:01 PM',
  },
  {
    id: 'sample-4',
    role: 'user',
    text: 'Two guests, and we would prefer the Deluxe room.',
    timestamp: '8:01 PM',
  },
  {
    id: 'sample-5',
    role: 'agent',
    text: 'Excellent choice. Our Deluxe rooms feature a king-size bed, marble bathroom, and a lovely city view. For next weekend, that would be checking in Friday the 14th and checking out Sunday the 16th. Shall I proceed with this booking?',
    timestamp: '8:02 PM',
  },
]

const SAMPLE_BOOKING: BookingSummary = {
  confirmationNumber: 'GHS-2026-0214-DLX',
  checkIn: 'February 14, 2026',
  checkOut: 'February 16, 2026',
  roomType: 'Deluxe King',
  guests: 2,
}

// Waveform bars component for listening state
function ListeningWaveform() {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      <div className="w-1 rounded-full bg-amber-800/80 animate-waveform-1" />
      <div className="w-1 rounded-full bg-amber-800/70 animate-waveform-2" />
      <div className="w-1 rounded-full bg-amber-800/80 animate-waveform-3" />
      <div className="w-1 rounded-full bg-amber-800/60 animate-waveform-4" />
      <div className="w-1 rounded-full bg-amber-800/80 animate-waveform-5" />
      <div className="w-1 rounded-full bg-amber-800/70 animate-waveform-3" />
      <div className="w-1 rounded-full bg-amber-800/80 animate-waveform-1" />
    </div>
  )
}

// Waveform bars component for speaking state
function SpeakingWaveform() {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      <div className="w-1.5 rounded-full bg-amber-700/90 animate-speak-1" />
      <div className="w-1.5 rounded-full bg-amber-700/70 animate-speak-2" />
      <div className="w-1.5 rounded-full bg-amber-700/90 animate-speak-3" />
      <div className="w-1.5 rounded-full bg-amber-700/70 animate-speak-1" />
      <div className="w-1.5 rounded-full bg-amber-700/90 animate-speak-2" />
    </div>
  )
}

// Connecting dots animation
function ConnectingDots() {
  return (
    <div className="flex items-center justify-center gap-2 h-8">
      <div className="w-2 h-2 rounded-full bg-amber-800 animate-connecting-dot-1" />
      <div className="w-2 h-2 rounded-full bg-amber-800 animate-connecting-dot-2" />
      <div className="w-2 h-2 rounded-full bg-amber-800 animate-connecting-dot-3" />
    </div>
  )
}

// Status text mapping
function getStatusText(status: VoiceStatus): string {
  switch (status) {
    case 'idle':
      return 'Tap to speak with our concierge'
    case 'connecting':
      return 'Connecting to your concierge...'
    case 'connected':
      return 'Connected -- begin speaking'
    case 'listening':
      return 'Listening...'
    case 'processing':
      return 'Processing your request...'
    case 'speaking':
      return 'Concierge is speaking...'
    case 'ended':
      return 'Call ended'
    default:
      return 'Tap to speak with our concierge'
  }
}

// Status badge color
function getStatusBadgeVariant(status: VoiceStatus): string {
  switch (status) {
    case 'idle':
    case 'ended':
      return 'bg-stone-200 text-stone-600'
    case 'connecting':
      return 'bg-amber-100 text-amber-700'
    case 'connected':
    case 'listening':
      return 'bg-emerald-100 text-emerald-700'
    case 'processing':
      return 'bg-amber-100 text-amber-700'
    case 'speaking':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-stone-200 text-stone-600'
  }
}

export default function Home() {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [textInput, setTextInput] = useState('')
  const [isSendingText, setIsSendingText] = useState(false)
  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [showSampleData, setShowSampleData] = useState(false)
  const [showAgentInfo, setShowAgentInfo] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const msgIdCounterRef = useRef(0)

  // Scroll transcript to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, showSampleData])

  const generateMsgId = useCallback(() => {
    msgIdCounterRef.current += 1
    return `msg-${msgIdCounterRef.current}`
  }, [])

  // Active transcript (sample or real)
  const activeTranscript = showSampleData ? SAMPLE_TRANSCRIPT : transcript
  const activeBooking = showSampleData ? SAMPLE_BOOKING : booking

  // Start voice connection
  const startVoiceCall = useCallback(async () => {
    setMicError(null)
    setVoiceStatus('connecting')

    try {
      // Get WebSocket URL from API route
      const res = await fetch('/api/voice')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to get voice connection' }))
        setMicError(errData?.error ?? 'Failed to get voice connection')
        setVoiceStatus('idle')
        return
      }
      const data = await res.json()
      const wsUrl = data?.wsUrl
      if (!wsUrl) {
        setMicError('Voice connection URL not available')
        setVoiceStatus('idle')
        return
      }

      // Request microphone access
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setMicError('Microphone access is required for voice calls. Please allow microphone access and try again.')
        setVoiceStatus('idle')
        return
      }
      streamRef.current = stream

      // Open WebSocket
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setVoiceStatus('connected')

        // Start recording and sending audio
        try {
          const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
          mediaRecorderRef.current = mediaRecorder

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(e.data)
            }
          }

          mediaRecorder.start(250)
          setVoiceStatus('listening')
        } catch {
          // Fallback if audio/webm not supported
          const mediaRecorder = new MediaRecorder(stream)
          mediaRecorderRef.current = mediaRecorder

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(e.data)
            }
          }

          mediaRecorder.start(250)
          setVoiceStatus('listening')
        }
      }

      ws.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const parsed = JSON.parse(event.data)
            if (parsed?.type === 'transcript' || parsed?.text) {
              const role = parsed?.role === 'user' ? 'user' : 'agent'
              const text = parsed?.text ?? parsed?.message ?? ''
              if (text) {
                const now = new Date()
                const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                setTranscript(prev => [...prev, {
                  id: `ws-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                  role,
                  text,
                  timestamp: timeStr,
                }])
              }
            }
            if (parsed?.type === 'status' || parsed?.status) {
              const s = parsed?.status ?? parsed?.type
              if (s === 'listening' || s === 'processing' || s === 'speaking') {
                setVoiceStatus(s)
              }
            }
          } else if (event.data instanceof Blob) {
            // Binary audio data - play it
            const audioUrl = URL.createObjectURL(event.data)
            const audio = new Audio(audioUrl)
            setVoiceStatus('speaking')
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl)
              setVoiceStatus('listening')
            }
            audio.play().catch(() => {
              setVoiceStatus('listening')
            })
          }
        } catch {
          // Non-JSON message, ignore
        }
      }

      ws.onclose = () => {
        setVoiceStatus('ended')
        cleanup()
      }

      ws.onerror = () => {
        setMicError('Voice connection error. Please try again.')
        setVoiceStatus('ended')
        cleanup()
      }
    } catch {
      setMicError('Unable to start voice call. Please try again.')
      setVoiceStatus('idle')
    }
  }, [])

  // Clean up resources
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch { /* already stopped */ }
    }
    mediaRecorderRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // End voice call
  const endVoiceCall = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }
    wsRef.current = null
    cleanup()
    setVoiceStatus('ended')
  }, [cleanup])

  // Reset for new call
  const resetCall = useCallback(() => {
    endVoiceCall()
    setVoiceStatus('idle')
    setTranscript([])
    setBooking(null)
    setMicError(null)
  }, [endVoiceCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      cleanup()
    }
  }, [cleanup])

  // Text fallback - send message via callAIAgent
  const sendTextMessage = useCallback(async () => {
    if (!textInput.trim() || isSendingText) return

    const userMessage = textInput.trim()
    setTextInput('')
    setIsSendingText(true)

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    setTranscript(prev => [...prev, {
      id: generateMsgId(),
      role: 'user',
      text: userMessage,
      timestamp: timeStr,
    }])

    try {
      const result = await callAIAgent(userMessage, AGENT_ID)
      const agentNow = new Date()
      const agentTimeStr = agentNow.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

      let responseText = ''
      if (result?.success) {
        responseText = result?.response?.message ?? result?.response?.result?.text ?? result?.response?.result?.message ?? ''
        if (!responseText && typeof result?.response?.result === 'string') {
          responseText = result.response.result
        }
        if (!responseText && result?.raw_response) {
          responseText = String(result.raw_response)
        }
      } else {
        responseText = result?.error ?? 'I apologize, I was unable to process your request. Please try again.'
      }

      if (responseText) {
        setTranscript(prev => [...prev, {
          id: generateMsgId(),
          role: 'agent',
          text: responseText,
          timestamp: agentTimeStr,
        }])
      }
    } catch {
      const errNow = new Date()
      const errTimeStr = errNow.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      setTranscript(prev => [...prev, {
        id: generateMsgId(),
        role: 'agent',
        text: 'I apologize for the inconvenience. Please try your request again.',
        timestamp: errTimeStr,
      }])
    }

    setIsSendingText(false)
  }, [textInput, isSendingText, generateMsgId])

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendTextMessage()
    }
  }, [sendTextMessage])

  const isCallActive = voiceStatus !== 'idle' && voiceStatus !== 'ended'

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-amber-50/30 to-stone-100 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-amber-900/10 bg-white/60 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-900 flex items-center justify-center shadow-md">
              <RiHotelLine className="w-5 h-5 text-amber-50" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-amber-950 tracking-tight">Grand Hotel & Suites</h1>
              <p className="text-xs text-amber-800/60 font-medium tracking-wide uppercase">Voice Concierge</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-xs text-amber-800/70 font-medium">Sample Data</Label>
            <Switch
              id="sample-toggle"
              checked={showSampleData}
              onCheckedChange={setShowSampleData}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
        {/* Voice Control Section */}
        <div className="flex flex-col items-center pt-4 pb-6">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeVariant(voiceStatus)}`}>
              {(voiceStatus === 'listening' || voiceStatus === 'connected') && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              {voiceStatus === 'speaking' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
              {voiceStatus === 'connecting' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
              {getStatusText(voiceStatus)}
            </span>
          </div>

          {/* Mic Button with animations */}
          <div className="relative flex items-center justify-center mb-4">
            {/* Pulse rings when active */}
            {isCallActive && voiceStatus !== 'ended' && (
              <>
                <div className="absolute inset-0 w-36 h-36 -ml-[10px] -mt-[10px] rounded-full bg-amber-800/20 animate-pulse-ring" />
                <div className="absolute inset-0 w-36 h-36 -ml-[10px] -mt-[10px] rounded-full bg-amber-800/10 animate-pulse-ring-outer" />
              </>
            )}

            {/* Main Button */}
            {!isCallActive ? (
              <button
                onClick={startVoiceCall}
                className="relative w-28 h-28 rounded-full bg-gradient-to-br from-amber-800 to-amber-950 text-amber-50 flex items-center justify-center shadow-xl shadow-amber-900/30 hover:shadow-2xl hover:shadow-amber-900/40 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-800/30"
              >
                <FiPhone className="w-10 h-10" />
              </button>
            ) : (
              <button
                onClick={endVoiceCall}
                className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shadow-xl shadow-red-900/30 hover:shadow-2xl hover:shadow-red-900/40 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-600/30"
              >
                <FiPhoneOff className="w-10 h-10" />
              </button>
            )}
          </div>

          {/* Waveform Visualization */}
          <div className="h-14 flex items-center justify-center">
            {voiceStatus === 'listening' && <ListeningWaveform />}
            {voiceStatus === 'speaking' && <SpeakingWaveform />}
            {voiceStatus === 'connecting' && <ConnectingDots />}
            {voiceStatus === 'processing' && (
              <div className="flex items-center gap-2 text-amber-800/60 text-sm">
                <HiOutlineSparkles className="w-4 h-4 animate-pulse" />
                <span>Processing...</span>
              </div>
            )}
            {voiceStatus === 'idle' && (
              <p className="text-amber-800/50 text-sm text-center max-w-xs">
                Press the call button to speak directly with our concierge for reservations, amenities, or any assistance.
              </p>
            )}
            {voiceStatus === 'ended' && (
              <Button
                variant="outline"
                onClick={resetCall}
                className="border-amber-800/30 text-amber-900 hover:bg-amber-50"
              >
                <FiPhone className="w-4 h-4 mr-2" />
                New Call
              </Button>
            )}
          </div>

          {/* Microphone Error */}
          {micError && (
            <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center max-w-md animate-fade-in">
              {micError}
            </div>
          )}
        </div>

        <Separator className="bg-amber-900/10" />

        {/* Conversation Transcript */}
        <div className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiMessageSquare className="w-4 h-4 text-amber-800/60" />
              <h2 className="text-sm font-semibold text-amber-900/80 uppercase tracking-wider">Conversation</h2>
            </div>
            {activeTranscript.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs border-0">
                {activeTranscript.length} {activeTranscript.length === 1 ? 'message' : 'messages'}
              </Badge>
            )}
          </div>

          <Card className="flex-1 border-amber-900/10 bg-white/70 backdrop-blur-sm shadow-sm">
            <CardContent className="p-0">
              <ScrollArea className="h-[320px]">
                <div ref={scrollRef} className="p-4 space-y-4">
                  {activeTranscript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4 animate-float">
                        <RiVoiceprintFill className="w-7 h-7 text-amber-700" />
                      </div>
                      <p className="text-amber-800/60 text-sm max-w-xs">
                        Your conversation will appear here. Start a voice call or type a message below.
                      </p>
                    </div>
                  ) : (
                    activeTranscript.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                          {/* Speaker Label */}
                          <div className={`flex items-center gap-1.5 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'agent' && (
                              <BiBot className="w-3.5 h-3.5 text-amber-700" />
                            )}
                            <span className="text-[11px] font-medium text-amber-800/50 uppercase tracking-wider">
                              {msg.role === 'agent' ? 'Concierge' : 'You'}
                            </span>
                            {msg.role === 'user' && (
                              <FiUser className="w-3 h-3 text-amber-700" />
                            )}
                          </div>
                          {/* Message Bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-900 text-amber-50 rounded-br-md' : 'bg-amber-50 text-amber-950 border border-amber-200/60 rounded-bl-md'}`}
                          >
                            {msg.text}
                          </div>
                          {/* Timestamp */}
                          <div className={`flex items-center gap-1 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <FiClock className="w-2.5 h-2.5 text-amber-800/30" />
                            <span className="text-[10px] text-amber-800/30">{msg.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing indicator when sending */}
                  {isSendingText && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/60 rounded-bl-md">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-600 animate-connecting-dot-1" />
                          <div className="w-2 h-2 rounded-full bg-amber-600 animate-connecting-dot-2" />
                          <div className="w-2 h-2 rounded-full bg-amber-600 animate-connecting-dot-3" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary Panel */}
        {activeBooking && (
          <div className="mt-4 animate-slide-up">
            <Card className="border-amber-800/20 bg-gradient-to-br from-amber-50 to-stone-50 shadow-md">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                    <HiOutlineSparkles className="w-4 h-4 text-amber-600" />
                    Booking Confirmed
                  </CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium">Confirmed</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-amber-800/50 text-xs uppercase tracking-wider mb-0.5">Confirmation</p>
                    <p className="font-semibold text-amber-950">{activeBooking.confirmationNumber}</p>
                  </div>
                  <div>
                    <p className="text-amber-800/50 text-xs uppercase tracking-wider mb-0.5">Room Type</p>
                    <p className="font-semibold text-amber-950">{activeBooking.roomType}</p>
                  </div>
                  <div>
                    <p className="text-amber-800/50 text-xs uppercase tracking-wider mb-0.5">Check-in</p>
                    <p className="font-semibold text-amber-950">{activeBooking.checkIn}</p>
                  </div>
                  <div>
                    <p className="text-amber-800/50 text-xs uppercase tracking-wider mb-0.5">Check-out</p>
                    <p className="font-semibold text-amber-950">{activeBooking.checkOut}</p>
                  </div>
                  <div>
                    <p className="text-amber-800/50 text-xs uppercase tracking-wider mb-0.5">Guests</p>
                    <p className="font-semibold text-amber-950">{activeBooking.guests}</p>
                  </div>
                </div>
                {!showSampleData && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetCall}
                      className="w-full border-amber-800/20 text-amber-900 hover:bg-amber-50 text-xs"
                    >
                      New Booking
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Text Input Fallback */}
        <div className="mt-4 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message to the concierge..."
                className="pr-10 bg-white/80 border-amber-900/15 text-amber-950 placeholder:text-amber-800/30 focus-visible:ring-amber-800/30 text-sm"
                disabled={isSendingText}
              />
            </div>
            <Button
              onClick={sendTextMessage}
              disabled={!textInput.trim() || isSendingText}
              size="icon"
              className="bg-amber-900 hover:bg-amber-800 text-amber-50 shadow-md transition-all duration-200 disabled:opacity-40"
            >
              <FiSend className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-amber-800/40 mt-1.5 text-center">
            Voice is the primary way to interact. Text input is available for accessibility.
          </p>
        </div>
      </main>

      {/* Agent Info Section */}
      <footer className="border-t border-amber-900/10 bg-white/40 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => setShowAgentInfo(!showAgentInfo)}
            className="w-full py-3 flex items-center justify-between text-xs text-amber-800/50 hover:text-amber-800/70 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <FiInfo className="w-3.5 h-3.5" />
              <span className="font-medium uppercase tracking-wider">Agent Information</span>
            </div>
            {showAgentInfo ? <FiChevronDown className="w-3.5 h-3.5" /> : <FiChevronUp className="w-3.5 h-3.5" />}
          </button>

          {showAgentInfo && (
            <div className="pb-4 animate-fade-in">
              <Card className="border-amber-900/10 bg-white/60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <BiBot className="w-4 h-4 text-amber-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-amber-950">Hotel Concierge Agent</h3>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isCallActive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
                          <span className="text-[10px] text-amber-800/50 uppercase tracking-wider">
                            {isCallActive ? 'Active' : 'Standby'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-800/50 mt-0.5">
                        Voice-powered concierge for room bookings, amenities, dining reservations, and guest services.
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="text-[10px] border-amber-800/15 text-amber-800/50 py-0 h-5">Voice Agent</Badge>
                        <Badge variant="outline" className="text-[10px] border-amber-800/15 text-amber-800/50 py-0 h-5">Inbound</Badge>
                        <span className="text-[10px] text-amber-800/30 font-mono">{AGENT_ID.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
