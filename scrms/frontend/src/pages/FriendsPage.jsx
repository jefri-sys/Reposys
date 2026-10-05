import { useCallback, useContext, useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContextObject';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import FriendSearch from '../components/FriendSearch';

const ROLE_BADGE = {
  Student: 'border-sky-200 bg-sky-50 text-sky-700',
  Faculty: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const RoleBadge = ({ role }) => (
  <span
    className={[
      'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
      ROLE_BADGE[role] || 'border-slate-200 bg-slate-50 text-slate-600',
    ].join(' ')}
  >
    {role}
  </span>
);

const FriendsPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();

  const [pending, setPending] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        setError(
          pendingResult.reason?.response?.data?.message
          || friendsResult.reason?.response?.data?.message
          || 'Could not load friends data. Please refresh and try again.'
        );
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

    // Join the user's personal room so we receive directed events
    socket.emit('joinUserRoom', user._id);

    const handleFriendRequest = (payload) => {
      if (!payload?.friendshipId || !payload?.requester) return;
      // Append new pending request to local state
      setPending((prev) => {
        const alreadyExists = prev.some(
          (r) => String(r._id) === String(payload.friendshipId)
        );
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
      // Move from pending to accepted friends if present
      setPending((prev) => {
        const found = prev.find((r) => String(r._id) === String(payload.friendshipId));
        if (found) {
          const { requester } = found;
          setFriends((currentFriends) => {
            const alreadyFriend = currentFriends.some(
              (f) => String(f.friendshipId) === String(payload.friendshipId)
            );
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
      // Do NOT disconnect — socket is shared across the app
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
    } catch {
      // Leave UI unchanged on error
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
    } catch {
      // Leave UI unchanged on error
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
    } catch {
      // Leave UI unchanged on error
    } finally {
      setRemovingId('');
    }
  }, [removingId]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] px-6">
        <div className="max-w-md rounded-[28px] border border-rose-200 bg-white px-6 py-8 text-center shadow-sm">
          <Users className="mx-auto mb-4 h-10 w-10 text-rose-300" />
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff,_#eef4ff_52%,_#f8fafc)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Page header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
            Social
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Friends
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Search for classmates and faculty, manage friend requests, and keep your network up to date.
          </p>
        </div>

        {/* ── Section 1: Search ── */}
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_30px_120px_-70px_rgba(15,23,42,0.35)]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Find People
          </p>
          <FriendSearch />
        </section>

        {/* ── Section 2: Pending requests (only when non-empty) ── */}
        {pending.length > 0 && (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">
                Incoming
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Friend Requests
                <span className="ml-3 inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-700">
                  {pending.length}
                </span>
              </h2>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {pending.map((request) => {
                  const rid = String(request._id);
                  const isAccepting = acceptingId === rid;
                  const isDeclining = decliningId === rid;
                  const isBusy = isAccepting || isDeclining;

                  return (
                    <li key={rid} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {request.requester?.name || 'Unknown'}
                        </p>
                        <div className="mt-1.5">
                          <RoleBadge role={request.requester?.role} />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          id={`accept-${rid}`}
                          type="button"
                          onClick={() => handleAccept(request._id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAccepting ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          Accept
                        </button>

                        <button
                          id={`decline-${rid}`}
                          type="button"
                          onClick={() => handleDecline(request._id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeclining ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700" />
                          ) : (
                            <UserX className="h-3.5 w-3.5" />
                          )}
                          Decline
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* ── Section 3: My Friends ── */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
              Network
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              My Friends
            </h2>
          </div>

          {friends.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <Users className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-950">No friends yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Use the search above to find people and send a request.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {friends.map((friend) => {
                  const fid = String(friend.friendshipId);
                  const isRemoving = removingId === fid;

                  return (
                    <li key={fid} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {friend.name}
                        </p>
                        <div className="mt-1.5">
                          <RoleBadge role={friend.role} />
                        </div>
                      </div>

                      <button
                        id={`remove-friend-${fid}`}
                        type="button"
                        onClick={() => handleRemove(friend.friendshipId)}
                        disabled={isRemoving}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Remove ${friend.name} from friends`}
                      >
                        {isRemoving ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default FriendsPage;
