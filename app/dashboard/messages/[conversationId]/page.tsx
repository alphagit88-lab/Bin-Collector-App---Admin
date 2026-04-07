'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  message_text: string | null;
  created_at: string;
}

export default function AdminMessageThreadPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = Number(params.conversationId);
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await api.get<Message[]>(`/messages/conversations/${conversationId}/messages`);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const onMessage = (payload: { conversationId: number; message: Message }) => {
      if (Number(payload.conversationId) !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    };
    socket.on('new_message', onMessage);
    return () => {
      socket.off('new_message', onMessage);
    };
  }, [socket, conversationId]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !conversationId) return;
    setSending(true);
    try {
      const response = await api.post<Message>('/messages/messages', {
        conversationId,
        messageText: content,
      });
      if (response.success && response.data) {
        setMessages((prev) => [...prev, response.data as Message]);
        setText('');
      }
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => {
    if (!messages.length) return 'Conversation';
    const firstOther = messages.find((m) => m.sender_id !== user?.id);
    return firstOther ? `Chat with ${firstOther.sender_name}` : 'Conversation';
  }, [messages, user?.id]);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link href="/dashboard/messages" className="text-sm text-emerald-700 hover:underline">
            ← Back to Inbox
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{title}</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 h-[70vh] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 ${mine ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.message_text}</p>
                    <p className={`text-[11px] mt-1 ${mine ? 'text-emerald-100' : 'text-gray-500'}`}>
                      {m.sender_name} • {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={onSend} className="border-t border-gray-200 p-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
