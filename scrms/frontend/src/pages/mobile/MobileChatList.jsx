import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check, CheckCheck } from 'lucide-react';

const MobileChatList = ({ 
  conversations = [], 
  groups = [], 
  activeTab: propActiveTab, 
  onConversationClick, 
  onGroupClick, 
  onNewChat 
}) => {
  const [activeTab, setActiveTab] = useState(propActiveTab || 'Direct');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getHashColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const currentList = activeTab === 'Direct' ? conversations : groups;
  
  const filteredList = currentList.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full bg-white pb-[90px] flex flex-col relative overflow-hidden">
      {/* 3. SEARCH BAR */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 60, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-100 bg-white"
          >
            <div className="p-3 flex items-center">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search chats..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-full bg-slate-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0047AB]/20"
                />
              </div>
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="ml-3 p-2 text-[#0047AB] font-bold text-[14px]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TAB SWITCHER & HEADER */}
      <div className="sticky top-0 z-30 bg-white pt-3 pb-2 px-4 flex justify-between items-center shadow-sm">
        <div className="flex bg-slate-100 rounded-full p-1 h-9">
          <button 
            onClick={() => handleTabChange('Direct')}
            className={`px-5 rounded-full text-[13px] font-bold transition-all ${
              activeTab === 'Direct' ? 'bg-[#0047AB] text-white shadow-sm' : 'bg-transparent text-[#64748B]'
            }`}
          >
            Direct
          </button>
          <button 
            onClick={() => handleTabChange('Groups')}
            className={`px-5 rounded-full text-[13px] font-bold transition-all ${
              activeTab === 'Groups' ? 'bg-[#0047AB] text-white shadow-sm' : 'bg-transparent text-[#64748B]'
            }`}
          >
            Groups
          </button>
        </div>
        
        {!isSearchOpen && (
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-50 text-[#0F172A]"
          >
            <Search size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* 2. CONVERSATION LIST */}
      <div className="flex-1 overflow-y-auto">
        {filteredList.length > 0 ? (
          filteredList.map((chat, index) => {
            const isRead = chat.read;
            const hasUnread = chat.unreadCount > 0;
            const isGroup = activeTab === 'Groups';

            return (
              <div 
                key={chat.id || index} 
                onClick={() => isGroup ? onGroupClick && onGroupClick(chat) : onConversationClick && onConversationClick(chat)}
                className="flex items-center px-4 h-[72px] active:bg-slate-50 transition-colors cursor-pointer relative"
              >
                {/* Avatar */}
                <div className={`w-[44px] h-[44px] rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[16px] ${getHashColor(chat.name || 'A')}`}>
                  {chat.avatarUrl ? (
                    <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(chat.name)
                  )}
                </div>
                
                {/* Content */}
                <div className={`flex-1 min-w-0 ml-3 h-full flex flex-col justify-center border-b border-slate-100 ${index === filteredList.length - 1 ? 'border-none' : ''}`}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[15px] font-bold text-[#0F172A] truncate pr-2">
                      {chat.name}
                    </h3>
                    <span className={`text-[11px] shrink-0 ${hasUnread ? 'text-[#0047AB] font-bold' : 'text-[#94A3B8] font-medium'}`}>
                      {chat.time || '12:00 PM'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-[13px] line-clamp-1 truncate pr-2 ${hasUnread ? 'text-[#0F172A] font-semibold' : 'text-[#94A3B8]'}`}>
                      {chat.lastMessage}
                    </p>
                    <div className="shrink-0 pl-2">
                      {hasUnread ? (
                        <div className="w-[18px] h-[18px] bg-[#0047AB] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          {chat.unreadCount}
                        </div>
                      ) : chat.isSentByMe ? (
                        isRead ? (
                          <CheckCheck size={16} className="text-[#0047AB]" />
                        ) : (
                          <Check size={16} className="text-[#94A3B8]" />
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center pt-20 px-6 text-center text-slate-500">
            <Search size={40} className="text-slate-200 mb-4" />
            <p className="text-[14px] font-medium">No conversations found</p>
          </div>
        )}
      </div>

      {/* 4. FLOATING ACTION BUTTON */}
      <button 
        onClick={onNewChat}
        className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 w-[52px] h-[52px] bg-[#0047AB] rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,71,171,0.4)] active:scale-95 transition-transform z-40 group"
      >
        <Plus size={26} className="text-white" strokeWidth={2.5} />
        {/* Tooltip for 'long press' simulation on active state */}
        <span className="absolute right-[60px] bg-slate-800 text-white text-[12px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-active:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          New Chat
        </span>
      </button>
    </div>
  );
};

export default MobileChatList;
