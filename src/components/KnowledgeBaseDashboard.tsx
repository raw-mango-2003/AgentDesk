import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  X, 
  Sparkles,
  Filter,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2
} from 'lucide-react';
import { Business, KnowledgeItem, KnowledgeType, KnowledgeStatus } from '../types';
import { 
  getKnowledgeItems, 
  addKnowledgeItem, 
  updateKnowledgeItem, 
  deleteKnowledgeItem,
  normalizeTenantId
} from '../lib/dbService';

interface KnowledgeBaseDashboardProps {
  business: Business;
}

export const KnowledgeBaseDashboard: React.FC<KnowledgeBaseDashboardProps> = ({ business }) => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<KnowledgeType>('faq');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStatus, setFormStatus] = useState<KnowledgeStatus>('active');
  const [formVisibility, setFormVisibility] = useState<KnowledgeItem['visibility']>('public');

  // Async Operation States
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const activeTenantId = normalizeTenantId(business?.id);

  const loadData = async () => {
    if (!activeTenantId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getKnowledgeItems(activeTenantId);
      // Double ensure strict tenant filtering on client side
      const filtered = data.filter(k => normalizeTenantId(k.tenantId || k.businessId) === activeTenantId);
      setItems(filtered);
    } catch (err: any) {
      console.error('Failed to load knowledge items for tenant:', activeTenantId, err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // When tenant changes, clear previous items immediately and load fresh
    setItems([]);
    setSearch('');
    setSaveError(null);
    setActionSuccess(null);
    loadData();
  }, [activeTenantId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleOpenModal = (item?: KnowledgeItem) => {
    setSaveError(null);
    if (item) {
      setEditingItem(item);
      setFormTitle(item.title);
      setFormType(item.type);
      setFormContent(item.content);
      setFormCategory(item.category || 'General');
      setFormStatus(item.status || (item.active ? 'active' : 'draft'));
      setFormVisibility(item.visibility || 'public');
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormType('faq');
      setFormContent('');
      setFormCategory('General');
      setFormStatus('active');
      setFormVisibility('public');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const titleTrimmed = formTitle.trim();
    const contentTrimmed = formContent.trim();
    const categoryTrimmed = formCategory.trim() || 'General';

    if (!activeTenantId) {
      setSaveError('Error: No active tenant ID detected. Please select a valid business workspace.');
      return;
    }

    if (!titleTrimmed) {
      setSaveError('Please provide a title or question header.');
      return;
    }

    if (!contentTrimmed) {
      setSaveError('Please provide the knowledge text or answer.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingItem) {
        await updateKnowledgeItem(
          editingItem.id,
          {
            title: titleTrimmed,
            type: formType,
            content: contentTrimmed,
            category: categoryTrimmed,
            status: formStatus,
            active: formStatus === 'active',
            visibility: formVisibility,
            tenantId: activeTenantId,
            businessId: activeTenantId
          },
          activeTenantId
        );
        setActionSuccess(`Knowledge item "${titleTrimmed}" updated successfully.`);
      } else {
        await addKnowledgeItem({
          tenantId: activeTenantId,
          businessId: activeTenantId,
          title: titleTrimmed,
          type: formType,
          content: contentTrimmed,
          category: categoryTrimmed,
          status: formStatus,
          active: formStatus === 'active',
          visibility: formVisibility
        });
        setActionSuccess(`Knowledge item "${titleTrimmed}" created and persisted successfully.`);
      }

      // Close modal and refresh list only AFTER successful persistence
      setShowModal(false);
      await loadData();

      // Auto dismiss success banner after 4s
      setTimeout(() => {
        setActionSuccess(null);
      }, 4000);

    } catch (err: any) {
      console.error('Error persisting knowledge item:', err);
      setSaveError(err?.message || 'Failed to save knowledge item to storage. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge item? It will be removed from AI retrieval.')) {
      return;
    }

    try {
      await deleteKnowledgeItem(id, activeTenantId);
      setActionSuccess('Knowledge item removed successfully.');
      await loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting knowledge item:', err);
      alert('Failed to delete item: ' + (err?.message || 'Unknown error'));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.content.toLowerCase().includes(search.toLowerCase()) ||
                          (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="bg-emerald-900/30 border border-emerald-700/60 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tenant Isolation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-400" />
              Knowledge Base
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Tenant: {business?.name} ({activeTenantId})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            All items are strictly isolated and persisted for <span className="font-semibold text-slate-200">{business.name}</span>. The AI receptionist retrieves answers strictly from this tenant's knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Knowledge"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-2 w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${business.name} FAQs, tuition, syllabus, policies...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-slate-200"
          >
            <option value="all">All Types</option>
            <option value="faq">FAQ Only</option>
            <option value="text">Plain Text Knowledge</option>
            <option value="document">Document Source</option>
          </select>
        </div>
      </div>

      {/* Knowledge Items Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs">Loading {business.name} knowledge base...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-200 text-sm mb-1">No knowledge items found for {business.name}</h3>
          <p className="text-xs mb-4 text-slate-400">Add course fees, admission requirements, or FAQs so your AI agent can answer queries accurately.</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            Create Knowledge Item
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg text-xs font-semibold ${
                      item.type === 'faq' ? 'bg-blue-500/20 text-blue-300' : 'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      {item.type === 'faq' ? <HelpCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{item.category || 'General'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      item.status === 'active' || item.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {item.status || (item.active ? 'active' : 'draft')}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-white text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {item.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-500">
                <span>Tenant: <strong className="text-slate-400">{activeTenantId}</strong></span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  {editingItem ? 'Edit Knowledge Item' : 'Add Knowledge Item'}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Target Tenant: <strong className="text-blue-400">{business.name}</strong> ({activeTenantId})
                </span>
              </div>
              <button
                onClick={() => !isSaving && setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
                disabled={isSaving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 bg-rose-950/40 border border-rose-800/80 text-rose-200 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title / Question Header *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Certified Professional Coder (CPC) Exam Prep Tuition"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Knowledge Type
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as KnowledgeType)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="faq">FAQ (Q&A)</option>
                    <option value="text">Plain Text Information</option>
                    <option value="document">Document Source</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Courses, Pricing, Admissions"
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content / Knowledge Text *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder={`Enter specific factual details for ${business.name} AI agent to retrieve...`}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formStatus === 'active'}
                    onChange={e => setFormStatus(e.target.checked ? 'active' : 'draft')}
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active Knowledge Source</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSaving ? 'Saving...' : 'Save Knowledge'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
