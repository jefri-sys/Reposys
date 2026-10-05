import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContextObject';
import api from '../services/api';
import ChatWindow from '../components/ChatWindow';
import GroupChatWindow from '../components/GroupChatWindow';
import { Users, MessageSquarePlus, Search, MessageSquare, Lock, Mic, Ban, IndianRupee } from 'lucide-react';

const ChatPage = () => {
  const { user } = React.useContext(AuthContext);
  const socket = useSocket();
  const location = useLocation();
  const openGroupId = location.state?.openGroupId;

  const [activeTab, setActiveTab] = useState('Chats');
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [chatMode, setChatMode] = useState('direct'); // 'direct' or 'group'
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');

  const friendsListRef = React.useRef([]);
  React.useEffect(() => {
    friendsListRef.current = friendsList;
  }, [friendsList]);

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
  }, []);

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

  const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E'];
  const getAvatarColor = (name) => {
    if (!name) return '#FF6B6B';
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const filteredConversations = conversations.filter(conv =>
    (conv.partner?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (conv.mostRecentMessage?.content || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    (group.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (group.lastMessage?.content || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const filteredFriendsList = friendsList.filter(f =>
    (f.name || '').toLowerCase().includes((friendsSearchQuery || '').toLowerCase())
  );

  const filteredFriendsListForSearch = searchQuery.trim() ? friendsList.filter(f => {
    const matchesSearch = (f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const alreadyInConversations = conversations.some(c => c.partner?._id?.toString() === f._id?.toString());
    return matchesSearch && !alreadyInConversations;
  }) : [];

  return (
    <div className="w-full h-[calc(100dvh-65px)] md:h-[calc(100vh-65px)] flex bg-gray-50/50 overflow-hidden relative safe-pb">
      {/* Left Column: Conversation List */}
      <div
        className={`${activeChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-[360px] md:min-w-[360px] md:max-w-[360px] flex-col bg-white h-full border-r border-gray-200 shadow-[2px_0_10px_rgba(0,0,0,0.02)] shrink-0 z-10`}
      >
        {/* Header */}
        <div className="flex flex-col bg-white shrink-0 border-b border-gray-100">
          <div className="flex justify-between items-center px-5 py-4 bg-white">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Chats</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={openNewChatModal}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-600 border border-gray-200 shadow-sm"
                title="New Chat"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Persistent Search Bar (matching WhatsApp Web) */}
          <div className="px-4 py-3 bg-white flex items-center gap-2">
            <div className="flex-grow bg-gray-100/60 rounded-xl px-3 py-2 flex items-center gap-2 w-full border border-gray-200/50 focus-within:bg-white focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-100 transition-all shadow-inner shadow-gray-100/50">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 placeholder:text-sm font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-700 text-sm font-bold px-1"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Underline Tabs */}
          <div className="flex w-full bg-white px-2 pb-2">
            <div className="flex w-full bg-gray-100/80 p-1 rounded-xl">
              <button
                onClick={() => { setActiveTab('Chats'); setSearchQuery(''); }}
                className={`flex-1 text-center py-1.5 font-semibold text-sm transition-all rounded-lg ${activeTab === 'Chats'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                  : 'bg-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Chats
              </button>
              <button
                onClick={() => { setActiveTab('Groups'); setSearchQuery(''); }}
                className={`flex-1 text-center py-1.5 font-semibold text-sm transition-all rounded-lg ${activeTab === 'Groups'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                  : 'bg-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Groups
              </button>
            </div>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
          {activeTab === 'Chats' ? (
            (filteredConversations.length > 0 || filteredFriendsListForSearch.length > 0) ? (
              <div className="flex flex-col">
                {/* Active Conversations */}
                {filteredConversations.map((conv, index) => {
                  const name = conv.partner.name;
                  const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
                  const avatarColor = getAvatarColor(name);
                  const isSelected = activeChat && activeChat.type === 'direct' && activeChat.friendId === conv.partner._id;

                  return (
                    <div key={conv.partner._id} className="px-2 py-0.5">
                      <div
                        onClick={() => handleConversationClick(conv)}
                        className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all rounded-xl ${isSelected ? 'bg-gray-100/80 shadow-sm' : 'bg-transparent hover:bg-gray-50'
                          }`}
                      >
                        {/* Circular Avatar */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 select-none shadow-sm"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {firstLetter}
                        </div>

                        {/* Two lines of content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-gray-900 text-[15px] tracking-tight truncate">{name}</span>
                            <span className="text-[11px] text-gray-400 shrink-0 font-medium tracking-wide">
                              {new Date(conv.mostRecentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-[13px] truncate pr-2 flex items-center gap-1.5 ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                              {conv.mostRecentMessage.isDeleted ? (
                                <span className="italic flex items-center gap-1">
                                  <Ban className="w-3 h-3" />
                                  {(conv.mostRecentMessage.senderId === user._id || conv.mostRecentMessage.senderId?._id === user._id)
                                    ? 'You deleted this message'
                                    : 'This message was deleted'}
                                </span>
                              ) : conv.mostRecentMessage.content === 'SPLIT REQUEST' || conv.mostRecentMessage.isSplitCard || conv.mostRecentMessage.splitCardData ? (
                                <>
                                  <IndianRupee className="w-3.5 h-3.5 text-emerald-500 shrink-0 inline" />
                                  <span>Split Request</span>
                                </>
                              ) : conv.mostRecentMessage.type === 'voice' ? (
                                <>
                                  <Mic className="w-3.5 h-3.5 text-gray-400 shrink-0 inline" />
                                  <span>Voice message</span>
                                </>
                              ) : conv.mostRecentMessage.content ? (
                                conv.mostRecentMessage.content
                              ) : (
                                'Attached a file'
                              )}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-[11px] font-bold min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {index < filteredConversations.length - 1 && (
                        <hr className="hidden" />
                      )}
                    </div>
                  );
                })}

                {/* Contacts / Friends */}
                {filteredFriendsListForSearch.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100 mt-2">
                      Contacts / Friends
                    </div>
                    {filteredFriendsListForSearch.map((friend, index) => {
                      const name = friend.name;
                      const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
                      const avatarColor = getAvatarColor(name);

                      return (
                        <div key={friend._id}>
                          <div
                            onClick={() => startDirectChat(friend)}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 bg-white"
                          >
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 select-none shadow-sm"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {firstLetter}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-slate-900 text-sm truncate block">{name}</span>
                              <span className="text-xs text-slate-500 truncate block">{friend.role || 'Friend'}</span>
                            </div>
                          </div>
                          {index < filteredFriendsListForSearch.length - 1 && (
                            <hr className="border-slate-100 ml-16" />
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
                <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  {searchQuery ? "No chats or contacts matched your search." : "No conversations yet. Find friends and start chatting."}
                </p>
              </div>
            )
          ) : (
            filteredGroups.length > 0 ? (
              <div className="flex flex-col">
                {filteredGroups.map((group, index) => {
                  const name = group.name;
                  const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
                  const avatarColor = getAvatarColor(name);
                  const isSelected = activeChat && activeChat.type === 'group' && activeChat.groupId === group._id;

                  const lastMsg = group.lastMessage;
                  const lastMsgText = lastMsg
                    ? lastMsg.isDeleted
                      ? <span className="italic flex items-center gap-1"><Ban className="w-3 h-3 inline" />{(lastMsg.senderId._id === user._id || lastMsg.senderId === user._id) ? 'You deleted this message' : 'This message was deleted'}</span>
                      : `${lastMsg.senderId.name}: ${lastMsg.content || 'Attachment'}`
                    : 'No messages yet';
                  const lastMsgTime = lastMsg
                    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div key={group._id} className="px-2 py-0.5">
                      <div
                        onClick={() => handleGroupClick(group)}
                        className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all rounded-xl ${isSelected ? 'bg-gray-100/80 shadow-sm' : 'bg-transparent hover:bg-gray-50'
                          }`}
                      >
                        {/* Circular Avatar */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 select-none shadow-sm"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {firstLetter}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-gray-900 text-[15px] tracking-tight truncate">{name}</span>
                            {lastMsgTime && (
                              <span className="text-[11px] text-gray-400 shrink-0 font-medium tracking-wide">{lastMsgTime}</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] text-gray-500 truncate pr-2">
                              {lastMsgText}
                            </span>
                          </div>
                        </div>
                      </div>
                      {index < filteredGroups.length - 1 && (
                        <hr className="hidden" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
                <Users className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  {searchQuery ? "No groups matched your search." : "No groups yet. Create a group to start chatting."}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right Column: Chat Window or Empty State */}
      <div
        className={`${activeChat ? 'flex' : 'hidden md:flex'
          } flex-grow flex-1 h-full bg-slate-50 relative`}
      >
        {activeChat ? (
          activeChat.type === 'direct' ? (
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
                api.get('/group-chat').then(res => setGroups(res.data)).catch(() => { });
              }}
            />
          )
        ) : (
          /* Desktop Empty State */
          <div
            className="flex-grow h-full flex flex-col items-center justify-center text-center p-8 border-l border-gray-200 bg-gray-50/30"
          >
            <div className="max-w-md flex flex-col items-center">
              <div className="w-24 h-24 rounded-[2rem] bg-white flex items-center justify-center mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 rotate-3 transition-transform hover:rotate-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">Reposys Friend Chat</h3>
              <p className="text-[15px] text-gray-500 mb-8 leading-relaxed font-medium">
                Select a friend or group from the list to start messaging. Send files, images, PDFs, and split payments seamlessly.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <Lock className="w-4 h-4" />
                <span>End-to-end encrypted. Your personal messages are secure.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-full border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg text-slate-900">New Chat</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none transition-colors">&times;</button>
            </div>

            <div className="p-4 border-b border-slate-100 flex gap-2 bg-slate-50">
              <button
                onClick={() => setChatMode('direct')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${chatMode === 'direct' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                Direct Message
              </button>
              <button
                onClick={() => setChatMode('group')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${chatMode === 'group' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                New Group
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 bg-white">
              {chatMode === 'group' && (
                <div className="shrink-0">
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus-visible:border-sky-500 focus-visible:ring-1 focus-visible:ring-sky-500 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1.5 mb-1">Select at least 2 friends</p>
                </div>
              )}

              {/* Friend Search Bar inside modal */}
              <div className="shrink-0 bg-white rounded-lg px-3 py-2 flex items-center gap-2 border border-slate-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search friends"
                  value={friendsSearchQuery}
                  onChange={(e) => setFriendsSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                />
                {friendsSearchQuery && (
                  <button onClick={() => setFriendsSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                    &times;
                  </button>
                )}
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto pr-1 custom-scrollbar mt-2">
                {filteredFriendsList.map(f => (
                  <div key={f._id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 cursor-pointer transition-colors" onClick={() => {
                    if (chatMode === 'direct') {
                      startDirectChat(f);
                    } else {
                      setSelectedFriends(prev =>
                        prev.includes(f._id)
                          ? prev.filter(id => id !== f._id)
                          : [...prev, f._id]
                      );
                    }
                  }}>
                    <div className="flex flex-col">
                      <p className="font-semibold text-sm text-slate-900">{f.name}</p>
                      <p className="text-xs text-slate-500">{f.role}</p>
                    </div>
                    {chatMode === 'group' && (
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedFriends.includes(f._id) ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'}`}>
                        {selectedFriends.includes(f._id) && <span>✓</span>}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFriendsList.length === 0 && <p className="text-slate-500 text-center text-sm py-8">No friends found.</p>}
              </div>
            </div>

            {chatMode === 'group' && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
                {(!newGroupName.trim() || selectedFriends.length < 2) && (
                  <p className="text-xs text-amber-600 text-center font-medium bg-amber-50 py-1.5 rounded-md">
                    {!newGroupName.trim() ? "Please enter a group name." : "Please select at least 2 friends."}
                  </p>
                )}
                <button
                  onClick={createGroupChat}
                  disabled={selectedFriends.length < 2 || !newGroupName.trim()}
                  className="w-full bg-sky-600 text-white py-2.5 rounded-lg font-bold disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Create Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
