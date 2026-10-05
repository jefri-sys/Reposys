import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Search, UserCheck, UserX, UserMinus, UserPlus, Loader2, Users } from 'lucide-react';
import { AuthContext } from '../../context/AuthContextObject';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const DEBOUNCE_MS = 300;

const MobileFriendSearch = ({ onSearchStart, onSearchEnd }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchState, setSearchState] = useState('idle');
  const [sentIds, setSentIds] = useState(new Set());
  const [sendingId, setSendingId] = useState('');
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearchState('idle');
      onSearchEnd && onSearchEnd();
      return;
    }

    setSearchState('loading');
    onSearchStart && onSearchStart();

    try {
      const response = await api.get('/friends/search', { params: { q: q.trim() } });
      setResults(Array.isArray(response.data) ? response.data : []);
      setSearchState('done');
    } catch {
      setResults([]);
      setSearchState('error');
    }
  }, [onSearchStart, onSearchEnd]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  const handleSendRequest = async (userId) => {
    if (sendingId) return;
    setSendingId(userId);

    try {
      await api.post('/friends/request', { recipientId: userId });
      setSentIds((prev) => new Set(prev).add(userId));
    } catch (err) {
      console.error('Failed to send request:', err);
    } finally {
      setSendingId('');
    }
  };

  return (
    <section className="mt-3">
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          {searchState === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#003d9b]" />
          ) : (
            <Search className="h-5 w-5 text-[#737685]" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find tech collaborators..."
          className="w-full pl-12 pr-4 py-4 bg-[#ffffff] border-none rounded-xl shadow-sm focus:ring-2 focus:ring-[#003d9b]/20 transition-all font-['Inter'] text-[16px] placeholder:text-[#737685] outline-none"
        />
      </div>

      {/* Results Container */}
      {query.trim() && (
        <div className="mt-4 space-y-3">
          {searchState === 'error' && (
            <p className="text-[#ba1a1a] text-sm text-center">Search unavailable.</p>
          )}
          {searchState === 'done' && results.length === 0 && (
            <div className="bg-[#ffffff] rounded-xl p-6 text-center text-[#737685] border border-[#c3c6d6]/30 shadow-sm">
              No collaborators found
            </div>
          )}
          {results.length > 0 && (
            <div className="bg-[#ffffff] rounded-xl overflow-hidden shadow-sm border border-[#c3c6d6]/30">
              {results.map((user) => {
                const alreadySent = sentIds.has(String(user._id));
                const isSending = sendingId === String(user._id);

                return (
                  <div key={user._id} className="flex items-center justify-between p-4 border-b border-[#e9edff] last:border-0 hover:bg-[#f1f3ff] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#dae2ff] text-[#003d9b] flex items-center justify-center font-bold text-lg shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-['Inter'] font-semibold text-[#051a3e]">{user.name}</p>
                        <p className="font-['JetBrains_Mono'] text-[12px] text-[#737685] uppercase tracking-wider">{user.role}</p>
                      </div>
                    </div>

                    {alreadySent ? (
                      <span className="text-[12px] font-semibold text-[#737685]">Sent</span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(String(user._id))}
                        disabled={isSending}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f1f3ff] text-[#003d9b] hover:bg-[#dae2ff] transition-colors active:scale-90"
                      >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const MobileFriendsPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();

  const [pending, setPending] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Per-item action states
  const [acceptingId, setAcceptingId] = useState('');
  const [decliningId, setDecliningId] = useState('');
  const [removingId, setRemovingId] = useState('');

  // ─── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');

      const [pendingResult, friendsResult] = await Promise.allSettled([
        api.get('/friends/pending'),
        api.get('/friends'),
      ]);

      if (!isActive) return;

      if (pendingResult.status === 'rejected' || friendsResult.status === 'rejected') {
        setError('Could not load friends data.');
        setIsLoading(false);
        return;
      }

      setPending(Array.isArray(pendingResult.value.data) ? pendingResult.value.data : []);
      setFriends(Array.isArray(friendsResult.value.data) ? friendsResult.value.data : []);
      setIsLoading(false);
    };

    loadData();

    window.addEventListener('app_resumed', loadData);

    return () => {
      isActive = false;
      window.removeEventListener('app_resumed', loadData);
    };
  }, []);

  // ─── Socket integration ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user?._id) return undefined;

    socket.emit('joinUserRoom', user._id);

    const handleFriendRequest = (payload) => {
      if (!payload?.friendshipId || !payload?.requester) return;
      setPending((prev) => {
        const alreadyExists = prev.some((r) => String(r._id) === String(payload.friendshipId));
        if (alreadyExists) return prev;
        return [
          ...prev,
          {
            _id: payload.friendshipId,
            status: 'pending',
            requester: payload.requester,
          },
        ];
      });
    };

    const handleFriendRequestAccepted = (payload) => {
      if (!payload?.friendshipId) return;
      setPending((prev) => {
        const found = prev.find((r) => String(r._id) === String(payload.friendshipId));
        if (found) {
          const { requester } = found;
          setFriends((currentFriends) => {
            const alreadyFriend = currentFriends.some((f) => String(f.friendshipId) === String(payload.friendshipId));
            if (alreadyFriend) return currentFriends;
            return [
              ...currentFriends,
              {
                friendshipId: payload.friendshipId,
                _id: requester._id,
                name: requester.name,
                role: requester.role,
              },
            ];
          });
          return prev.filter((r) => String(r._id) !== String(payload.friendshipId));
        }
        return prev;
      });
    };

    socket.on('friendRequest', handleFriendRequest);
    socket.on('friendRequestAccepted', handleFriendRequestAccepted);

    return () => {
      socket.off('friendRequest', handleFriendRequest);
      socket.off('friendRequestAccepted', handleFriendRequestAccepted);
    };
  }, [socket, user?._id]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAccept = useCallback(async (friendshipId) => {
    if (acceptingId || decliningId) return;
    setAcceptingId(String(friendshipId));

    try {
      await api.post('/friends/respond', { friendshipId, action: 'accepted' });
      setPending((prev) => {
        const found = prev.find((r) => String(r._id) === String(friendshipId));
        if (found) {
          const { requester } = found;
          setFriends((currentFriends) => [
            ...currentFriends,
            {
              friendshipId,
              _id: requester._id,
              name: requester.name,
              role: requester.role,
            },
          ]);
        }
        return prev.filter((r) => String(r._id) !== String(friendshipId));
      });
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setAcceptingId('');
    }
  }, [acceptingId, decliningId]);

  const handleDecline = useCallback(async (friendshipId) => {
    if (acceptingId || decliningId) return;
    setDecliningId(String(friendshipId));

    try {
      await api.post('/friends/respond', { friendshipId, action: 'declined' });
      setPending((prev) => prev.filter((r) => String(r._id) !== String(friendshipId)));
    } catch (err) {
      console.error('Failed to decline request:', err);
    } finally {
      setDecliningId('');
    }
  }, [acceptingId, decliningId]);

  const handleRemove = useCallback(async (friendshipId) => {
    if (removingId) return;
    setRemovingId(String(friendshipId));

    try {
      await api.delete(`/friends/${friendshipId}`);
      setFriends((prev) => prev.filter((f) => String(f.friendshipId) !== String(friendshipId)));
    } catch (err) {
      console.error('Failed to remove friend:', err);
    } finally {
      setRemovingId('');
    }
  }, [removingId]);

  if (error) {
    return (
      <div className="min-h-full bg-[#f1f3ff] flex items-center justify-center pt-20 px-6 text-center">
        <p className="text-[#ba1a1a]">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-[#f1f3ff] flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#003d9b]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f1f3ff] text-[#051a3e] font-['Inter'] pb-8 pt-4 px-4 space-y-6">
      <MobileFriendSearch 
        onSearchStart={() => setIsSearching(true)} 
        onSearchEnd={() => setIsSearching(false)} 
      />

      {/* Hide lists when actively searching to maintain focus */}
      {!isSearching && (
        <>
          {/* Incoming Friend Requests */}
          {pending.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-['Hanken_Grotesk'] text-[24px] font-bold text-[#051a3e]">Requests</h2>
                <span className="font-['JetBrains_Mono'] text-[12px] font-bold bg-[#9f8eff] text-[#341d8d] px-3 py-1 rounded-full">
                  {pending.length} New
                </span>
              </div>
              <div className="space-y-3">
                {pending.map((request) => {
                  const rid = String(request._id);
                  const isAccepting = acceptingId === rid;
                  const isDeclining = decliningId === rid;

                  return (
                    <div key={rid} className="bg-[rgba(255,255,255,0.7)] backdrop-blur-md p-6 rounded-xl shadow-sm border border-[#c3c6d6]/50 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#0052cc] text-[#ffffff] flex items-center justify-center font-bold text-xl shrink-0 ring-2 ring-[#0052cc]/30">
                          {request.requester?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-['Hanken_Grotesk'] text-[18px] font-bold leading-tight text-[#051a3e]">{request.requester?.name || 'Unknown'}</p>
                          <p className="font-['JetBrains_Mono'] text-[12px] text-[#737685] uppercase tracking-wider">{request.requester?.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1">
                        <button
                          onClick={() => handleAccept(request._id)}
                          disabled={isAccepting || isDeclining}
                          className="flex-1 bg-[#003d9b] text-[#ffffff] py-2 rounded-lg font-['Hanken_Grotesk'] text-[14px] font-semibold hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-1"
                        >
                          {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(request._id)}
                          disabled={isAccepting || isDeclining}
                          className="flex-1 border border-[#737685] text-[#434654] py-2 rounded-lg font-['Hanken_Grotesk'] text-[14px] font-semibold hover:bg-[#e9edff] transition-colors active:scale-95 flex items-center justify-center gap-1"
                        >
                          {isDeclining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* My Friends Section */}
          <section className="space-y-4">
            <h2 className="font-['Hanken_Grotesk'] text-[24px] font-bold text-[#051a3e]">My Friends</h2>
            
            {friends.length === 0 ? (
              <div className="bg-[#ffffff] rounded-xl border border-[#c3c6d6]/30 p-10 text-center shadow-sm">
                <Users className="mx-auto mb-3 h-10 w-10 text-[#c3c6d6]" />
                <h3 className="font-['Hanken_Grotesk'] text-[18px] font-bold text-[#051a3e]">No friends yet</h3>
                <p className="mt-1 text-[14px] text-[#737685]">Use the search above to find collaborators.</p>
              </div>
            ) : (
              <div className="bg-[#ffffff] rounded-xl overflow-hidden shadow-sm border border-[#c3c6d6]/30">
                {friends.map((friend) => {
                  const fid = String(friend.friendshipId);
                  const isRemoving = removingId === fid;

                  return (
                    <div key={fid} className="flex items-center justify-between p-4 border-b border-[#e9edff] last:border-0 hover:bg-[#f1f3ff] transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#dae2ff] text-[#003d9b] flex items-center justify-center font-bold text-lg shrink-0">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-['Inter'] font-semibold text-[#051a3e]">{friend.name}</p>
                          <p className="font-['JetBrains_Mono'] text-[12px] text-[#737685] uppercase tracking-wider">{friend.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(friend.friendshipId)}
                        disabled={isRemoving}
                        aria-label="Remove Friend"
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#ffdad6] hover:text-[#93000a] text-[#737685] transition-all active:scale-90"
                      >
                        {isRemoving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserMinus className="w-5 h-5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default MobileFriendsPage;
