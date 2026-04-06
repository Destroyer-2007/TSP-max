"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function MessengerApp() {
  const [view, setView] = useState<'auth' | 'dashboard' | 'chat'>('auth')
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [myUser, setMyUser] = useState<any>(null)
  
  const [targetNick, setTargetNick] = useState('')
  const [recentChats, setRecentChats] = useState<string[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. ВХОД И РЕГИСТРАЦИЯ
  const handleAuth = async () => {
    if (isRegister) {
      const { error } = await supabase.from('profiles').insert([{ username, password }])
      if (error) return alert("Ошибка: возможно, ник уже занят.")
      alert("Регистрация успешна! Войдите.")
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

  // 2. ПОИСК ПОСЛЕДНИХ КОНТАКТОВ
  useEffect(() => {
    if (view === 'dashboard' && myUser) {
      const fetchRecents = async () => {
        const { data } = await supabase.from('messages')
          .select('chat_id')
          .or(`sender_name.eq.${myUser.username},chat_id.ilike.%${myUser.username}%`)
        
        if (data) {
          const names = data.map(m => m.chat_id.split('--').find((n: string) => n !== myUser.username))
          const uniqueNames = Array.from(new Set(names)).filter(Boolean) as string[]
          setRecentChats(uniqueNames)
        }
      }
      fetchRecents()
    }
  }, [view, myUser])

  // 3. ЛОГИКА ЧАТА
  const chatId = activeChat ? [myUser.username, activeChat].sort().join('--') : null

  useEffect(() => {
    if (!chatId) return
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    fetchMsgs()

    const channel = supabase.channel(chatId).on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, 
      (payload) => setMessages((prev) => [...prev, payload.new])
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('messages').insert([{ text, sender_name: myUser.username, chat_id: chatId }])
    setText('')
  }

  // ЭКРАН 1: АВТОРИЗАЦИЯ
  if (view === 'auth') return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6">
      <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-700">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-400">{isRegister ? 'Регистрация' : 'Вход'}</h1>
        <input className="w-full p-4 bg-slate-700 rounded-2xl mb-3 outline-none" placeholder="Ваш ник" onChange={e => setUsername(e.target.value)} />
        <input className="w-full p-4 bg-slate-700 rounded-2xl mb-6 outline-none" type="password" placeholder="Пароль" onChange={e => setPassword(e.target.value)} />
        <button onClick={handleAuth} className="w-full bg-blue-600 p-4 rounded-2xl font-bold hover:bg-blue-500 transition-all">
          {isRegister ? 'Создать аккаунт' : 'Войти'}
        </button>
        <p onClick={() => setIsRegister(!isRegister)} className="mt-4 text-center text-sm text-slate-400 cursor-pointer hover:text-white">
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
        </p>
      </div>
    </div>
  )

  // ЭКРАН 2: ГЛАВНОЕ МЕНЮ
  if (view === 'dashboard') return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto shadow-2xl border-x">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50">
        <h1 className="text-xl font-bold text-slate-800">Чаты</h1>
        <button onClick={() => setView('auth')} className="text-red-400 text-xs font-bold uppercase">Выйти</button>
      </div>
      <div className="p-4 bg-white border-b">
        <input className="w-full p-4 bg-slate-100 rounded-2xl mb-3 outline-none border focus:border-blue-400 transition-all" placeholder="Кому напишем? (Ник)" value={targetNick} onChange={e => setTargetNick(e.target.value)} />
        <button onClick={() => { if(targetNick) { setActiveChat(targetNick); setView('chat') } }} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold">Найти и начать чат</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Недавние диалоги</h3>
        {recentChats.length === 0 && <p className="text-slate-300 text-sm italic">Здесь будут ваши чаты</p>}
        {recentChats.map(name => (
          <div key={name} onClick={() => { setActiveChat(name); setView('chat') }} className="p-4 mb-2 bg-slate-50 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-all">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg">{name[0]}</div>
            <span className="font-bold text-slate-700">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ЭКРАН 3: ОКНО ЧАТА
  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto border-x shadow-2xl">
      <div className="p-4 bg-white/80 backdrop-blur-md border-b flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => setView('dashboard')} className="text-blue-500 p-2 hover:bg-blue-50 rounded-xl">←</button>
        <span className="font-bold text-slate-800">{activeChat}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m: any) => {
          const isMe = m.sender_name === myUser.username
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 px-4 rounded-2xl max-w-[80%] shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                <p className="text-sm">{m.text}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={send} className="p-4 bg-white border-t flex gap-2">
        <input className="flex-1 bg-slate-100 p-3 rounded-xl outline-none px-4 text-sm" placeholder="Ваше сообщение..." value={text} onChange={e => setText(e.target.value)} />
        <button className="bg-blue-600 text-white px-5 rounded-xl font-bold shadow-lg shadow-blue-200"> {">"} </button>
      </form>
    </div>
  )
}