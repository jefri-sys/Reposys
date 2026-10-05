import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContextObject';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import MediaUpload from './MediaUpload';
import SplitCardInChat from './SplitCardInChat';
import { ArrowLeft, Check, CheckCheck, FileText, Send, Info, Users, IndianRupee, UserMinus, Plus, LogOut, DollarSign, Paperclip, ArrowDown, Mic, Trash2, Play, Pause, Ban } from 'lucide-react';

const VoiceMessagePlayer = ({ audioUrl, duration }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);

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
    <div className="flex items-center gap-3 py-2 w-[220px] md:w-[260px] select-none group/voice">
      <audio ref={audioRef} src={secureAudioUrl} preload="metadata" />
      
      <button 
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-black/10 backdrop-blur-sm text-current flex items-center justify-center hover:bg-black/20 transition-all shrink-0 active:scale-95"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-grow min-w-0 flex flex-col gap-1.5">
        <input 
          type="range"
          min="0"
          max={audioDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer accent-current outline-none"
        />
        <div className="flex justify-between items-center text-[10px] font-bold opacity-70">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};

const GroupChatWindow = ({ groupId, groupName, onClose }) => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  
  const [showGroupInfo, setShowGroupInfo] = useState(false);
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
  const [splitMode, setSplitMode] = useState('equal');
  const [memberCustomAmounts, setMemberCustomAmounts] = useState({});
  const [memberShares, setMemberShares] = useState({});
  const [memberPercentages, setMemberPercentages] = useState({});
  
  const [groupDetails, setGroupDetails] = useState(null);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitCards, setSplitCards] = useState({});

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const recordingTimerRef = useRef(null);
  const currentRecordingTimeRef = useRef(0);

  const scrollContainerRef = useRef(null);
  const mediaUploadContainerRef = useRef(null);

  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7', '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];
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

    const loadData = async () => {
      try {
        const [msgRes, groupRes, splitRes] = await Promise.all([
          api.get(`/group-chat/${groupId}/messages`),
          api.get('/group-chat').then(res => ({ data: res.data.find(g => g._id === groupId) })),
          api.get(`/group-orders/group-chat/${groupId}`).catch(() => ({ data: [] }))
        ]);
        
        if (isActive) {
          let combinedMessages = msgRes.data || [];
          if (splitRes.data && splitRes.data.length > 0) {
            splitRes.data.forEach(splitData => {
              combinedMessages.push({
                isSplitCard: true,
                _id: `split_${splitData._id}`,
                splitData,
                timestamp: splitData.createdAt || new Date()
              });
            });
            combinedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          }
          setMessages(combinedMessages);
          setGroupDetails(groupRes.data);
          setLoading(false);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      } catch (err) {
        console.error('Failed to load group data', err);
        if (isActive) setLoading(false);
      }
    };

    loadData();

    if (socket) {
      socket.emit('joinGroupRoom', groupId);
    }

    return () => {
      isActive = false;
      if (socket) {
        socket.emit('leaveGroupRoom', groupId);
      }
    };
  }, [groupId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewGroupMessage = (message) => {
      if (message.groupId === groupId) {
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
        
        // Scroll behavior
        const isFromCurrentUser = (message.senderId?._id?.toString() || message.senderId?.toString()) === user._id?.toString();
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
      }
    };

    const handleGroupMemberAdded = (member) => {
      setGroupDetails(prev => {
        if (!prev) return prev;
        return { ...prev, members: [...prev.members, member] };
      });
    };

    const handleGroupMemberRemoved = ({ removedUserId }) => {
      if (removedUserId === user._id) {
        alert('You were removed from this group.');
        if (onClose) onClose();
      } else {
        setGroupDetails(prev => {
          if (!prev) return prev;
          return { ...prev, members: prev.members.filter(m => m._id !== removedUserId) };
        });
      }
    };

    const handleGroupMemberLeft = ({ leftUserId }) => {
      if (leftUserId === user._id) {
        if (onClose) onClose();
      } else {
        setGroupDetails(prev => {
          if (!prev) return prev;
          return { ...prev, members: prev.members.filter(m => m._id !== leftUserId) };
        });
      }
    };

    const handleSplitCardUpdate = (payload) => {
      let splitData = payload;
      let messageId = null;
      if (payload && payload.splitCardData) {
        splitData = payload.splitCardData;
        messageId = payload.messageId;
      }
      if (!splitData) return;

      const groupOrderId = splitData.groupOrderId || splitData._id;

      setSplitCards(prev => ({
        ...prev,
        [groupOrderId]: splitData
      }));

      setMessages(prev => {
        const exists = prev.find(m => 
          (messageId && m._id === messageId) || 
          (m.isSplitCard && (m.splitData?.groupOrderId === groupOrderId || m.splitData?._id === groupOrderId)) ||
          (m.splitCardData && (m.splitCardData.groupOrderId === groupOrderId || m.splitCardData._id === groupOrderId))
        );

        if (exists) {
          return prev.map(m => {
            const isMatch = (messageId && m._id === messageId) || 
                            (m.isSplitCard && (m.splitData?.groupOrderId === groupOrderId || m.splitData?._id === groupOrderId)) ||
                            (m.splitCardData && (m.splitCardData.groupOrderId === groupOrderId || m.splitCardData._id === groupOrderId));
            if (isMatch) {
              if (m.splitCardData) {
                return { ...m, splitCardData: splitData };
              } else {
                return { ...m, splitData };
              }
            }
            return m;
          });
        } else {
          setTimeout(() => scrollToBottom('smooth'), 50);
          if (messageId) {
            return [...prev, { _id: messageId, splitCardData: splitData }];
          } else {
            return [...prev, { isSplitCard: true, _id: `split_${groupOrderId}`, splitData }];
          }
        }
      });
    };

    const handleGroupDisbanded = (payload) => {
      if (payload.groupId === groupId) {
        setGroupDetails(prev => prev ? { ...prev, isDisbanded: true } : null);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m));
    };

    socket.on('newGroupMessage', handleNewGroupMessage);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('groupMemberAdded', handleGroupMemberAdded);
    socket.on('groupMemberRemoved', handleGroupMemberRemoved);
    socket.on('groupMemberLeft', handleGroupMemberLeft);
    socket.on('splitCardUpdate', handleSplitCardUpdate);
    socket.on('groupDisbanded', handleGroupDisbanded);

    return () => {
      socket.off('newGroupMessage', handleNewGroupMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('groupMemberAdded', handleGroupMemberAdded);
      socket.off('groupMemberRemoved', handleGroupMemberRemoved);
      socket.off('groupMemberLeft', handleGroupMemberLeft);
      socket.off('splitCardUpdate', handleSplitCardUpdate);
      socket.off('groupDisbanded', handleGroupDisbanded);
    };
  }, [socket, groupId, user._id, onClose]);

  const fetchFriends = async () => {
    try {
      const res = await api.get('/friends');
      setFriends(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEligibleOrders = async () => {
    try {
      const res = await api.get('/group-orders');
      setEligibleOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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
      groupId: groupId,
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
        content,
        mediaUrl: currentAttachment?.url || null,
        mediaType: currentAttachment?.mediaType || 'none'
      };

      const res = await api.post(`/group-chat/${groupId}/messages`, payload);
      setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));
    } catch (err) {
      setInputText(content);
      setAttachment(currentAttachment);
      setError(err.response?.data?.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m._id !== tempId));
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await api.post(`/group-chat/${groupId}/add-member`, { userId });
      setSearchQuery('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/group-chat/${groupId}/remove-member`, { data: { userId } });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.post(`/group-chat/${groupId}/leave`);
      if (onClose) onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleSplitPayClick = (splitPayload) => {
    navigate('/wallet/split-pay', { state: splitPayload });
  };

  const openSplitModal = async () => {
    setShowSplitModal(true);
    setSplitModalStep('select_order');
    setSplitModalLoading(true);
    setSplitModalError(null);
    setSelectedGroupOrder(null);
    if (groupDetails?.members) {
      setSelectedSplitMembers(groupDetails.members.map(m => m._id));
    }
    try {
      const res = await api.get('/group-orders/my-active');
      setActiveGroupOrders(res.data || []);
    } catch (err) {
      setSplitModalError(err.response?.data?.message || 'Failed to load active group orders');
    } finally {
      setSplitModalLoading(false);
    }
  };

  const refreshActiveSplits = async () => {
    try {
      const splitRes = await api.get(`/group-orders/group-chat/${groupId}`).catch(() => ({ data: [] }));
      const activeSplits = splitRes.data || [];
      
      setMessages(prev => {
        const textMessages = prev.filter(m => !m.isSplitCard);
        const combined = [...textMessages];
        activeSplits.forEach(splitData => {
          combined.push({
            isSplitCard: true,
            _id: `split_${splitData._id}`,
            splitData,
            timestamp: splitData.createdAt || new Date()
          });
        });
        combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return combined;
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to refresh active splits', err);
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
        groupChatId: groupId
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
      refreshActiveSplits();
    } catch (err) {
      setSplitModalError(err.response?.data?.message || 'Failed to send split requests');
    } finally {
      setSplitModalLoading(false);
    }
  };

  const getCalculatedMemberAmount = (memberId) => {
    if (!customAmount || isNaN(customAmount) || Number(customAmount) <= 0) return '0.00';
    const total = Number(customAmount);
    const isChecked = selectedSplitMembers.includes(memberId);
    
    if (splitMode === 'equal') {
      const otherSelectedCount = groupDetails?.members?.filter(
        m => m._id !== user._id && selectedSplitMembers.includes(m._id)
      ).length || 0;
      const isCreator = memberId === user._id;
      if (!isChecked && !isCreator) return '0.00';
      const divisionCount = otherSelectedCount + 1;
      return (total / divisionCount).toFixed(2);
    }

    if (!isChecked) return '0.00';
    
    if (splitMode === 'custom') {
      const val = memberCustomAmounts[memberId];
      return val ? Number(val).toFixed(2) : '0.00';
    }
    
    if (splitMode === 'shares') {
      const shareVal = Number(memberShares[memberId]) || 1;
      const totalShares = selectedSplitMembers.reduce((sum, id) => sum + (Number(memberShares[id]) || 1), 0);
      if (totalShares <= 0) return '0.00';
      return ((shareVal / totalShares) * total).toFixed(2);
    }
    
    if (splitMode === 'percentage') {
      const pctVal = Number(memberPercentages[memberId]) || 0;
      return ((pctVal / 100) * total).toFixed(2);
    }
    
    return '0.00';
  };

  const getPercentageSum = () => {
    return selectedSplitMembers.reduce((sum, id) => sum + (Number(memberPercentages[id]) || 0), 0);
  };

  const getCustomAmountSum = () => {
    return selectedSplitMembers.reduce((sum, id) => sum + (Number(memberCustomAmounts[id]) || 0), 0);
  };

  const handleSendCustomSplit = async (e) => {
    if (e) e.preventDefault();
    if (!customAmount || isNaN(customAmount) || Number(customAmount) <= 0) {
      setSplitModalError('Please enter a valid amount');
      return;
    }
    
    if (selectedSplitMembers.length === 0) {
      setSplitModalError('Please select at least one participant to split with');
      return;
    }

    const otherSelectedMembers = groupDetails?.members?.filter(
      m => m._id !== user._id && selectedSplitMembers.includes(m._id)
    ) || [];

    if (otherSelectedMembers.length === 0) {
      setSplitModalError('Please select at least one other participant to request splits from');
      return;
    }
    
    // Validate split mode totals
    if (splitMode === 'percentage') {
      const totalPct = getPercentageSum();
      if (totalPct !== 100) {
        setSplitModalError(`Total percentage must equal 100%. Current sum: ${totalPct}%`);
        return;
      }
    } else if (splitMode === 'custom') {
      const totalAmt = getCustomAmountSum();
      const enteredAmt = Number(customAmount);
      const isUserChecked = selectedSplitMembers.includes(user._id);
      if (Math.abs(totalAmt - enteredAmt) > 0.05) {
        setSplitModalError(`Sum of individual amounts (₹${totalAmt.toFixed(2)}) must equal the total amount (₹${enteredAmt.toFixed(2)}).`);
        return;
      }
    }
    
    setSplitModalLoading(true);
    setSplitModalError(null);
    
    try {
      const participants = otherSelectedMembers.map(m => ({
        userId: m._id,
        amount: Number(getCalculatedMemberAmount(m._id))
      }));

      const isCreatorChecked = selectedSplitMembers.includes(user._id);
      if (splitMode === 'equal' || isCreatorChecked) {
        participants.push({
          userId: user._id,
          amount: Number(getCalculatedMemberAmount(user._id))
        });
      }
      
      await api.post('/group-orders/custom-split', {
        totalAmount: Number(customAmount),
        description: customDescription || 'Custom Split Request',
        participants,
        groupChatId: groupId
      });
      
      setShowSplitModal(false);
      setSplitModalStep('select_order');
      setCustomAmount('');
      setCustomDescription('');
      setSplitMode('equal');
      setMemberCustomAmounts({});
      setMemberShares({});
      setMemberPercentages({});
      
      setChatSuccessMessage(`Custom split requests sent to ${otherSelectedMembers.length} participants`);
      setTimeout(() => setChatSuccessMessage(''), 5000);
      refreshActiveSplits();
    } catch (err) {
      setSplitModalError(err.response?.data?.message || 'Failed to send custom split requests');
    } finally {
      setSplitModalLoading(false);
    }
  };

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
      groupId: groupId,
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

      const res = await api.post(`/group-chat/${groupId}/send-voice`, formData, {
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

  const handleDisbandGroup = async () => {
    if (!confirm('Are you sure you want to disband this group? Other participants will still see the chat history, but no new messages can be sent.')) return;
    try {
      await api.post(`/group-chat/${groupId}/disband`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disband group');
    }
  };

  const handleDeleteGroupChat = async () => {
    if (!confirm('Are you sure you want to delete this group and all its chats for yourself? This action cannot be undone.')) return;
    try {
      await api.post(`/group-chat/${groupId}/delete-chat`);
      if (onClose) onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group chat');
    }
  };

  const isCreator = groupDetails && user && (
    (groupDetails.createdBy?._id || groupDetails.createdBy)?.toString() === user._id?.toString()
  );

  const getFilteredFriends = () => {
    if (!groupDetails) return [];
    const memberIds = groupDetails.members.map(m => m._id);
    return friends.filter(f => 
      !memberIds.includes(f._id) && 
      (f.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    );
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
    <div className="flex w-full h-full relative overflow-hidden bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* 1. Header Bar */}
        <div 
          onClick={() => {
            setShowGroupInfo(!showGroupInfo);
            if (isCreator) fetchFriends();
          }}
          className="bg-white/95 backdrop-blur-md text-gray-900 px-5 py-3.5 flex items-center justify-between shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors select-none"
        >
          <div className="flex items-center gap-4 min-w-0">
            {onClose && (
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            {/* Avatar */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 select-none"
              style={{ backgroundColor: getAvatarColor(groupName) }}
            >
              {groupName ? groupName.charAt(0).toUpperCase() : '?'}
            </div>
            
            {/* Info */}
            <div className="min-w-0">
              <h3 className="font-bold text-[15px] leading-tight text-gray-900 truncate tracking-tight">{groupName}</h3>
              <p className="text-[12px] text-gray-500 font-medium truncate">{groupDetails?.members?.length || 0} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowGroupInfo(!showGroupInfo);
                if (isCreator) fetchFriends();
              }}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
              title="Group Info"
            >
              <Info className="w-5 h-5" />
            </button>
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
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                if (msg.isSplitCard || msg.splitCardData) {
                  const data = msg.splitCardData || msg.splitData;
                  const creatorId = data?.createdBy?._id || data?.createdBy;
                  const isCardCreator = user?._id && creatorId
                    ? user._id.toString() === creatorId.toString()
                    : false;

                  return (
                    <div key={msg._id || idx} className="flex justify-center my-2">
                      <div className="w-full max-w-sm">
                        <SplitCardInChat 
                          splitCardData={data} 
                          currentUserId={user?._id}
                          isCreator={isCardCreator}
                          groupId={groupId}
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

                const msgSenderIdStr = msg.senderId?._id?.toString() || msg.senderId?.toString();
                const isOwn = msgSenderIdStr === user?._id?.toString();
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
                        {!isOwn && !msg.isDeleted && (
                          <span 
                            className={`text-[12px] font-bold block mb-1 select-none flex items-center gap-1.5 ${isOwn ? 'text-blue-100' : 'text-gray-900'}`}
                            style={{ color: !isOwn ? getAvatarColor(msg.senderId?.name || 'Unknown') : undefined }}
                          >
                            {msg.senderId?.name || 'Unknown'}
                          </span>
                        )}

                        {msg.isDeleted ? (
                          <p className={`text-[14px] italic flex items-center gap-1.5 pr-8 pb-1 whitespace-nowrap ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                            <Ban className="w-4 h-4 opacity-70" />
                            {isOwn ? 'You deleted this message' : 'This message was deleted'}
                          </p>
                        ) : (
                          <>
                            {msg.mediaType === 'image' && msg.mediaUrl && (
                              <div className="mb-2 bg-black/5 rounded-xl overflow-hidden max-w-xs cursor-pointer ring-1 ring-black/5">
                                <img 
                                  src={msg.mediaUrl} 
                                  alt="Attachment" 
                                  className="max-h-[240px] object-cover w-full hover:scale-105 transition-transform duration-300" 
                                  onClick={() => window.open(msg.mediaUrl, '_blank')}
                                />
                              </div>
                            )}
                            
                            {msg.mediaType === 'pdf' && msg.mediaUrl && (
                              <div className="mb-2">
                                <a 
                                  href={msg.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className={`flex items-center gap-3 p-3 rounded-xl transition-all border group/pdf ${
                                    isOwn 
                                      ? 'bg-blue-700/50 border-blue-500/30 hover:bg-blue-700/70' 
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-red-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`truncate text-sm font-semibold ${isOwn ? 'text-white' : 'text-gray-900'}`}>{getFileName(msg.mediaUrl)}</p>
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>PDF Document</span>
                                  </div>
                                </a>
                              </div>
                            )}
                            
                            {msg.content && (
                              <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words pr-12 pb-2 ${isOwn ? 'text-white/95' : 'text-gray-800'}`}>
                                {msg.content}
                              </p>
                            )}
                            
                            {msg.type === 'voice' && msg.audioUrl && (
                              <div className="pr-12 pb-2">
                                <VoiceMessagePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} />
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="absolute bottom-1.5 right-3 flex items-center gap-1 select-none">
                          <span className={`text-[10px] font-semibold leading-none ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      </div>
                      {isOwn && msg._id && !msg.isOptimistic && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="opacity-0 group-hover/msg:opacity-100 p-2 bg-white hover:bg-red-50 hover:text-red-600 rounded-full transition-all text-gray-400 shrink-0 shadow-sm border border-gray-100 self-center"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
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
            className="absolute bottom-24 right-8 w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-600 hover:text-blue-600 hover:scale-105 transition-all border border-gray-100 z-10"
          >
            <ArrowDown className="w-5 h-5" />
            {unreadCountBelow > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {unreadCountBelow}
              </span>
            )}
          </button>
        )}

        {/* 3. Input Zone & Attachment Previews */}
        <div className="bg-white border-t border-gray-100 p-4 shrink-0 z-20 relative overflow-visible shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
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
            <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl flex items-center justify-between mb-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-4 min-w-0">
                {attachment.mediaType === 'image' ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm">
                    <img src={attachment.url} alt="Staged" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate max-w-xs">
                    {attachment.mediaType === 'image' ? 'Image Attached' : getFileName(attachment.url)}
                  </p>
                  <p className="text-[11px] text-gray-500 uppercase font-bold tracking-widest">{attachment.mediaType}</p>
                </div>
              </div>
              <button 
                onClick={() => setAttachment(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Success toast notification */}
          {chatSuccessMessage && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl mb-3 flex justify-between items-center font-medium shadow-sm">
              <span>{chatSuccessMessage}</span>
              <button onClick={() => setChatSuccessMessage('')} className="text-emerald-900 font-bold opacity-50 hover:opacity-100">×</button>
            </div>
          )}

          {/* Error notification */}
          {error && (
            <div className="text-sm text-red-600 px-4 py-3 mb-3 bg-red-50 border border-red-100 rounded-xl font-medium shadow-sm flex items-center gap-2">
              <Info className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Input Form or Disbanded Banner */}
          {groupDetails?.isDisbanded ? (
            <div className="p-4 bg-gray-50 text-gray-500 text-center text-sm font-semibold rounded-2xl border border-gray-200 select-none">
              This group has been disbanded. You cannot send new messages.
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-3 relative overflow-visible max-w-5xl mx-auto w-full">
              <div className="relative shrink-0 z-30 overflow-visible">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                  className={`p-3 rounded-full transition-all duration-300 ${showAddMenu ? 'bg-red-50 text-red-500 rotate-45' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  <Plus className="w-5 h-5" />
                </button>

                {/* Bounce popup options list */}
                <div 
                  className="absolute bottom-16 left-0 z-20 flex flex-col items-start gap-2 pointer-events-none"
                >
                  {/* Option 2 (Split) */}
                  <div 
                    className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ease-out pointer-events-auto ${
                      showAddMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 invisible'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenu(false);
                      openSplitModal();
                    }}
                    style={{ transitionDelay: showAddMenu ? '50ms' : '0ms' }}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all shrink-0">
                      <IndianRupee className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-md font-bold select-none whitespace-nowrap tracking-wide">Request Split</span>
                  </div>

                  {/* Option 1 (Media) */}
                  <div 
                    className={`flex items-center gap-3 cursor-pointer transition-all duration-300 ease-out pointer-events-auto ${
                      showAddMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 invisible'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenu(false);
                      handleMediaClick();
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all shrink-0">
                      <Paperclip className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-md font-bold select-none whitespace-nowrap tracking-wide">Attach File</span>
                  </div>
                </div>
              </div>

              {/* Text Input field */}
              {isRecording ? (
                <div className="flex-1 flex items-center justify-between bg-red-50 border border-red-100 rounded-full px-5 py-3 shadow-sm text-sm select-none">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    <span className="font-bold text-red-600">Recording Audio...</span>
                  </div>
                  <span className="font-mono text-red-700 font-bold tracking-wider">{formatTime(recordingTime)}</span>
                </div>
              ) : (
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 rounded-full border border-gray-200 bg-gray-50/50 text-[15px] px-6 py-3.5 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-gray-900 shadow-inner transition-all placeholder-gray-400 font-medium"
                />
              )}

              {/* Send / Mic button */}
              <div className="shrink-0">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-red-500 text-white rounded-full p-3.5 hover:bg-red-600 transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] flex items-center justify-center hover:scale-105 active:scale-95"
                    title="Stop and Send"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                ) : (inputText.trim() || attachment ? (
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white rounded-full p-3.5 hover:bg-blue-700 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)] flex items-center justify-center hover:scale-105 active:scale-95"
                    title="Send"
                  >
                    <Send className="w-5 h-5 text-white translate-x-0.5" />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={startRecording}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-3.5 transition-all flex items-center justify-center hover:scale-105 active:scale-95 hover:text-blue-600"
                    title="Record voice message"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Group Info Side Panel */}
      <div 
        className={`absolute md:relative top-0 right-0 h-full w-[320px] bg-white border-l border-gray-100 shadow-2xl md:shadow-none z-30 transition-all duration-300 ease-in-out flex flex-col shrink-0 ${
          showGroupInfo ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none md:w-0 md:border-none'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0 bg-white shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-900" />
            <h3 className="font-extrabold text-[15px] text-gray-900 tracking-tight">Group Info</h3>
          </div>
          <button 
            onClick={() => setShowGroupInfo(false)} 
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1 bg-gray-50/50">
          {/* Avatar and Group Name */}
          <div className="flex flex-col items-center text-center p-6 bg-white border-b border-gray-100">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-md mb-4 select-none ring-4 ring-white"
              style={{ backgroundColor: getAvatarColor(groupName) }}
            >
              {groupName ? groupName.charAt(0).toUpperCase() : '?'}
            </div>
            <h4 className="font-bold text-xl text-gray-900 leading-tight break-words max-w-[260px]">{groupName}</h4>
            <p className="text-sm text-gray-500 mt-1.5 font-medium">{groupDetails?.members?.length || 0} members</p>
          </div>
          
          {/* Members List */}
          <div className="p-4">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Members</h4>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {groupDetails?.members?.map(member => {
                const isMemberCreator = member._id === (groupDetails.createdBy?._id || groupDetails.createdBy);
                return (
                  <div key={member._id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none"
                        style={{ backgroundColor: getAvatarColor(member.name) }}
                      >
                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[13px] text-gray-900 flex items-center gap-1.5 truncate">
                          {member.name} 
                          {member._id === user?._id && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-medium">You</span>}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{member.role}</p>
                      </div>
                    </div>
                    {isMemberCreator ? (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-bold uppercase shrink-0">Admin</span>
                    ) : (
                      isCreator && member._id !== user?._id && (
                        <button 
                          onClick={() => handleRemoveMember(member._id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0"
                          title="Remove Member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Members section for admin */}
          {isCreator && (
            <div className="p-4 pt-0">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Add Member</h4>
                <div className="relative mb-3">
                  <input 
                    type="text"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {getFilteredFriends().map(f => (
                    <div key={f._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <span className="text-[13px] font-semibold text-gray-800 truncate max-w-[160px]">{f.name}</span>
                      <button 
                        onClick={() => handleAddMember(f._id)}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white w-8 h-8 flex items-center justify-center rounded-full transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {searchQuery && getFilteredFriends().length === 0 && (
                    <p className="text-[12px] text-gray-500 text-center py-4 font-medium">No eligible friends found.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions panel */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0 space-y-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          {isCreator && !groupDetails?.isDisbanded && (
            <button 
              onClick={handleDisbandGroup}
              className="w-full flex justify-center items-center py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-bold transition-colors text-[13px]"
            >
              Disband Group (Preserve Chat)
            </button>
          )}
          
          <button 
            onClick={handleDeleteGroupChat}
            className="w-full flex justify-center items-center py-2.5 bg-white border border-gray-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-200 font-bold transition-all shadow-sm text-[13px]"
          >
            Delete Group & Chat
          </button>
          
          <button 
            onClick={handleLeaveGroup}
            className="w-full flex justify-center items-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all shadow-sm text-[13px]"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
            Leave Group
          </button>
        </div>
      </div>

      {/* Split Modal Overlay */}
      {showSplitModal && (
        <div className="absolute inset-0 bg-white z-40 flex flex-col h-full animate-fadeIn text-gray-900">
          <style>{`
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}</style>
          {splitModalStep === 'select_order' ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white shrink-0 shadow-sm">
                <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">Request Split Payment</h3>
                <button onClick={() => setShowSplitModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 bg-gray-50/50 flex flex-col min-h-0 overflow-hidden">
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

                <div className="flex-1 flex flex-col min-h-0">
                  {splitSource === 'custom' ? (
                    <form onSubmit={handleSendCustomSplit} className="flex-1 flex flex-col min-h-0">
                      {/* Enter Amount header and inputs */}
                      <div className="flex flex-col items-center py-6 border-b border-gray-100 shrink-0 bg-white">
                        <span className="text-gray-400 text-xs tracking-widest uppercase font-bold">Enter amount to split</span>
                        <div className="flex items-center justify-center gap-1 mt-2 text-gray-900">
                          <span className="text-3xl font-bold text-gray-400">₹</span>
                          <input 
                            type="number"
                            required
                            min="1"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="bg-transparent border-none text-center text-4xl font-extrabold focus:ring-0 outline-none w-48 text-gray-900 placeholder-gray-300"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex justify-center mt-4 w-full px-6">
                          <input 
                            type="text"
                            placeholder="What's this for?"
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-sm text-center text-gray-900 rounded-full px-6 py-2.5 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white w-72 placeholder-gray-400 font-medium transition-all"
                          />
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b border-gray-100 py-2 shrink-0 px-2 justify-around bg-white">
                        <button 
                          type="button"
                          onClick={() => { setSplitMode('equal'); setSplitModalError(null); }}
                          className={`flex flex-col items-center gap-1 pb-1.5 text-xs font-bold border-b-2 transition-all ${splitMode === 'equal' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                          <Users className="w-5 h-5" />
                          <span>Equally</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setSplitMode('custom'); setSplitModalError(null); }}
                          className={`flex flex-col items-center gap-1 pb-1.5 text-xs font-bold border-b-2 transition-all ${splitMode === 'custom' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                          <span className="w-5 h-5 flex items-center justify-center font-bold text-sm">123</span>
                          <span>Uniquely</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setSplitMode('shares'); setSplitModalError(null); }}
                          className={`flex flex-col items-center gap-1 pb-1.5 text-xs font-bold border-b-2 transition-all ${splitMode === 'shares' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                          <span className="w-5 h-5 flex items-center justify-center border-2 border-current rounded-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} />
                          <span>Shares</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setSplitMode('percentage'); setSplitModalError(null); }}
                          className={`flex flex-col items-center gap-1 pb-1.5 text-xs font-bold border-b-2 transition-all ${splitMode === 'percentage' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                          <span className="w-5 h-5 flex items-center justify-center font-bold text-base">%</span>
                          <span>Percent</span>
                        </button>
                      </div>

                      {/* Member List Label */}
                      <div className="px-5 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50/80 border-b border-gray-100 shrink-0 shadow-inner">
                        {splitMode === 'equal' && 'Split evenly'}
                        {splitMode === 'custom' && 'Split custom amounts'}
                        {splitMode === 'shares' && 'Split by shares'}
                        {splitMode === 'percentage' && `Split by percentage (${getPercentageSum()}% of 100%)`}
                      </div>

                      {/* Error display */}
                      {splitModalError && (
                        <div className="m-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold shadow-sm">
                          {splitModalError}
                        </div>
                      )}

                      {/* Member List */}
                      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                        {groupDetails?.members?.map((member) => {
                          const isMe = member._id === user._id;
                          const isChecked = selectedSplitMembers.includes(member._id);
                          const calculatedAmt = getCalculatedMemberAmount(member._id);
                          
                          return (
                            <div key={member._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition border-b border-gray-50 select-none">
                              <div 
                                onClick={() => {
                                  if (isChecked) {
                                    setSelectedSplitMembers(prev => prev.filter(id => id !== member._id));
                                  } else {
                                    setSelectedSplitMembers(prev => [...prev, member._id]);
                                  }
                                }}
                                className="flex items-center gap-4 cursor-pointer flex-1 min-w-0"
                              >
                                {/* Circular checkbox */}
                                <div className="shrink-0">
                                  {isChecked ? (
                                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center shadow-sm">
                                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors" />
                                  )}
                                </div>

                                {/* Circular avatar */}
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none"
                                  style={{ backgroundColor: getAvatarColor(member.name) }}
                                >
                                  {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                </div>

                                {/* Name & You label */}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[14px] font-bold text-gray-900 flex items-center gap-2 truncate">
                                    {member.name}
                                    {isMe && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">You</span>}
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">{member.role}</span>
                                </div>
                              </div>

                              {/* Split input / display according to Mode */}
                              <div className="shrink-0 pl-4">
                                {splitMode === 'equal' && (
                                  <span className={`text-[15px] font-extrabold font-mono ${isChecked ? 'text-gray-900' : 'text-gray-300'}`}>
                                    ₹{calculatedAmt}
                                  </span>
                                )}

                                {splitMode === 'custom' && (
                                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-gray-900">
                                    <span className="text-gray-400 text-sm font-medium">₹</span>
                                    <input 
                                      type="number"
                                      value={memberCustomAmounts[member._id] ?? ''}
                                      placeholder="0.00"
                                      disabled={!isChecked}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setMemberCustomAmounts(prev => ({ ...prev, [member._id]: val }));
                                      }}
                                      className="bg-gray-50 border border-gray-200 text-right text-[15px] font-mono font-bold rounded-lg px-3 py-2 outline-none w-24 text-gray-900 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                    />
                                  </div>
                                )}

                                {splitMode === 'shares' && (
                                  <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-end gap-1.5">
                                    <div className="flex items-center gap-2 text-gray-900">
                                      <input 
                                        type="number"
                                        min="1"
                                        disabled={!isChecked}
                                        value={memberShares[member._id] ?? 1}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setMemberShares(prev => ({ ...prev, [member._id]: val }));
                                        }}
                                        className="bg-gray-50 border border-gray-200 text-center text-sm font-bold rounded-lg px-2 py-1.5 outline-none w-16 text-gray-900 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                      />
                                      <span className="text-xs text-gray-500 font-medium">shares</span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-extrabold font-mono">₹{calculatedAmt}</span>
                                  </div>
                                )}

                                {splitMode === 'percentage' && (
                                  <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-end gap-1.5">
                                    <div className="flex items-center gap-2 text-gray-900">
                                      <input 
                                        type="number"
                                        min="0"
                                        max="100"
                                        disabled={!isChecked}
                                        value={memberPercentages[member._id] ?? ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setMemberPercentages(prev => ({ ...prev, [member._id]: val }));
                                        }}
                                        className="bg-gray-50 border border-gray-200 text-center text-sm font-bold rounded-lg px-2 py-1.5 outline-none w-16 text-gray-900 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                      />
                                      <span className="text-xs text-gray-500 font-medium">%</span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-extrabold font-mono">₹{calculatedAmt}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom fixed send request button */}
                      <div className="px-5 py-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                        <button
                          type="submit"
                          disabled={splitModalLoading}
                          className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-sm shadow-md flex justify-center items-center gap-2 disabled:bg-gray-200 disabled:text-gray-400"
                        >
                          {splitModalLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                          Send Split Request
                        </button>
                      </div>
                    </form>
                  ) : (
                    splitModalLoading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
                      </div>
                    ) : splitModalError ? (
                      <div className="text-red-600 text-center py-6 text-sm font-medium">{splitModalError}</div>
                    ) : activeGroupOrders.length === 0 ? (
                      <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-bold text-base mb-2">No Active Orders</p>
                        <p className="text-gray-500 mb-8 font-medium text-sm">
                          Place a group order first to request splits from participants.
                        </p>
                        <button
                          onClick={() => setShowSplitModal(false)}
                          className="px-8 py-3 bg-white border border-gray-200 text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm shadow-sm"
                        >
                          Close
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-4 bg-gray-50/50">
                        {activeGroupOrders.map((order) => (
                          <div key={order._id} className="p-5 border border-gray-200 rounded-2xl shadow-sm bg-white hover:border-gray-300 hover:shadow-md transition-all flex flex-col gap-4 text-gray-900 group">
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-extrabold text-gray-900 text-base">{order.orderId?.documentName || 'Document'}</p>
                                <span className="font-extrabold text-base text-gray-900 font-mono bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">₹{order.orderId?.finalCost ?? order.totalAmount}</span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium">
                                Pages: {order.orderId?.pageCount ?? 0} • {order.orderId?.colorOption || 'BlackAndWhite'} • {order.orderId?.doubleSided ? 'Double' : 'Single'} sided
                              </p>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{order.participants?.length || 0} Participants</p>
                              {order.participants?.map((p) => (
                                <div key={p.userId?._id} className="flex justify-between items-center text-sm font-medium">
                                  <span className="text-gray-700">{p.userId?.name || 'Unknown'}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900 font-mono">₹{p.amount}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                      p.walletStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                      p.walletStatus === 'declined' ? 'bg-red-50 text-red-700 border border-red-100' :
                                      'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                      {p.walletStatus}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => {
                                setSelectedGroupOrder(order);
                                setSplitModalStep('confirm');
                              }}
                              className="w-full py-3 bg-white border-2 border-gray-900 text-gray-900 font-bold rounded-xl group-hover:bg-gray-900 group-hover:text-white transition-all text-sm shadow-sm"
                            >
                              Select this Order
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-white text-gray-900">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white shrink-0 shadow-sm">
                <button onClick={() => setSplitModalStep('select_order')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">Confirm Split Requests</h3>
                <div className="w-9" />
              </div>
              
              <div className="p-5 overflow-y-auto flex-1 bg-gray-50/50 space-y-6">
                {splitModalError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold shadow-sm">
                    {splitModalError}
                  </div>
                )}
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gray-900" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Group Order Summary</p>
                  <p className="text-lg font-bold text-gray-900 truncate">{selectedGroupOrder?.orderId?.documentName || 'Document'}</p>
                  <p className="text-3xl font-black text-emerald-600 mt-2 font-mono tracking-tight">₹{selectedGroupOrder?.orderId?.finalCost ?? selectedGroupOrder?.totalAmount} <span className="text-sm text-gray-400 font-medium">total</span></p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center justify-between">
                    Participant Split Details
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedGroupOrder?.participants?.length} Total</span>
                  </h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedGroupOrder?.participants?.map((p) => {
                      const isPendingOrDeclined = p.walletStatus === 'pending' || p.walletStatus === 'declined';
                      return (
                        <div 
                          key={p.userId?._id} 
                          className={`flex justify-between items-center p-3.5 border rounded-xl transition-all ${
                            isPendingOrDeclined ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 text-gray-400 opacity-75'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-gray-900">{p.userId?.name || 'Unknown'}</span>
                            {!isPendingOrDeclined && (
                              <span className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-wider">Already Paid</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-base font-extrabold text-gray-900 font-mono">₹{p.amount}</span>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              p.walletStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              p.walletStatus === 'declined' ? 'bg-red-50 text-red-700 border border-red-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {p.walletStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 leading-relaxed font-medium flex items-start gap-3 shadow-sm">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p>Split requests will be sent to all pending participants. They will receive a notification and can pay directly from their wallet.</p>
                </div>
              </div>
              
              <div className="p-5 border-t border-gray-100 bg-white flex gap-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <button
                  onClick={() => setSplitModalStep('select_order')}
                  disabled={splitModalLoading}
                  className="w-1/3 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all text-sm shadow-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleSendSplit}
                  disabled={splitModalLoading}
                  className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all text-sm shadow-md flex justify-center items-center gap-2"
                >
                  {splitModalLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                  Send Split Requests
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupChatWindow;
