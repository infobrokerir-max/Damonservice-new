import React, { useState, useEffect, useRef } from 'react';
import { backend } from '../lib/backend';
import { Comment, User } from '../lib/types';
import { Button } from './ui/Button';
import { Send, User as UserIcon, ShieldCheck } from 'lucide-react';

interface ProjectChatProps {
  projectId: string;
  currentUser: User;
  onClose?: () => void;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, currentUser, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
    // Mark as read when opening
    backend.markCommentsAsRead(projectId, currentUser.role);
    
    const interval = setInterval(() => {
      loadComments();
    }, 3000); // Poll every 3s

    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const loadComments = async () => {
    const data = await backend.getProjectComments(projectId);
    setComments(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await backend.addComment(projectId, currentUser.id, newMessage);
    setNewMessage('');
    loadComments();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fa-IR', {
      hour: '2-digit', minute: '2-digit',
      month: '2-digit', day: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
        <h3 className="font-bold text-gray-700 text-sm">یادداشت‌ها و گفتگو پروژه</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {comments.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            هنوز پیامی ثبت نشده است.
            <br/>
            توضیحات پروژه را اینجا بنویسید.
          </div>
        ) : (
          comments.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            const isAdmin = msg.role === 'admin';
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 shadow-sm ${
                  isMe 
                    ? 'bg-blue-100 text-blue-900 rounded-tr-none' 
                    : isAdmin 
                      ? 'bg-purple-100 text-purple-900 rounded-tl-none border border-purple-200'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                    {isAdmin ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                    <span className="font-bold">{msg.userFullName}</span>
                    <span dir="ltr">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="پیام خود را بنویسید..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={!newMessage.trim()}>
          <Send size={16} className="rtl:rotate-180" />
        </Button>
      </form>
    </div>
  );
};
