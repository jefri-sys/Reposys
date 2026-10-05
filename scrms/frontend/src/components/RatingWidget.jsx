import React, { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../services/api';

const RatingWidget = ({ orderId, tokenNumber, existingRating = null, onRated }) => {
  const [stars, setStars] = useState(existingRating?.stars || 0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasRated, setHasRated] = useState(!!existingRating);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (stars === 0) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }
    setSubmitting(true);
    setError('');
    
    try {
      const payload = { orderId, stars, comment };
      const response = await api.post('/ratings', payload);
      setSuccess(true);
      setHasRated(true);
      if (onRated) onRated(response.data.rating);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasRated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Rating for {tokenNumber}</h3>
        {success && <p className="text-sm text-emerald-600 font-medium mb-3">Thank you for your feedback!</p>}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 ${star <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
            />
          ))}
        </div>
        {comment && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-sm text-slate-700 italic">"{comment}"</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Rate Your Experience</h3>
      <p className="text-sm text-slate-500 mb-4">How was order {tokenNumber}?</p>
      
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 cursor-pointer transition-transform">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              onMouseEnter={() => setHoverStars(star)}
              onMouseLeave={() => setHoverStars(0)}
              onClick={() => setStars(star)}
              className={`h-8 w-8 transition hover:scale-110 active:scale-95 ${
                star <= (hoverStars || stars) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'
              }`}
            />
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Feedback (Optional) <span className="float-right text-xs text-slate-400">{comment.length}/500</span>
          </label>
          <textarea
            maxLength={500}
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about the print quality, binding, or service..."
            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </form>
    </div>
  );
};

export default RatingWidget;
