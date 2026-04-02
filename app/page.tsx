"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Автопрокрутка вниз
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    fetchMessages()
    const channel = supabase.channel('realtime messages').on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages' }, 
      (payload) => {
        setMessages((prev) => [...prev, payload.new])
      }
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(scrollToBottom, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('messages').insert([{ text }])
    setText('')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto border-x shadow-xl">
      {/* Шапка */}
      <div className="p-4 bg-white border-b flex items-center shadow-sm">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">Ч</div>
        <h1 className="text-xl font-bold">Наш секретный чат</h1>
      </div>

      {/* Список сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%] border border-gray-200">
              <p className="text-gray-800">{msg.text}</p>
              <span className="text-[10px] text-gray-400 block mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать сообщение..."
          className="flex-1 p-3 bg-gray-100 rounded-full border-none focus:ring-2 focus:ring-blue-400 outline-none transition-all"
        />
        <button className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-colors shadow-md">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}