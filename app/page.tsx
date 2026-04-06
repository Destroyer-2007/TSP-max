"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Messenger() {
  const [view, setView] = useState<'auth' | 'dashboard' | 'chat'>('auth')
  const [isRegister, setIsRegister] = useState(false)
  
  // Данные пользователя
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [myUser, setMyUser] = useState<any>(null)
  
  // Данные чата
  const [targetNick, setTargetNick] = useState('')
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. ЛОГИКА АВТОРИЗАЦИИ
  const handleAuth = async () => {
    if (isRegister) {
      const { error } = await supabase.from('profiles').insert([{ username, password }])
      if (error) return alert("Этот ник уже занят!")
      alert("Регистрация успешна! Теперь войдите.")
      setIsRegister(false)
    } else {
      const { data, error } = await supabase.from('profiles')
        .select('*').eq('username', username).eq('password', password).single()
      if (data) {
        setMyUser(data)
        setView('dashboard')
      } else {
        alert("Неверный логин или пароль")
      }
    }
  }

  // 2. ЛОГИКА ЧАТА
  const chatId = activeChat ? [myUser.username, activeChat].sort().join('--') : null

  useEffect(() => {
    if (!chatId) return
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    fetchMessages()

    const channel = supabase.channel(chatId).on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, 
      (payload) => setMessages((prev) => [...prev, payload.new])
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('messages').insert([{ text, sender_name: myUser.username, chat_id: chatId }])
    setText('')
  }

  // --- ИНТЕРФЕЙС ---

  // ЭКРАН 1: ВХОД / РЕГИСТРАЦИЯ
  if (view === 'auth') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 p-6 text-white">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700">
          <h1 className="text-3xl font-black mb-6 text-center text-blue-400">
            {isRegister ? 'Создать аккаунт' : 'С возвращением'}
          </h1>
          <input 
            className="w-full p-4 bg-slate-700 rounded-2xl mb-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Никнейм" 
            onChange={e => setUsername(e.target.value)}
          />
          <input 
            type="password"
            className="w-full p-4 bg-slate-700 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Пароль" 
            onChange={e => setPassword(e.target.value)}
          />
          <button onClick={handleAuth} className="w-full bg-blue-600 p-4 rounded-2xl font-bold hover:bg-blue-500 transition-all">
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
          <p onClick={() => setIsRegister(!isRegister)} className="mt-4 text-center text-sm text-slate-400 cursor-pointer hover:text-white">
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
          </p>
        </div>
      </div>
    )
  }

  // ЭКРАН 2: ГЛАВНОЕ ОКНО (ПОИСК ЧАТА)
  if (view === 'dashboard') {
    return (
      <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto sh


adow-2xl border-x">
        <div className="p-6 bg-white border-b flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Мессенджер</h1>
          <button onClick={() => setView('auth')} className="text-red-400 text-xs font-bold">Выйти</button>
        </div>
        <div className="p-10 flex flex-col items-center justify-center flex-1">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 text-3xl mb-4 font-bold uppercase">
            {myUser.username[0]}
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-8 text-center tracking-tight">Привет, {myUser.username}!</h2>
          
          <div className="w-full space-y-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">Начать новый чат</p>
            <input 
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Введите ник друга..." 
              value={targetNick}
              onChange={e => setTargetNick(e.target.value)}
            />
            <button 
              onClick={() => { if(targetNick) { setActiveChat(targetNick); setView('chat') } }}
              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold hover:bg-slate-800 transition-all"
            >
              Открыть переписку
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ЭКРАН 3: ОКНО ЧАТА
  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto border-x shadow-2xl">
      <div className="p-4 border-b flex items-center gap-4 bg-white sticky top-0 z-10">
        <button onClick={() => setView('dashboard')} className="text-blue-500 font-bold">←</button>
        <div>
          <p className="font-black text-slate-800 leading-none">{activeChat}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Чат активен</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg: any) => {
          const isMe = msg.sender_name === myUser.username
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 px-4 rounded-2xl max-w-[80%] shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input 
          className="flex-1 bg-slate-100 p-3 rounded-xl outline-none px-4"
          placeholder="Написать..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
        />
        <button className="bg-blue-600 text-white w-12 h-12 rounded-xl font-bold shadow-lg shadow-blue-100"»</button>
      </form>
    </div>
  )
}