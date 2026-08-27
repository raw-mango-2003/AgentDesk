import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  ExternalLink, 
  Filter, 
  Share2, 
  Edit3, 
  Check, 
  TrendingUp,
  ThumbsUp,
  X
} from 'lucide-react';
import { Business, CustomerReview, ReviewPlatform, ReviewSentiment } from '../types';
import { getReviews, saveReview, addNotification, addAuditLog } from '../lib/dbService';
import { formatDateTime } from '../lib/localization';

interface ReviewsDashboardProps {
  business: Business;
}

export function ReviewsDashboard({ business }: ReviewsDashboardProps) {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending_approval' | 'published' | 'escalated_to_human'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');

  useEffect(() => {
    loadReviews();
  }, [business.id]);

  async function loadReviews() {
    const list = await getReviews(business.id);
    setReviews(list);
  }

  const handleApproveResponse = async (review: CustomerReview) => {
    const responseToPublish = editingId === review.id ? editedResponse : (review.publishedResponse || review.aiDraftedResponse);
    const updated: CustomerReview = {
      ...review,
      status: 'published',
      publishedResponse: responseToPublish,
      flaggedForEscalation: false
    };

    await saveReview(updated);
    await addAuditLog(
      business.id,
      'admin@revenueos.internal',
      'REVIEW_RESPONSE_PUBLISHED',
      review.author,
      `Published reply to ${review.rating}-star review on ${review.platform}`
    );
    setEditingId(null);
    await loadReviews();
  };

  const handleSendReviewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerContact.trim()) return;

    await addNotification({
      businessId: business.id,
      type: 'campaign_reply',
      title: `⭐ Review Request Sent: ${customerName}`,
      message: `Sent 5-star Google review link via ${business.country === 'IN' ? 'WhatsApp' : 'SMS'}.`
    });

    setShowRequestModal(false);
    setCustomerName('');
    setCustomerContact('');
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const positivePercent = reviews.length > 0
    ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Reputation & Trust Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              AI Sentiment Gatekeeper
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span>Review & Reputation Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Automate 5-star review collection after completed service appointments. AI monitors customer feedback across Google, Yelp, and Practo, drafts brand-aligned public responses, and escalates dissatisfied customers for human intervention.
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Send Review Request</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Average Rating</div>
            <div className="text-3xl font-black text-white mt-1 flex items-center gap-2">
              <span>{averageRating}</span>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">Based on {reviews.length} verified reviews</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Positive Sentiment</div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{positivePercent}%</div>
          <div className="text-[10px] text-slate-400 mt-1">4-star and 5-star ratings</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Human Escalation Gate</div>
          <div className="text-3xl font-black text-rose-400 mt-1">
            {reviews.filter(r => r.status === 'escalated_to_human').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Requires manager review before publishing</div>
        </div>
      </div>

      {/* Reviews Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Customer Feedback Feed ({reviews.length})</span>
          </h3>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl text-xs border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${filter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('published')}
              className={`px-3 py-1 rounded-lg transition-all ${filter === 'published' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Published
            </button>
            <button
              onClick={() => setFilter('escalated_to_human')}
              className={`px-3 py-1 rounded-lg transition-all ${filter === 'escalated_to_human' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Escalated ({reviews.filter(r => r.status === 'escalated_to_human').length})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredReviews.map(review => {
            const isEditing = editingId === review.id;
            return (
              <div
                key={review.id}
                className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3.5"
              >
                {/* Author, Platform, Stars, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-300 font-bold flex items-center justify-center text-sm">
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{review.author}</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {review.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      review.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : review.status === 'escalated_to_human'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {review.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatDateTime(review.date, business.timezone, business.country)}
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "{review.reviewText}"
                </p>

                {/* AI Drafted Response Box */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      {review.status === 'published' ? 'Published Response' : 'AI Drafted Public Response'}
                    </span>

                    {review.status !== 'published' && (
                      <button
                        onClick={() => {
                          setEditingId(isEditing ? null : review.id);
                          setEditedResponse(review.aiDraftedResponse);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isEditing ? 'Cancel Edit' : 'Edit Copy'}</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={editedResponse}
                      onChange={e => setEditedResponse(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {review.publishedResponse || review.aiDraftedResponse}
                    </p>
                  )}

                  {review.status !== 'published' && (
                    <div className="flex items-center justify-end pt-2">
                      <button
                        onClick={() => handleApproveResponse(review)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Publish Response</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Send 5-Star Review Request</span>
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendReviewRequest} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Travis Holloway"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Customer Mobile / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={customerContact}
                  onChange={e => setCustomerContact(e.target.value)}
                  placeholder={business.country === 'IN' ? '+91 98450 12345' : '+1 (512) 555-0199'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Automated Review Link:</span>
                <p className="font-mono text-amber-300 truncate">
                  https://g.page/r/{business.id}/review
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Send Review Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
