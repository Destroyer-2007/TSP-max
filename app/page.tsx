"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Messenger() {
  const [view, setView] = useState<'auth' | 'dashboard' | 'chat'>('auth')
  const [isRegister, setIsRegister] = useState(false) // Вернул состояние регистрации
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [myUser, setMyUser] = useState<any>(null)
  const [targetNick, setTargetNick] = useState('')
  const [recentChats, setRecentChats] = useState<string[]>([])
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Логика Входа и Регистрации
  const handleAuth = async () => {
    if (!username || !password) return alert("Заполните поля")
    
    if (isRegister) {
      const { error } = await supabase.from('profiles').insert([{ username, password }])
      if (error) return alert("Ник занят или ошибка сети")
      alert("Аккаунт создан! Теперь войдите.")
      setIsRegister(false)
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).eq('password', password).single()
      if (data) { 
        setMyUser(data)
        setView('dashboard') 
      } else {
        alert("Неверный логин или пароль")
      }
    }
  }

  // Список чатов
  useEffect(() => {
    if (view === 'dashboard' && myUser) {
      const getChats = async () => {
        const { data } = await supabase.from('messages').select('chat_id').or(`sender_name.eq.${myUser.username},chat_id.ilike.%${myUser.username}%`)
        if (data) {
          const names = data.map(m => m.chat_id.split('--').find((n: string) => n !== myUser.username))
          setRecentChats(Array.from(new Set(names)).filter(Boolean) as string[])
        }
      }
      getChats()
    }
  }, [view, myUser])

  const chatId = activeChat && myUser ? [myUser.username, activeChat].sort().join('--') : null

  // Сообщения
  useEffect(() => {
    if (!chatId) return
    supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }).then(({ data }) => {
      if (data) setMessages(data)
    })

    const sub = supabase.channel(chatId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (p) => {
      setMessages(prev => [...prev, p.new])
      if (p.new.sender_name !== myUser.username && Notification.permission === 'granted') {
        new Notification(`От ${p.new.sender_name}`, { body: p.new.text || "Фотография" })
      }
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [chatId])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const upload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !chatId) return
    setUploading(true)
    const name = `${Date.now()}_${file.name}`
    const { data } = await supabase.storage.from('chat-images').upload(name, file)
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(name)
      await supabase.from('messages').insert([{ image_url: publicUrl, sender_name: myUser.username, chat_id: chatId, text: '' }])
    }
    setUploading(false)
  }

  const send = async (e: any) => {
    e.preventDefault()
    if (!text.trim() || !chatId) return
    await supabase.from('messages').insert([{ text, sender_name: myUser.username, chat_id: chatId }])
    setText('')
  }

  // ЭКРАН АВТОРИЗАЦИИ
  if (view === 'auth') return (
    <div className="flex h-screen bg-slate-900 items-center justify-center p-4">
      <div className="bg-slate
Date.now - Domain for Sale | Buy Now on NextBrand.com | NextBrand
Date.now - Domain for Sale | Buy Now on NextBrand.com | NextBrand
www.nextbrand.com


-800 p-8 rounded-2xl w-full max-w-sm shadow-xl">
        <h1 className="text-white text-2xl font-bold mb-6 text-center">
          {isRegister ? 'Регистрация' : 'Вход'}
        </h1>
        <input className="w-full p-4 mb-3 rounded-xl bg-slate-700 text-white outline-none border border-transparent focus:border-blue-500" placeholder="Ваш ник" onChange={e => setUsername(e.target.value)} />
        <input className="w-full p-4 mb-6 rounded-xl bg-slate-700 text-white outline-none border border-transparent focus:border-blue-500" type="password" placeholder="Пароль" onChange={e => setPassword(e.target.value)} />
        <button onClick={handleAuth} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold transition-all">
          {isRegister ? 'Создать аккаунт' : 'Войти'}
        </button>
        <p onClick={() => setIsRegister(!isRegister)} className="text-slate-400 text-center mt-4 cursor-pointer text-sm hover:underline">
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </p>
      </div>
    </div>
  )

  // ЭКРАН СПИСКА ЧАТОВ
  if (view === 'dashboard') return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col shadow-2xl">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50">
        <span className="font-bold text-xl text-slate-800">TSP chat</span>
        <button onClick={() => setView('auth')} className="text-red-500 font-bold text-xs">ВЫХОД</button>
      </div>
      <div className="p-4 border-b space-y-2">
        <input className="w-full bg-gray-100 p-4 rounded-xl outline-none" placeholder="Ник друга" onChange={e => setTargetNick(e.target.value)} />
        <button onClick={() => { if(targetNick) { setActiveChat(targetNick); setView('chat'); Notification.requestPermission() } }} className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold">Написать</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Ваши диалоги</p>
        {recentChats.map(name => (
          <div key={name} onClick={() => { setActiveChat(name); setView('chat') }} className="p-4 mb-2 bg-gray-50 rounded-2xl cursor-pointer hover:bg-blue-50 flex items-center gap-3 transition-colors">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">{name[0].toUpperCase()}</div>
            <span className="font-bold text-slate-700">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ЭКРАН ЧАТА
  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col shadow-2xl">
      <div className="p-4 bg-white border-b flex items-center gap-4 sticky top-0">
        <button onClick={() => setView('dashboard')} className="text-blue-600 font-bold text-2xl">←</button>
        <span className="font-bold text-slate-800">{activeChat}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m: any) => {
          const isMe = m.sender_name === myUser.username
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 px-4 rounded-2xl max-w-[85%] shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                {m.image_url ? <img src={m.image_url} className="rounded-lg mb-1 max-w-full" alt="pic" /> : <p className="text-sm">{m.text}</p>}
                <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{time}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={send} className="p-4 bg-white border-t flex gap-2 items-center">
        <label className="cursor-pointer p-2 hover:bg-gra


y-100 rounded-full transition-colors">
          <span className="text-xl">📎</span>
          <input type="file" className="hidden" onChange={upload} accept="image/*" />
        </label>
        <input className="flex-1 bg-gray-100 p-3 rounded-xl outline-none text-sm px-4" placeholder={uploading ? "Загрузка..." : "Сообщение..."} value={text} onChange={e => setText(e.target.value)} disabled={uploading} />
        <button className="bg-blue-600 text-white w-10 h-10 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-blue-200"> {">"} </button>
      </form>
    </div>
  )
}