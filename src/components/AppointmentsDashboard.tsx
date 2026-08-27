import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Plus, 
  RefreshCw, 
  Bell, 
  Phone, 
  Mail, 
  CalendarCheck, 
  Filter,
  X
} from 'lucide-react';
import { Business, Appointment, AppointmentStatus } from '../types';
import { getAppointments, saveAppointment, addNotification, addAuditLog } from '../lib/dbService';
import { formatDateTime, formatPhoneNumber } from '../lib/localization';

interface AppointmentsDashboardProps {
  business: Business;
}

export function AppointmentsDashboard({ business }: AppointmentsDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | AppointmentStatus>('all');
  const [showModal, setShowModal] = useState(false);

  // New Appointment Form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [serviceName, setServiceName] = useState(
    business.country === 'IN' ? 'Invisalign 3D iTero Consultation' : 'Emergency HVAC Maintenance Checkup'
  );
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');

  useEffect(() => {
    loadAppointments();
  }, [business.id]);

  async function loadAppointments() {
    const list = await getAppointments(business.id);
    setAppointments(list);
  }

  const handleStatusChange = async (apt: Appointment, newStatus: AppointmentStatus) => {
    const updated: Appointment = {
      ...apt,
      status: newStatus
    };
    await saveAppointment(updated);
    await addAuditLog(
      business.id,
      'calendar-engine@revenueos.internal',
      'APPOINTMENT_STATUS_CHANGED',
      apt.contactName,
      `Updated appointment status to ${newStatus}`
    );
    await loadAppointments();
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    const startIso = new Date(`${date}T${time}:00`).toISOString();
    const endIso = new Date(new Date(`${date}T${time}:00`).getTime() + 60 * 60000).toISOString();

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      businessId: business.id,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim() || `${contactName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      contactPhone: contactPhone.trim() || (business.country === 'IN' ? '+91 98450 11223' : '+1 (512) 555-0188'),
      serviceName,
      startTime: startIso,
      endTime: endIso,
      status: 'scheduled',
      location: business.address,
      remindersSent: { immediate: true, twentyFourHours: false, twoHours: false },
      calendarType: 'google',
      createdAt: new Date().toISOString()
    };

    await saveAppointment(newApt);
    await addNotification({
      businessId: business.id,
      type: 'appointment_booked',
      title: `📅 New Booking: ${newApt.contactName}`,
      message: `${serviceName} scheduled for ${formatDateTime(startIso, business.timezone, business.country)}.`
    });

    setShowModal(false);
    setContactName('');
    await loadAppointments();
  };

  const filteredAppointments = appointments.filter(a => {
    if (selectedStatus === 'all') return true;
    return a.status === selectedStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Two-Way Calendar Sync
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Automated 3-Step Reminders
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Appointment Scheduling & Reminders</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Autonomous booking across AI Chat, Voice Receptionist, and Missed Call Text-Back. Sends automated instant confirmations, 24h reminders, and 2h directions via SMS / WhatsApp to eliminate no-shows.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Scheduled Bookings</div>
          <div className="text-2xl font-black text-white mt-1">{appointments.length}</div>
          <div className="text-[10px] text-blue-400 mt-1">Google Calendar 2-way sync enabled</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">Confirmed & Completed</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">94% show-up rate with 3-step reminder sequence</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400 font-semibold uppercase">No-Shows Prevented</div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {appointments.length * 3} SMS/WhatsApp Reminders Sent
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Instant confirmation + 24h + 2h</div>
        </div>
      </div>

      {/* Appointments List & Status Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-400" />
            <span>Upcoming Schedule & Bookings ({appointments.length})</span>
          </h3>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl text-xs border border-slate-800">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('scheduled')}
              className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === 'scheduled' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setSelectedStatus('confirmed')}
              className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === 'confirmed' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setSelectedStatus('completed')}
              className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === 'completed' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              Completed
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAppointments.map(apt => (
            <div
              key={apt.id}
              className="bg-slate-950 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    apt.status === 'confirmed' || apt.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : apt.status === 'cancelled'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {apt.status}
                  </span>
                  <h4 className="text-sm font-bold text-white">{apt.serviceName}</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>{apt.contactName} ({formatPhoneNumber(apt.contactPhone, business.country)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{formatDateTime(apt.startTime, business.timezone, business.country)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span className="truncate">{apt.location || business.address}</span>
                  </div>
                </div>

                {/* Reminder Sequence Indicators */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    Instant SMS/WhatsApp Sent
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <Bell className="w-3 h-3" />
                    24h Reminder Queued
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    2h Direction Link
                  </span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {apt.status === 'scheduled' && (
                  <button
                    onClick={() => handleStatusChange(apt, 'confirmed')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 cursor-pointer"
                  >
                    Confirm
                  </button>
                )}
                {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusChange(apt, 'completed')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/30 cursor-pointer"
                  >
                    Complete
                  </button>
                )}
                {apt.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusChange(apt, 'cancelled')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredAppointments.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              No appointments found for this status.
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Book Service Appointment</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. Anand Krishnamurthy"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder={business.country === 'IN' ? '+91 99001 88765' : '+1 (512) 334-1189'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Service</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save & Sync Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
