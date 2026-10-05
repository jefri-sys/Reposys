import React, { useState, useEffect, useRef, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContextObject';
import api from '../../services/api';
import ChatWindow from '../../components/ChatWindow';
import GroupChatWindow from '../../components/GroupChatWindow';
import { Search, Plus, User, Users, Mic, FileText, Ban, IndianRupee, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MobileChatPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const openGroupId = location.state?.openGroupId;

  const [activeTab, setActiveTab] = useState('Direct');
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [chatMode, setChatMode] = useState('direct');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');

  const friendsListRef = useRef([]);
  useEffect(() => {
    friendsListRef.current = friendsList;
  }, [friendsList]);

  // Load Data
  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      try {
        const [convRes, groupRes, friendsRes] = await Promise.all([
          api.get('/messages/conversations'),
          api.get('/group-chat').catch(() => ({ data: [] })),
          api.get('/friends').catch(() => ({ data: [] }))
        ]);

        if (isActive) {
          const friends = friendsRes.data || [];
          const enriched = (convRes.data || []).map(conv => {
            let partner = conv.partner;
            if (!partner || !partner.name) {
              const partnerId = partner?._id?.toString() || partner?.toString();
              const matchedFriend = friends.find(f => f._id?.toString() === partnerId);
              if (matchedFriend) {
                partner = matchedFriend;
              } else {
                partner = { _id: partnerId, name: 'Friend' };
              }
            }
            return { ...conv, partner };
          }).filter(c => c.partner);

          setConversations(enriched);
          setGroups(groupRes.data || []);
          setFriendsList(friends);

          if (openGroupId && groupRes.data) {
            const matchedGroup = groupRes.data.find(g => g._id === openGroupId);
            if (matchedGroup) {
              setActiveChat({ type: 'group', groupId: matchedGroup._id, groupName: matchedGroup.name });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load chat data', err);
      }
    };

    loadData();

    window.addEventListener('app_resumed', loadData);
    return () => {
      isActive = false;
      window.removeEventListener('app_resumed', loadData);
    };
  }, [openGroupId]);

  // Socket setup
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('joinUserRoom', user._id);

    const handleNewMessage = (message) => {
      setConversations(prev => {
        let updated = false;
        const currentUserId = user._id?.toString();
        const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
        const recipientId = message.recipientId?._id?.toString() || message.recipientId?.toString();
        const isFromMe = senderId === currentUserId;

        const mapped = prev.map(conv => {
          const partnerId = conv.partner?._id?.toString();
          const isMatch = partnerId === senderId || partnerId === recipientId;

          if (isMatch) {
            updated = true;
            return {
              ...conv,
              mostRecentMessage: message,
              unreadCount: (activeChat && activeChat.friendId === conv.partner?._id)
                ? 0
                : (!isFromMe ? conv.unreadCount + 1 : conv.unreadCount)
            };
          }
          return conv;
        });

        if (!updated) {
          const partnerVal = isFromMe ? message.recipientId : message.senderId;
          const partnerId = partnerVal?._id?.toString() || partnerVal?.toString();
          if (partnerId) {
            let richPartner = friendsListRef.current?.find(f => f._id?.toString() === partnerId);
            if (!richPartner) {
              if (partnerVal && typeof partnerVal === 'object' && partnerVal.name) {
                richPartner = partnerVal;
              } else {
                richPartner = { _id: partnerId, name: 'Friend' };
              }
            }
            mapped.push({
              partner: richPartner,
              mostRecentMessage: message,
              unreadCount: (activeChat && activeChat.friendId === richPartner._id) ? 0 : (!isFromMe ? 1 : 0)
            });
          }
        }

        return mapped.sort((a, b) => new Date(b.mostRecentMessage.timestamp) - new Date(a.mostRecentMessage.timestamp));
      });
    };

    const handleMessagesRead = (payload) => {
      setConversations(prev => prev.map(conv => {
        if (conv.partner._id?.toString() === payload.readBy?.toString()) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      }));
    };

    const handleNewGroupMessage = (message) => {
      setGroups(prev => {
        const updated = prev.map(g => {
          if (g._id === message.groupId) {
            return { ...g, lastMessage: message };
          }
          return g;
        });
        return updated.sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
      });
    };

    const handleFriendRemoved = (payload) => {
      if (payload && payload.friendId) {
        setFriendsList(prev => prev.filter(f => f._id?.toString() !== payload.friendId.toString()));
      }
    };

    const handleMessageDeleted = ({ messageId, groupId }) => {
      if (groupId) {
        setGroups(prev => prev.map(g => {
          if (g._id === groupId && g.lastMessage && g.lastMessage._id === messageId) {
            return { ...g, lastMessage: { ...g.lastMessage, isDeleted: true } };
          }
          return g;
        }));
      } else {
        setConversations(prev => prev.map(conv => {
          if (conv.mostRecentMessage && conv.mostRecentMessage._id === messageId) {
            return { ...conv, mostRecentMessage: { ...conv.mostRecentMessage, isDeleted: true } };
          }
          return conv;
        }));
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messagesRead', handleMessagesRead);
    socket.on('newGroupMessage', handleNewGroupMessage);
    socket.on('friendRemoved', handleFriendRemoved);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messagesRead', handleMessagesRead);
      socket.off('newGroupMessage', handleNewGroupMessage);
      socket.off('friendRemoved', handleFriendRemoved);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [socket, user, activeChat]);

  useEffect(() => {
    if (!socket || !groups || groups.length === 0) return;
    groups.forEach(group => {
      socket.emit('joinGroupRoom', group._id);
    });
    return () => {
      groups.forEach(group => {
        socket.emit('leaveGroupRoom', group._id);
      });
    };
  }, [socket, groups]);

  // Actions
  const handleConversationClick = (conv) => {
    setActiveChat({ type: 'direct', friendId: conv.partner._id, friendName: conv.partner.name, friendRole: conv.partner.role });
  };

  const handleGroupClick = (group) => {
    setActiveChat({ type: 'group', groupId: group._id, groupName: group.name });
  };

  const openNewChatModal = async () => {
    setShowNewChatModal(true);
    setChatMode('direct');
    setSelectedFriends([]);
    setNewGroupName('');
    setFriendsSearchQuery('');
    try {
      const res = await api.get('/friends');
      setFriendsList(res.data);
    } catch (err) {
      console.error('Failed to load friends', err);
    }
  };

  const startDirectChat = (friend) => {
    setActiveChat({ type: 'direct', friendId: friend._id, friendName: friend.name, friendRole: friend.role });
    setShowNewChatModal(false);
  };

  const createGroupChat = async () => {
    if (!newGroupName.trim() || selectedFriends.length < 2) return;
    try {
      const res = await api.post('/group-chat', {
        name: newGroupName,
        memberIds: selectedFriends
      });
      setGroups(prev => [res.data, ...prev]);
      setActiveChat({ type: 'group', groupId: res.data._id, groupName: res.data.name });
      setShowNewChatModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    }
  };

  const colors = ['#003d9b', '#5e4db9', '#004b59', '#0c56d0', '#341d8d', '#006477'];
  const getAvatarColor = (name) => {
    if (!name) return '#003d9b';
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  // Filters
  const filteredConversations = conversations.filter(conv =>
    (conv.partner?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (conv.mostRecentMessage?.content || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    (group.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (group.lastMessage?.content || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const filteredFriendsListForSearch = searchQuery.trim() ? friendsList.filter(f => {
    const matchesSearch = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const alreadyInConversations = conversations.some(c => c.partner?._id?.toString() === f._id?.toString());
    return matchesSearch && !alreadyInConversations;
  }) : [];

  const filteredFriendsList = friendsList.filter(f =>
    (f.name || '').toLowerCase().includes((friendsSearchQuery || '').toLowerCase())
  );

  // If a chat is active, render it full screen
  if (activeChat) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#faf9ff]">
        {activeChat.type === 'direct' ? (
          <ChatWindow
            friendId={activeChat.friendId}
            friendName={activeChat.friendName}
            friendRole={activeChat.friendRole}
            onClose={() => setActiveChat(null)}
          />
        ) : (
          <GroupChatWindow
            groupId={activeChat.groupId}
            groupName={activeChat.groupName}
            onClose={() => {
              setActiveChat(null);
              api.get('/group-chat').then(res => setGroups(res.data)).catch(() => {});
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#faf9ff] text-[#051a3e] font-['Inter'] flex flex-col h-full relative">
      
      {/* Main Content */}
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full flex flex-col">
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737685]" />
            <input 
              id="chat-search"
              className="w-full h-12 pl-11 pr-4 bg-[#f1f3ff] border-none rounded-xl focus:ring-2 focus:ring-[#003d9b]/20 placeholder:text-[#c3c6d6] text-[16px] transition-all outline-none" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text" 
            />
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex p-1 bg-[#e9edff] rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('Direct')}
            className={`flex-1 py-2 text-center font-['Hanken_Grotesk'] text-[14px] font-bold rounded-lg transition-all ${activeTab === 'Direct' ? 'bg-white shadow-sm text-[#003d9b]' : 'text-[#434654] hover:text-[#003d9b]'}`}
          >
            Direct
          </button>
          <button 
            onClick={() => setActiveTab('Groups')}
            className={`flex-1 py-2 text-center font-['Hanken_Grotesk'] text-[14px] font-bold rounded-lg transition-all ${activeTab === 'Groups' ? 'bg-white shadow-sm text-[#003d9b]' : 'text-[#434654] hover:text-[#003d9b]'}`}
          >
            Groups
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex flex-col gap-2">
          {activeTab === 'Direct' ? (
            (filteredConversations.length > 0 || filteredFriendsListForSearch.length > 0) ? (
              <>
                {/* Conversations */}
                {filteredConversations.map(conv => {
                  const name = conv.partner.name;
                  const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
                  const avatarColor = getAvatarColor(name);
                  
                  return (
                    <div 
                      key={conv.partner._id}
                      onClick={() => handleConversationClick(conv)}
                      className="group flex items-center p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(9,30,66,0.03)] active:scale-[0.98] transition-all cursor-pointer border border-[#edf0ff]"
                    >
                      <div className="relative shrink-0">
                        <div 
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-[22px] font-['Hanken_Grotesk'] shadow-inner"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {firstLetter}
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00b8d9] border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-['Hanken_Grotesk'] text-[16px] font-bold text-[#051a3e] truncate pr-2">{name}</h3>
                          <span className={`text-[12px] font-['JetBrains_Mono'] shrink-0 ${conv.unreadCount > 0 ? 'text-[#003d9b] font-bold' : 'text-[#737685]'}`}>
                            {new Date(conv.mostRecentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <p className={`text-[14px] truncate pr-4 ${conv.unreadCount > 0 ? 'font-medium text-[#051a3e]' : 'text-[#434654]'}`}>
                            {conv.mostRecentMessage.isDeleted ? (
                              <span className="italic flex items-center gap-1">
                                <Ban className="w-3.5 h-3.5" />
                                Deleted message
                              </span>
                            ) : conv.mostRecentMessage.type === 'voice' ? (
                              <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Voice message</span>
                            ) : conv.mostRecentMessage.content === 'SPLIT REQUEST' || conv.mostRecentMessage.isSplitCard || conv.mostRecentMessage.splitCardData ? (
                              <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-emerald-500" /> Split Request</span>
                            ) : conv.mostRecentMessage.content ? (
                              conv.mostRecentMessage.content
                            ) : (
                              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Attachment</span>
                            )}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-[#003d9b] text-white text-[10px] font-bold rounded-full shadow-sm shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Contacts Search Result */}
                {filteredFriendsListForSearch.map(friend => {
                  const name = friend.name;
                  const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
                  const avatarColor = getAvatarColor(name);
                  
                  return (
                    <div 
                      key={friend._id}
                      onClick={() => startDirectChat(friend)}
                      className="group flex items-center p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(9,30,66,0.03)] active:scale-[0.98] transition-all cursor-pointer border border-[#edf0ff]"
                    >
                      <div 
                        className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[22px] font-['Hanken_Grotesk'] shadow-inner opacity-80"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {firstLetter}
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                         <h3 className="font-['Hanken_Grotesk'] text-[16px] font-bold text-[#051a3e] truncate">{name}</h3>
                         <p className="text-[14px] text-[#737685] truncate">{friend.role || 'Contact'}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-[#e9edff] rounded-full flex items-center justify-center mb-4">
                   <User className="w-10 h-10 text-[#b2c5ff]" />
                </div>
                <h3 className="font-['Hanken_Grotesk'] text-[20px] font-bold text-[#051a3e] mb-2">No conversations yet</h3>
                <p className="text-[14px] text-[#737685] max-w-[250px]">
                  Tap the + button to find friends and start chatting.
                </p>
              </div>
            )
          ) : (
            filteredGroups.length > 0 ? (
              filteredGroups.map(group => {
                const name = group.name;
                const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
                const avatarColor = getAvatarColor(name);
                const lastMsg = group.lastMessage;
                
                return (
                  <div 
                    key={group._id}
                    onClick={() => handleGroupClick(group)}
                    className="group flex items-center p-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(9,30,66,0.03)] active:scale-[0.98] transition-all cursor-pointer border border-[#edf0ff]"
                  >
                    <div 
                      className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[22px] font-['Hanken_Grotesk'] shadow-inner"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {firstLetter}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="font-['Hanken_Grotesk'] text-[16px] font-bold text-[#051a3e] truncate pr-2">{name}</h3>
                        {lastMsg && (
                          <span className="text-[12px] font-['JetBrains_Mono'] shrink-0 text-[#737685]">
                            {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-[#434654] truncate">
                        {lastMsg ? (
                           lastMsg.isDeleted ? (
                            <span className="italic flex items-center gap-1"><Ban className="w-3.5 h-3.5 inline" /> Deleted message</span>
                           ) : (
                            <><span className="font-semibold text-[#051a3e]">{lastMsg.senderId.name?.split(' ')[0]}:</span> {lastMsg.content || 'Attachment'}</>
                           )
                        ) : 'No messages yet'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-[#e9edff] rounded-full flex items-center justify-center mb-4">
                   <Users className="w-10 h-10 text-[#b2c5ff]" />
                </div>
                <h3 className="font-['Hanken_Grotesk'] text-[20px] font-bold text-[#051a3e] mb-2">No groups</h3>
                <p className="text-[14px] text-[#737685] max-w-[250px]">
                  Create a new group to chat with multiple friends.
                </p>
              </div>
            )
          )}
        </div>
      </main>

      {/* FAB */}
      <button 
        onClick={openNewChatModal}
        className="fixed right-5 bottom-[90px] w-14 h-14 bg-[#003d9b] text-white rounded-[20px] shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40 hover:bg-[#0052cc]"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Navigation - Removed MobileBottomNav */}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-[#051a3e]/40 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl h-[85vh] sm:h-[600px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#edf0ff] flex justify-between items-center bg-white rounded-t-3xl sm:rounded-3xl">
              <h3 className="font-['Hanken_Grotesk'] text-[20px] font-bold text-[#051a3e]">New Message</h3>
              <button onClick={() => setShowNewChatModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f3ff] text-[#434654] active:scale-95 transition-transform">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 py-4 border-b border-[#edf0ff] flex gap-3 bg-[#faf9ff]">
              <button
                onClick={() => setChatMode('direct')}
                className={`flex-1 py-2.5 text-[14px] font-['Hanken_Grotesk'] font-bold rounded-xl transition-all border ${chatMode === 'direct' ? 'bg-[#003d9b] text-white border-[#003d9b] shadow-md' : 'bg-white text-[#434654] border-[#c3c6d6] hover:bg-[#f1f3ff]'}`}
              >
                Direct Message
              </button>
              <button
                onClick={() => setChatMode('group')}
                className={`flex-1 py-2.5 text-[14px] font-['Hanken_Grotesk'] font-bold rounded-xl transition-all border ${chatMode === 'group' ? 'bg-[#003d9b] text-white border-[#003d9b] shadow-md' : 'bg-white text-[#434654] border-[#c3c6d6] hover:bg-[#f1f3ff]'}`}
              >
                New Group
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-white custom-scrollbar flex flex-col gap-4">
              {chatMode === 'group' && (
                <div>
                  <input
                    type="text"
                    placeholder="Enter Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-[#f1f3ff] border border-transparent focus:border-[#003d9b] rounded-xl px-4 py-3.5 text-[16px] focus:outline-none focus:ring-1 focus:ring-[#003d9b] transition-all font-medium text-[#051a3e]"
                  />
                  <p className="text-[12px] text-[#737685] mt-2 font-medium ml-1">Select at least 2 friends below</p>
                </div>
              )}

              <div className="bg-[#f1f3ff] rounded-xl px-4 py-1.5 flex items-center gap-3 border border-transparent focus-within:border-[#003d9b] focus-within:ring-1 focus-within:ring-[#003d9b] transition-all">
                <Search className="w-5 h-5 text-[#737685] shrink-0" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={friendsSearchQuery}
                  onChange={(e) => setFriendsSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[16px] text-[#051a3e] outline-none h-10"
                />
              </div>

              <div className="space-y-2 mt-2">
                {filteredFriendsList.map(f => (
                  <div 
                    key={f._id} 
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f1f3ff] cursor-pointer transition-colors" 
                    onClick={() => {
                      if (chatMode === 'direct') {
                        startDirectChat(f);
                      } else {
                        setSelectedFriends(prev =>
                          prev.includes(f._id)
                            ? prev.filter(id => id !== f._id)
                            : [...prev, f._id]
                        );
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[18px] font-['Hanken_Grotesk']" style={{ backgroundColor: getAvatarColor(f.name) }}>
                          {f.name?.charAt(0).toUpperCase()}
                       </div>
                       <div className="flex flex-col">
                         <p className="font-bold text-[16px] text-[#051a3e]">{f.name}</p>
                         <p className="text-[13px] text-[#737685]">{f.role || 'Friend'}</p>
                       </div>
                    </div>
                    {chatMode === 'group' && (
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${selectedFriends.includes(f._id) ? 'bg-[#003d9b] border-[#003d9b] text-white' : 'border-[#c3c6d6]'}`}>
                        {selectedFriends.includes(f._id) && <Plus className="w-4 h-4 rotate-45" />}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFriendsList.length === 0 && <p className="text-[#737685] text-center text-[14px] py-8">No friends found.</p>}
              </div>
            </div>

            {chatMode === 'group' && (
              <div className="p-6 border-t border-[#edf0ff] bg-white rounded-b-3xl">
                <button
                  onClick={createGroupChat}
                  disabled={selectedFriends.length < 2 || !newGroupName.trim()}
                  className="w-full bg-[#003d9b] text-white py-4 rounded-xl font-['Hanken_Grotesk'] text-[16px] font-bold disabled:bg-[#d8e2ff] disabled:text-[#737685] disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                >
                  Create Group Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MobileChatPage;
