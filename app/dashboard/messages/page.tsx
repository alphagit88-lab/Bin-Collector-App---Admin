'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';

interface Conversation {
  id: number;
  order_id: number | null;
  type: 'order' | 'support';
  participant1_id: number;
  participant2_id: number;
  p1_name: string;
  p2_name: string;
  last_message_text: string | null;
  last_message_at_actual: string | null;
  unread_count?: number;
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get<Conversation[]>('/messages/conversations');
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchConversations();
    socket.on('new_message', refresh);
    return () => {
      socket.off('new_message', refresh);
    };
  }, [socket, fetchConversations]);

  const rows = useMemo(() => {
    return conversations.map((c) => {
      const otherName = c.participant1_id === user?.id ? c.p2_name : c.p1_name;
      return { ...c, otherName };
    });
  }, [conversations, user?.id]);

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Message Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">Customer support and order chats</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading conversations...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-gray-500">No conversations yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/dashboard/messages/${c.id}`)}
                className={`w-full text-left p-4 transition-colors ${
                  (c.unread_count || 0) > 0
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-l-4 border-emerald-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${(c.unread_count || 0) > 0 ? 'text-emerald-900' : 'text-gray-900'}`}>
                      {c.type === 'support' ? `Support: ${c.otherName}` : c.otherName}
                    </p>
                    <p className={`text-sm mt-1 ${(c.unread_count || 0) > 0 ? 'text-emerald-800 font-medium' : 'text-gray-500'}`}>
                      {c.last_message_text || 'No messages yet'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {c.last_message_at_actual
                        ? new Date(c.last_message_at_actual).toLocaleString()
                        : ''}
                    </p>
                    {c.order_id && (
                      <p className="text-xs text-emerald-700 mt-1">Order #{c.order_id}</p>
                    )}
                    {(c.unread_count || 0) > 0 && (
                      <span className="inline-flex mt-1 items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold bg-red-500 text-white">
                        {(c.unread_count || 0) > 99 ? '99+' : c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
