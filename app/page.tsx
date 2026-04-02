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
  const [userName, setUserName] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Спрашиваем имя при входе
  useEffect(() => {
    const savedName = localStorage.getItem('chat-user-name')
    if (savedName) {
      setUserName(savedName)
    } else {
      const name = prompt("Введите ваше имя для чата:")
      if (name) {
        localStorage.setItem('chat-user-name', name)
        setUserName(name)
      }
    }
  }, [])

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !userName) return
    
    // Отправляем текст вместе с именем отправителя
    await supabase.from('messages').insert([{ text, sender_name: userName }])
    setText('')
  }

  if (!userName) return <div className="p-10 text-center">Загрузка...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto border-x shadow-xl">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-blue-600">Messenger</h1>
        <span className="text-xs text-gray-400">Вы зашли как: {userName}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_name === userName; // Проверка: моё ли это сообщение?
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                isMe 
                ? 'bg-blue-500 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
              }`}>
                {!isMe && <p className="text-[10px] font-bold mb-1 text-blue-400 uppercase">{msg.sender_name}</p>}
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите сообщение..."
          className="flex-1 p-2 bg-gray-100 rounded-full px-4 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button className="bg-blue-500 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition-all">
          →
        </button>
      </form>
    </div>
  )
}