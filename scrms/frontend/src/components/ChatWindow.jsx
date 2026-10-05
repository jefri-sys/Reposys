import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContextObject';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import MediaUpload from './MediaUpload';
import SplitCardInChat from './SplitCardInChat';
import { ArrowLeft, Check, CheckCheck, FileText, Send, Paperclip, Plus, ArrowDown, Mic, IndianRupee, Play, Pause, Download, Trash2, Ban, User } from 'lucide-react';

const VoiceMessagePlayer = ({ audioUrl, duration }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);

  // Secure URL to prevent mixed-content blocking
  const secureAudioUrl = audioUrl ? audioUrl.replace(/^http:/, 'https:') : '';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [secureAudioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error("Playback failed:", err));
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = parseFloat(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatAudioTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 py-2 px-1 w-[220px] md:w-[260px] select-none text-current">
      <audio ref={audioRef} src={secureAudioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button 
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 text-current flex items-center justify-center transition-colors shrink-0 backdrop-blur-sm"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Progress Slider and Timer */}
      <div className="flex-grow min-w-0 flex flex-col gap-1.5">
        <input 
          type="range"
          min="0"
          max={audioDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-current outline-none"
        />
        <div className="flex justify-between items-center text-[10px] font-bold opacity-80">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};

const ChatWindow = ({ friendId, friendName, friendRole, onClose }) => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFriend, setIsFriend] = useState(true);

  useEffect(() => {
    let isActive = true;
    const checkFriendship = async () => {
      try {
        const res = await api.get('/friends');
        if (isActive) {
          const friendsList = res.data || [];
          const isStillFriend = friendsList.some(f => f._id?.toString() === friendId?.toString());
          setIsFriend(isStillFriend);
        }
      } catch (err) {
        console.error('Error checking friendship status:', err);
      }
    };
    checkFriendship();
    return () => {
      isActive = false;
    };
  }, [friendId]);
  
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitModalStep, setSplitModalStep] = useState('select_order');
  const [activeGroupOrders, setActiveGroupOrders] = useState([]);
  const [selectedGroupOrder, setSelectedGroupOrder] = useState(null);
  const [splitModalLoading, setSplitModalLoading] = useState(false);
  const [splitModalError, setSplitModalError] = useState(null);
  const [chatSuccessMessage, setChatSuccessMessage] = useState('');
  const [splitSource, setSplitSource] = useState('order');
  const [customAmount, setCustomAmount] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedSplitMembers, setSelectedSplitMembers] = useState([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const recordingTimerRef = useRef(null);
  const currentRecordingTimeRef = useRef(0);

  const scrollContainerRef = useRef(null);
  const mediaUploadContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E'];
  const getAvatarColor = (name) => {
    if (!name) return '#FF6B6B';
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadMessages = async () => {
      try {
        const res = await api.get(`/messages/${friendId}`);
        if (isActive) {
          setMessages(res.data);
          setLoading(false);
          // Scroll immediately without animation on load
          setTimeout(() => scrollToBottom('auto'), 50);
          // Call markRead after messages are fetched
          await api.put(`/messages/${friendId}/read`).catch(console.error);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
        if (isActive) setLoading(false);
      }
    };

    loadMessages();

    window.addEventListener('app_resumed', loadMessages);

    return () => {
      isActive = false;
      window.removeEventListener('app_resumed', loadMessages);
    };
  }, [friendId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const msgSenderIdStr = message.senderId?._id?.toString() || message.senderId?.toString();
      const msgRecipientIdStr = message.recipientId?._id?.toString() || message.recipientId?.toString();
      const friendIdStr = friendId?.toString();

      if (msgSenderIdStr === friendIdStr || msgRecipientIdStr === friendIdStr) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          const optIndex = prev.findIndex(m => m.isOptimistic && m.type === message.type);
          if (optIndex !== -1) {
            const next = [...prev];
            next[optIndex] = message;
            return next;
          }
          return [...prev, message];
        });
        
        // Determine scroll behavior
        const isFromCurrentUser = msgSenderIdStr === user._id?.toString();
        if (isFromCurrentUser) {
          setTimeout(() => scrollToBottom('smooth'), 50);
        } else {
          const container = scrollContainerRef.current;
          if (container) {
            const scrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 120;
            if (scrolledUp) {
              setUnreadCountBelow(prev => prev + 1);
            } else {
              setTimeout(() => scrollToBottom('smooth'), 50);
            }
          } else {
            setTimeout(() => scrollToBottom('smooth'), 50);
          }
        }
        
        if (msgSenderIdStr === friendIdStr) {
          api.put(`/messages/${friendId}/read`).catch(console.error);
        }
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m));
    };

    const handleUserTyping = (payload) => {
      if (payload.senderId === friendId) setIsTyping(true);
    };

    const handleUserStopTyping = (payload) => {
      if (payload.senderId === friendId) setIsTyping(false);
    };

    const handleMessagesRead = (payload) => {
      const readByStr = payload.readBy?.toString();
      const currentUserIdStr = user._id?.toString();
      
      if (readByStr && readByStr !== currentUserIdStr) {
        setMessages(prev => prev.map(msg => {
          const msgSenderIdStr = msg.senderId?._id?.toString() || msg.senderId?.toString();
          if (msgSenderIdStr === currentUserIdStr && !msg.read) {
            return { ...msg, read: true };
          }
          return msg;
        }));
      }
    };

    const handleFriendRemoved = (payload) => {
      if (payload && payload.friendId?.toString() === friendId?.toString()) {
        setIsFriend(false);
      }
    };

    const handleSplitCardUpdate = (payload) => {
      const updatedData = payload.splitCardData || payload;
      const groupOrderIdStr = updatedData.groupOrderId?.toString() || updatedData._id?.toString();

      setMessages(prev => prev.map(m => {
        const msgGroupOrderId = m.splitCardData?.groupOrderId?.toString() || m.splitCardData?._id?.toString();
        if (msgGroupOrderId && msgGroupOrderId === groupOrderIdStr) {
          return {
            ...m,
            splitCardData: updatedData
          };
        }
        return m;
      }));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);
    socket.on('messagesRead', handleMessagesRead);
    socket.on('friendRemoved', handleFriendRemoved);
    socket.on('splitCardUpdate', handleSplitCardUpdate);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
      socket.off('messagesRead', handleMessagesRead);
      socket.off('friendRemoved', handleFriendRemoved);
      socket.off('splitCardUpdate', handleSplitCardUpdate);
    };
  }, [socket, friendId, user._id]);

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m));
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError('Could not delete message');
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (socket) {
      socket.emit('typing', { recipientId: friendId, senderId: user._id });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { recipientId: friendId, senderId: user._id });
      }, 1000);
    }
  };

  // Voice message record timers and handlers
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (chunks.length === 0) return;

        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const duration = currentRecordingTimeRef.current || 1;
        sendVoiceMessage(audioBlob, duration);
        setRecordingTime(0);
        currentRecordingTimeRef.current = 0;
      };

      setAudioChunks(chunks);
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      currentRecordingTimeRef.current = 0;

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          currentRecordingTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      setError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const sendVoiceMessage = async (audioBlob, duration) => {
    setError('');
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: { _id: user._id, name: user.name },
      recipientId: { _id: friendId },
      type: 'voice',
      audioUrl: URL.createObjectURL(audioBlob),
      audioDuration: duration,
      timestamp: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('audioDuration', duration);

      const res = await api.post(`/messages/send-voice/${friendId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));
    } catch (err) {
      setError('Failed to send voice message');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    setError('');
    const content = inputText.trim();
    const currentAttachment = attachment;

    setInputText('');
    setAttachment(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: { _id: user._id, name: user.name },
      recipientId: { _id: friendId },
      type: 'text',
      content,
      mediaUrl: currentAttachment?.url || null,
      mediaType: currentAttachment?.mediaType || 'none',
      timestamp: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const payload = {
        recipientId: friendId,
        content,
        mediaUrl: currentAttachment?.url || null,
        mediaType: currentAttachment?.mediaType || 'none'
      };

      const res = await api.post('/messages/send', payload);
      setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));
    } catch (err) {
      setInputText(content);
      setAttachment(currentAttachment);
      setError(err.response?.data?.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  const openSplitModal = async () => {
    setShowSplitModal(true);
    setSplitModalStep('select_order');
    setSplitModalLoading(true);
    setSplitModalError(null);
    setSelectedGroupOrder(null);
    setSelectedSplitMembers([user._id, friendId]);
    try {
      const res = await api.get('/group-orders/my-active');
      const friendIdStr = friendId.toString();
      const filteredOrders = (res.data || []).filter(order => 
        order.participants?.some(p => (p.userId?._id || p.userId)?.toString() === friendIdStr)
      );
      setActiveGroupOrders(filteredOrders);
    } catch (err) {
      setSplitModalError(err.response?.data?.message || 'Failed to load active group orders');
    } finally {
      setSplitModalLoading(false);
    }
  };

  const handleSendSplit = async () => {
    if (!selectedGroupOrder) return;
    setSplitModalLoading(true);
    setSplitModalError(null);
    try {
      await api.post('/group-orders/split/send', {
        groupOrderId: selectedGroupOrder._id,
        triggeredFrom: 'group_chat',
        groupChatId: null
      });
      
      const pendingCount = selectedGroupOrder.participants.filter(
        p => p.walletStatus === 'pending' || p.walletStatus === 'declined'
      ).length;
      
      setShowSplitModal(false);
      setSplitModalStep('select_order');
      setActiveGroupOrders([]);
      setSelectedGroupOrder(null);
      setSplitModalError(null);
      
      setChatSuccessMessage(`Split requests sent to ${pendingCount} participants`);
      setTimeout(() => setChatSuccessMessage(''), 5000);
    } catch (err) {
      setSplitModalError(err.response?.data?.message || 'Failed to send split requests');
    } finally {
      setSplitModalLoading(false);
    }
  };

  const handleSendCustomSplit = async (e) => {
    e.preventDefault();
    if (!customAmount || isNaN(customAmount) || Number(customAmount) <= 0) {
      setSplitModalError('Please enter a valid amount');
      return;
    }
    
    if (selectedSplitMembers.length === 0) {
      setSplitModalError('Please select at least one participant to split with');
      return;
    }

    const isFriendChecked = selectedSplitMembers.includes(friendId);

    if (!isFriendChecked) {
      setSplitModalError('Please select your friend to request splits from');
      return;
    }

    setSplitModalLoading(true);
    setSplitModalError(null);

    const splitAmount = (Number(customAmount) / 2).toFixed(2);

    const splitParticipants = [
      { userId: friendId, amount: Number(splitAmount) },
      { userId: user._id, amount: Number(splitAmount) }
    ];

    try {
      await api.post('/group-orders/split/custom', {
        totalAmount: Number(customAmount),
        description: customDescription || 'Custom Split Request',
        participants: splitParticipants,
        groupChatId: null
      });
      setShowSplitModal(false);
      setSplitModalStep('select_order');
      setCustomAmount('');
      setCustomDescription('');
      setSplitModalError(null);
      
      setChatSuccessMessage('Split request sent to friend');
      setTimeout(() => setChatSuccessMessage(''), 5000);
    } catch (err) {
      setSplitModalError(err.response?.data?.message || 'Failed to send custom split request');
    } finally {
      setSplitModalLoading(false);
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isAtBottom) {
      setIsScrolledUp(false);
      setUnreadCountBelow(0);
    } else {
      setIsScrolledUp(true);
    }
  };

  const handleMediaClick = () => {
    const fileInput = mediaUploadContainerRef.current?.querySelector('input[type="file"]');
    fileInput?.click();
  };

  const getFileName = (url) => {
    if (!url) return 'Document.pdf';
    try {
      const decoded = decodeURIComponent(url);
      return decoded.split('/').pop();
    } catch {
      return 'Document.pdf';
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-gray-50 relative overflow-hidden">
      {/* 1. Header Bar */}
      <div className="bg-white/95 backdrop-blur-md text-gray-900 px-5 py-3.5 flex items-center gap-4 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10 border-b border-gray-100">
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 select-none"
          style={{ backgroundColor: getAvatarColor(friendName) }}
        >
          <User className="w-5 h-5" />
        </div>
        
        {/* Info */}
        <div className="min-w-0">
          <h3 className="font-bold text-[15px] leading-tight text-gray-900 truncate tracking-tight">{friendName}</h3>
          <p className="text-[12px] text-gray-500 font-medium truncate">{friendRole || 'Friend'}</p>
        </div>
      </div>

      {/* 2. Message Thread */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-4 min-h-0 relative bg-gray-50/50"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto w-full">
            {messages.map((msg, idx) => {
              if (msg.isSplitCard || msg.splitCardData) {
                const data = msg.splitCardData || msg.splitData;
                const creatorId = data?.createdBy?._id || data?.createdBy;
                const isCardCreator = user?._id && creatorId
                  ? user._id.toString() === creatorId.toString()
                  : false;

                return (
                  <div key={msg._id || idx} className={`flex ${isCardCreator ? 'justify-end' : 'justify-start'} my-2`}>
                    <div className="w-full max-w-sm">
                      <SplitCardInChat 
                        splitCardData={data} 
                        currentUserId={user?._id}
                        isCreator={isCardCreator}
                        groupId={null}
                      />
                    </div>
                  </div>
                );
              }

              if (msg.isSystem) {
                const showSeparator = idx === 0 || new Date(messages[idx - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
                return (
                  <div key={msg._id || idx} className="space-y-4">
                    {showSeparator && (
                      <div className="flex justify-center my-6 select-none">
                        <span className="bg-gray-100/80 text-gray-500 text-[11px] uppercase tracking-widest px-3 py-1 rounded-full font-bold">
                          {formatMessageDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center my-2 select-none">
                      <span className="bg-gray-100 border border-gray-200/60 text-gray-500 text-[11px] px-4 py-1.5 rounded-full font-medium text-center max-w-sm">
                        {msg.content}
                      </span>
                    </div>
                  </div>
                );
              }

              const isOwn = (msg.senderId?._id?.toString() || msg.senderId?.toString()) === user._id?.toString();
              const showSeparator = idx === 0 || new Date(messages[idx - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
              
              return (
                <div key={msg._id || idx} className="space-y-4">
                  {showSeparator && (
                    <div className="flex justify-center my-6 select-none">
                      <span className="bg-gray-100/80 text-gray-500 text-[11px] uppercase tracking-widest px-3 py-1 rounded-full font-bold">
                        {formatMessageDate(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 group/msg ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div 
                        className={`px-4 py-2.5 max-w-lg relative ${
                          isOwn 
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm' 
                            : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
                        }`}
                      >
                      {msg.isDeleted ? (
                        <p className={`text-[14px] italic flex items-center gap-1.5 pr-8 pb-1 whitespace-nowrap ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                          <Ban className="w-4 h-4 opacity-70" />
                          {isOwn ? 'You deleted this message' : 'This message was deleted'}
                        </p>
                      ) : (
                        <>
                          {msg.mediaType === 'image' && msg.mediaUrl && (
                            <div className="mb-1 bg-black/5 rounded-md overflow-hidden max-w-xs cursor-pointer">
                              <img 
                                src={msg.mediaUrl} 
                                alt="Attachment" 
                                className="max-h-[200px] object-cover w-full hover:opacity-90 transition-opacity" 
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            </div>
                          )}
                          
                          {msg.mediaType === 'pdf' && msg.mediaUrl && (
                            <div className="mb-1">
                              <a 
                                href={msg.mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`flex items-center gap-3 p-3 rounded-xl transition-colors border shadow-sm ${
                                  isOwn 
                                    ? 'bg-white/10 border-white/20 hover:bg-white/20' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isOwn ? 'bg-white/20' : 'bg-red-50'}`}>
                                  <FileText className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-red-500'}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`truncate text-sm font-semibold ${isOwn ? 'text-white' : 'text-gray-900'}`}>{getFileName(msg.mediaUrl)}</p>
                                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>PDF Document</span>
                                </div>
                              </a>
                            </div>
                          )}
                          
                          {msg.content && (
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words pr-8 pb-1">
                              {msg.content}
                            </p>
                          )}
                          
                          {msg.type === 'voice' && msg.audioUrl && (
                            <div className="pr-8 pb-1">
                              <VoiceMessagePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="absolute bottom-1.5 right-2.5 flex items-center gap-0.5 select-none">
                        <span className={`text-[9px] font-medium leading-none ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        {isOwn && (
                          msg.read ? (
                            <CheckCheck className="w-4 h-4 text-emerald-300 drop-shadow-sm" title="Read" />
                          ) : (
                            <Check className="w-4 h-4 text-blue-200 opacity-80" title="Sent" />
                          )
                        )}
                      </div>
                      
                      {isOwn && msg._id && !msg.isOptimistic && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg._id)}
                          className={`opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-full transition-all shrink-0 shadow-sm self-center ${isOwn ? 'bg-blue-700/50 hover:bg-blue-700 text-white' : 'bg-white hover:bg-red-50 hover:text-red-600 text-gray-400 border border-gray-100'}`}
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        
        {isTyping && (
          <div className="flex items-start mt-2">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Floating scroll to bottom button */}
      {isScrolledUp && (
        <button 
          onClick={() => {
            scrollToBottom('smooth');
            setUnreadCountBelow(0);
            setIsScrolledUp(false);
          }}
          className="absolute bottom-24 right-6 w-10 h-10 rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.1)] flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all border border-gray-100 z-10"
        >
          <ArrowDown className="w-5 h-5" />
          {unreadCountBelow > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCountBelow}
            </span>
          )}
        </button>
      )}

      {/* 3. Input Zone & Attachment Previews */}
      <div className="bg-white/80 backdrop-blur-md border-t border-gray-200/60 px-4 py-3 shrink-0 z-20 relative overflow-visible">
        {/* Click outside overlay for popups */}
        {showAddMenu && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowAddMenu(false)}
          />
        )}
        
        {/* Hidden File Picker Container */}
        <div ref={mediaUploadContainerRef} className="hidden">
          <MediaUpload onUploadComplete={(data) => setAttachment(data)} />
        </div>

        {/* Attachment preview bar */}
        {attachment && (
          <div className="bg-white border border-gray-200/60 px-4 py-2 rounded-lg flex items-center justify-between mb-2 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              {attachment.mediaType === 'image' ? (
                <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 border">
                  <img src={attachment.url} alt="Staged" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-red-50 border flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate max-w-xs">
                  {attachment.mediaType === 'image' ? 'Image Attached' : getFileName(attachment.url)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{attachment.mediaType}</p>
              </div>
            </div>
            <button 
              onClick={() => setAttachment(null)}
              className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Success toast notification */}
        {chatSuccessMessage && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg mb-2 flex justify-between items-center font-medium shadow-sm">
            <span>{chatSuccessMessage}</span>
            <button onClick={() => setChatSuccessMessage('')} className="text-green-900 font-bold">×</button>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="text-xs text-red-600 px-3 py-1 mb-2 bg-red-50 border border-red-100 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Text input form */}
        {!isFriend ? (
          <div className="p-4 bg-gray-150 text-gray-500 text-center text-sm font-semibold rounded-xl border border-gray-200 select-none">
            you have been removed you can only chat with friends.
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2 relative overflow-visible">
            <div className="relative shrink-0 z-30 overflow-visible">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                className="w-[44px] h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <Plus className={`w-6 h-6 transition-transform duration-300 ${showAddMenu ? 'rotate-45 text-red-500' : ''}`} />
              </button>

              {/* Bounce popup options list */}
              <div 
                className="absolute bottom-[52px] left-0 z-20 flex flex-col items-start gap-2 pointer-events-none"
              >
                {/* Option 2 (Split) */}
                <div 
                  className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ease-out pointer-events-auto origin-bottom-left ${
                    showAddMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-50 invisible'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddMenu(false);
                    openSplitModal();
                  }}
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:scale-105 transition-transform shrink-0">
                    <IndianRupee className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-white text-gray-900 text-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 font-semibold select-none whitespace-nowrap">Request Split</span>
                </div>

                {/* Option 1 (Media) */}
                <div 
                  className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ease-out pointer-events-auto origin-bottom-left ${
                    showAddMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-50 invisible'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddMenu(false);
                    handleMediaClick();
                  }}
                >
                  <div className="w-11 h-11 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(168,85,247,0.4)] hover:scale-105 transition-transform shrink-0">
                    <Paperclip className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-white text-gray-900 text-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 font-semibold select-none whitespace-nowrap">Upload File</span>
                </div>
              </div>
            </div>

            {/* Text Input field or Recording Timer */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-red-50 border border-red-100 rounded-full px-4 py-2.5 shadow-inner text-sm select-none h-[44px] min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="font-semibold text-red-600 truncate">Recording...</span>
                </div>
                <span className="font-mono text-red-700 font-bold shrink-0 ml-2">{formatTime(recordingTime)}</span>
              </div>
            ) : (
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Message"
                className="flex-1 rounded-full border border-gray-200/80 bg-gray-50/50 text-sm px-5 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-gray-900 shadow-inner placeholder-gray-400 transition-all font-medium h-[44px]"
              />
            )}

            {/* Send / Mic button */}
            <div className="shrink-0 mr-1 sm:mr-0">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="bg-red-500 text-white rounded-full w-[44px] h-[44px] hover:bg-red-600 transition-all shadow-md flex items-center justify-center animate-pulse"
                  title="Stop and Send"
                >
                  <Send className="w-5 h-5 text-white ml-0.5" />
                </button>
              ) : (inputText.trim() || attachment ? (
                <button 
                  type="submit" 
                  className="bg-blue-600 text-white rounded-full w-[44px] h-[44px] hover:bg-blue-700 transition-all shadow-md flex items-center justify-center"
                  title="Send"
                >
                  <Send className="w-5 h-5 text-white ml-0.5" />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={startRecording}
                  className="bg-white hover:bg-gray-50 text-gray-500 hover:text-blue-600 rounded-full w-[44px] h-[44px] shadow-sm transition-all flex items-center justify-center border border-gray-200"
                  title="Record voice message"
                >
                  <Mic className="w-5 h-5" />
                </button>
              ))}
            </div>
          </form>
        )}
      </div>


      {/* Split Modal Overlay */}
      {showSplitModal && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col h-full animate-fadeIn">
          {splitModalStep === 'select_order' ? (
            <div className="flex flex-col h-full text-gray-900">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white shrink-0 shadow-sm">
                <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">Request Split Payment</h3>
                <button onClick={() => setShowSplitModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50 flex flex-col min-h-0">
                <div className="flex p-2 bg-gray-100/80 m-4 rounded-xl shrink-0">
                  <button 
                    onClick={() => { setSplitSource('order'); setSplitModalError(null); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${splitSource === 'order' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Active Orders
                  </button>
                  <button 
                    onClick={() => { setSplitSource('custom'); setSplitModalError(null); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${splitSource === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Custom Split
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto min-h-0 px-4 pb-4">
                  {splitSource === 'custom' ? (
                    <form onSubmit={handleSendCustomSplit} className="space-y-4">
                      {splitModalError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-lg text-sm font-medium">
                          {splitModalError}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Amount (₹)</label>
                        <input 
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 500"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description / Purpose</label>
                        <input 
                          type="text"
                          placeholder="e.g. Project Printing Cost"
                          value={customDescription}
                          onChange={(e) => setCustomDescription(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                        />
                      </div>
                      
                      <div className="space-y-2 mt-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Select Participants</label>
                        <div className="border border-gray-200 rounded-xl divide-y max-h-[220px] overflow-y-auto bg-white shadow-sm">
                          {[
                            { _id: user._id, name: 'You', role: user.role },
                            { _id: friendId, name: friendName, role: friendRole || 'Friend' }
                          ].map((member) => {
                            const isMe = member._id === user._id;
                            const isChecked = selectedSplitMembers.includes(member._id);
                            const shareAmt = (customAmount && !isNaN(customAmount) && Number(customAmount) > 0 && isChecked)
                              ? (Number(customAmount) / 2).toFixed(2)
                              : '0.00';
                            
                            return (
                              <div key={member._id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition">
                                <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedSplitMembers(prev => [...prev, member._id]);
                                      } else {
                                        setSelectedSplitMembers(prev => prev.filter(id => id !== member._id));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-gray-800">
                                      {member.name}
                                    </span>
                                    <span className="text-xs text-gray-500">{member.role}</span>
                                  </div>
                                </label>
                                {customAmount && Number(customAmount) > 0 && (
                                  <span className={`text-sm font-bold ${isChecked ? 'text-gray-900 font-mono' : 'text-gray-400 font-mono'}`}>
                                    ₹{shareAmt}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          type="submit"
                          disabled={splitModalLoading}
                          className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400"
                        >
                          {splitModalLoading && (
                            <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          Send Split Request
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Active Orders */
                    <div className="space-y-4">
                      {splitModalError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-lg text-sm font-medium">
                          {splitModalError}
                        </div>
                      )}
                      
                      {activeGroupOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">No active group orders involving {friendName}.</p>
                          <p className="text-xs mt-1">Select Custom Split to create a request directly.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeGroupOrders.map((order) => {
                            const isSelected = selectedGroupOrder?._id === order._id;
                            const creatorName = order.createdBy === user._id ? 'You' : (order.createdBy?.name || 'Creator');
                            return (
                              <div 
                                key={order._id}
                                onClick={() => setSelectedGroupOrder(order)}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-bold text-sm text-gray-800">
                                      {order.orderId?.documentName || 'Document Order'}
                                    </h4>
                                    <p className="text-xs text-gray-500">Created by {creatorName}</p>
                                  </div>
                                  <span className="font-extrabold text-sm text-gray-900 font-mono">₹{order.totalAmount}</span>
                                </div>
                                <div className="text-xs text-gray-600 flex flex-wrap gap-2 mt-2">
                                  {order.participants?.map((p, idx) => (
                                    <span key={idx} className="bg-white border border-gray-200 px-2.5 py-1 rounded-md font-medium shadow-sm">
                                      {p.userId?._name || p.userId?.name || 'Participant'}: ₹{p.amount} ({p.walletStatus})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedGroupOrder && (
                        <div className="pt-4 border-t border-gray-100">
                          <button 
                            onClick={handleSendSplit}
                            disabled={splitModalLoading}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400"
                          >
                            {splitModalLoading && (
                              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            Send Split for Selected Order
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
