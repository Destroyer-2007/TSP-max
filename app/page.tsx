"use client"
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Messenger() {
  const [view, setView] = useState<'auth' | 'dashboard' | 'chat'>('auth')
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

  // Вход
  const handleAuth = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('username', username).eq('password', password).single()
    if (data) { setMyUser(data); setView('dashboard') } 
    else alert("Ошибка входа. Проверьте данные.")
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

  // Сообщения и уведомления
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

  // Отправка фото
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

  // Отправка текста
  const send = async (e: any) => {
    e.preventDefault()
    if (!text.trim() || !chatId) return
    await supabase.from('messages').insert([{ text, sender_name: myUser.username, chat_id: chatId }])
    setText('')
  }

  if (view === 'auth') return (
    <div className="flex h-screen bg-slate-900 items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-white text-xl font-bold mb-4">Вход в Messenger</h1>
        <input className="w-full p-3 mb-2 rounded bg-slate-700 text-white outline-none" placeholder="Ник" onChange={e => setUsername(e.target.value)} />
        <input className="w-full p-3 mb-4 rounded bg-slate-700 text-white outline-none" type="password" placeholder="Пароль" onChange={e => setPassword(e.target.value)} />
        <button onClick={handleAuth} className="w-full bg-blue-600 text-white p-3 rounded font-bold">Войти</button>
      </div>
    </div>
  )

  if (view === 'dashboard') return (
    <div className="max-w-md mx-auto h-screen bg-white flex flex-col">
      <div className="p-4 border-b font-bold text-lg flex justify-between">
        Чаты <button onClick={() => setView('auth')} className="text-red-500 text-sm">Выйти</button>
      </div>
      <div className="p-4 flex gap-2">
        <input className="flex-1 bg-gray-100 p-2 rounded outline-none" placeholder="Ник друга" onChange={e => setTargetNick(e.target.value)} />
        <button onClick={() => { if(targetNick) { setActiveChat(targetNick); setView('chat'); Notification.requestPermission() } }} className="bg-blue-600 text-white px-4 rounded">Чат</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {recentChats.map(name => (
          <div key={name} onClick={() => { setActiveChat(name); setView('chat') }} className="p-4 mb-2 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 font-bold">
            {name}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col">
      <div className="p-4 bg-white border-b flex items-center gap-4">
        <button onClick={() => setView('dashboard')} className="text-blue-600 font-bold">Назад</button>
        <span className="font-bold">{activeChat}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m: any) => {
          const isMe = m.sender_name === myUser.username
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-2xl max-w-[80%] ${isMe ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                {m.image_url ? <img src={m.image_url} className="rounded-lg mb-1" alt="pic" /> : <p className="text-sm">{m.text}</p>}
                <p className="text-[10px] text-right opacity-70">{time}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={send} className="p-4 bg-white border-t flex gap-2">
        <label className="cursor-pointer p-2">
          📎 <input type="file" className="hidden" onChange={upload} accept="image/*" />
        </label>
        <input className="flex-1 bg-gray-100 p-2 rounded outline-none" placeholder={uploading ? "Загрузка..." : "Сообщение"} value={text} onChange={e => setText(e.target.value)} />
        <button className="bg-blue-600 text-white px-4 rounded font-bold"> {">"} </button>
      </form>
    </div>
  )
}
