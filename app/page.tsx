"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Список контактов (можешь менять имена на любые другие)
const CONTACTS = ['Dmitry', 'Ivan', 'Sasha', 'Mama', 'Admin']

export default function Messenger() {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [myId, setMyId] = useState<string | null>(null)
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Загружаем имя пользователя из памяти браузера
  useEffect(() => {
    const savedName = localStorage.getItem('chat-username')
    if (savedName) setMyId(savedName)
  }, [])

  // Уникальный ID комнаты для пары пользователей (сортировка нужна, чтобы у обоих был один ID)
  const chatId = activeChat ? [myId, activeChat].sort().join('--') : null

  // Подписка на новые сообщения в конкретном чате
  useEffect(() => {
    if (!chatId) return
    fetchMessages()

    const channel = supabase.channel(`chat-${chatId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, 
        (payload) => setMessages((prev) => [...prev, payload.new])
      ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  // Автопрокрутка вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !myId || !chatId) return
    await supabase.from('messages').insert([{ text, sender_name: myId, chat_id: chatId }])
    setText('')
  }

  // --- ЭКРАН 1: ВХОД ---
  if (!myId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-slate-100">
          <h1 className="text-3xl font-black mb-2 text-blue-600">Messenger</h1>
          <p className="text-slate-400 mb-6 text-sm">Введите ваше имя, чтобы начать</p>
          <input 
            type="text" 
            placeholder="Ваше имя..." 
            className="w-full p-4 bg-slate-100 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = e.currentTarget.value.trim()
                if (name) {
                  localStorage.setItem('chat-username', name)
                  setMyId(name)
                }
              }
            }}
          />
          <p className="text-[10px] text-slate-300 uppercase font-bold tracking-widest">Нажмите Enter для входа</p>
        </div>
      </div>
    )
  }

  // --- ЭКРАН 2: СПИСОК КОНТАКТОВ ---
  if (!activeChat) {
    return (
      <div className="flex flex-col h-screen bg-white max-w-md mx-auto border-x shadow-2xl">
        <div className="p-6 bg-white border-b flex justify-between items-end">
          <h1 className="text-3xl font-bold text-slate-900">Чаты</h1>
          <button 
            onClick={() => {localStorage.clear(); window.location.reload()}} 
            className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors"
          >
            Выйти ({myId})
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {CONTACTS.filter(c => c !== myId).map(contact => (
            <div 
              key={contact} 
              onClick={() => setActiveChat(contact)}
              className="p-4 m


x-2 my-1 rounded-2xl hover:bg-slate-50 cursor-pointer flex items-center gap-4 transition-colors"
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-100">
                {contact[0]}
              </div>
              <div className="flex-1 border-b border-slate-50 pb-2">
                <p className="font-bold text-slate-800">{contact}</p>
                <p className="text-xs text-slate-400 truncate">Нажмите, чтобы открыть переписку</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- ЭКРАН 3: ОКНО ЧАТА ---
  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl">
      <div className="p-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b flex items-center gap-4">
        <button onClick={() => {setActiveChat(null); setMessages([])}} className="text-blue-500 p-2 hover:bg-blue-50 rounded-xl transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 className="font-bold text-slate-800 leading-tight">{activeChat}</h2>
          <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">в сети</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_name === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 px-4 shadow-sm ${
                isMe 
                ? 'bg-blue-600 text-white rounded-3xl rounded-tr-none shadow-blue-100' 
                : 'bg-white text-slate-800 rounded-3xl rounded-tl-none border border-slate-100'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[9px] mt-1 text-right opacity-60`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2 items-center">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ваше сообщение..."
          className="flex-1 p-3 bg-slate-100 rounded-2xl px-5 outline-none focus:bg-slate-200 transition-all text-sm"
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 transition-transform active:scale-95">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </form>
    </div>
  )
}