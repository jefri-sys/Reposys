import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import api from '../services/api';

const DEBOUNCE_MS = 300;

const ROLE_BADGE = {
  Student: 'border-sky-200 bg-sky-50 text-sky-700',
  Faculty: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const FriendSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchState, setSearchState] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'
  const [sentIds, setSentIds] = useState(new Set());
  const [sendingId, setSendingId] = useState('');
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearchState('idle');
      return;
    }

    setSearchState('loading');

    try {
      const response = await api.get('/friends/search', { params: { q: q.trim() } });
      setResults(Array.isArray(response.data) ? response.data : []);
      setSearchState('done');
    } catch {
      setResults([]);
      setSearchState('error');
    }
  }, []);

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
    } catch {
      // Keep button enabled so user can retry; do not crash
    } finally {
      setSendingId('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          {searchState === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <input
          id="friend-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or register number"
          className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          autoComplete="off"
        />
      </div>

      {/* Results */}
      {searchState === 'error' && (
        <p className="px-1 text-sm text-rose-600">Search unavailable. Please try again later.</p>
      )}

      {searchState === 'done' && query.trim() && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center text-sm text-slate-500">
          No users found
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {results.map((user) => {
              const alreadySent = sentIds.has(String(user._id));
              const isSending = sendingId === String(user._id);
              const roleBadgeClass = ROLE_BADGE[user.role] || 'border-slate-200 bg-slate-50 text-slate-700';

              return (
                <li
                  key={user._id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                          roleBadgeClass,
                        ].join(' ')}
                      >
                        {user.role}
                      </span>
                      {user.registerNumber && (
                        <span className="text-xs text-slate-400">{user.registerNumber}</span>
                      )}
                    </div>
                  </div>

                  {alreadySent ? (
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      Request Sent
                    </span>
                  ) : (
                    <button
                      type="button"
                      id={`send-request-${user._id}`}
                      onClick={() => handleSendRequest(String(user._id))}
                      disabled={isSending}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                      Send Request
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FriendSearch;
