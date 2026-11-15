import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { service } from '../services'
import { useToast } from '../context/ToastContext'
import { timeAgo, formatDate } from '../lib/constants'
import {
  AvailabilityBadge,
  BloodBadge,
  StatusBadge,
  UrgencyBadge,
  VerifiedBadge,
} from '../components/Badges'
import { Alert, EmptyState, Modal, PageHeader, PageLoader, Stat, TextField } from '../components/ui'

export default function AdminDashboard() {
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('hospitals') // 'overview' | 'hospitals' | 'donors' | 'requests' | 'users'
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [donors, setDonors] = useState([])
  const [requests, setRequests] = useState([])
  const [actionBusyId, setActionBusyId] = useState(null)

  // Verification modal state
  const [verifyTarget, setVerifyTarget] = useState(null)
  const [verifyNotes, setVerifyNotes] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, hospList, donorList, reqList] = await Promise.all([
        service.admin.getStats(),
        service.admin.listHospitals(),
        service.admin.listDonors(),
        service.admin.listRequests(),
      ])

      setStats(statsData)
      setHospitals(hospList)
      setDonors(donorList)
      setRequests(reqList)
    } catch (err) {
      toast.error(err.message || 'Failed to load administrative data.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Hospital Verification Action
  const handleVerify = async (hospitalId, status, notes = '') => {
    setActionBusyId(hospitalId)
    try {
      await service.admin.verifyHospital(hospitalId, status, notes)
      toast.success(status ? 'Hospital verified successfully.' : 'Hospital verification revoked.')
      setVerifyTarget(null)
      setVerifyNotes('')
      await loadAll()
    } catch (err) {
      toast.error(err.message || 'Could not update verification status.')
    } finally {
      setActionBusyId(null)
    }
  }

  // User Account Suspension / Activation Toggle
  const toggleUserActive = async (userId, currentActive) => {
    setActionBusyId(userId)
    try {
      await service.admin.updateUserStatus(userId, { isActive: !currentActive })
      toast.success(!currentActive ? 'Account reactivated.' : 'Account suspended.')
      await loadAll()
    } catch (err) {
      toast.error(err.message || 'Could not update account status.')
    } finally {
      setActionBusyId(null)
    }
  }

  // Toggle reported flag
  const toggleUserReported = async (userId, currentReported) => {
    setActionBusyId(userId)
    try {
      await service.admin.updateUserStatus(userId, { isReported: !currentReported })
      toast.info(!currentReported ? 'Account marked as reported.' : 'Report flag cleared.')
      await loadAll()
    } catch (err) {
      toast.error(err.message || 'Could not update reported status.')
    } finally {
      setActionBusyId(null)
    }
  }

  const pendingHospitals = useMemo(
    () => hospitals.filter((h) => !h.verified),
    [hospitals]
  )

  if (loading) return <PageLoader label="Loading platform administration data…" />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Platform Administration"
        subtitle="Manage donors, verify hospitals, review blood requests, and monitor network health."
        actions={
          <button type="button" onClick={loadAll} className="btn-outline">
            Refresh Data
          </button>
        }
      />

      {/* Top Level Stats */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Total Users" value={stats.totalUsers || 0} />
          <Stat label="Donors" value={stats.totalDonors || 0} tone="success" />
          <Stat label="Hospitals" value={stats.totalHospitals || 0} />
          <Stat
            label="Pending Verifications"
            value={stats.pendingHospitals || pendingHospitals.length}
            tone={stats.pendingHospitals > 0 ? 'danger' : 'default'}
          />
          <Stat label="Active Requests" value={stats.activeRequests || 0} tone="danger" />
          <Stat label="Completed Donations" value={stats.completedRequests || 0} tone="success" />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-black/10 pb-3">
        {[
          { id: 'hospitals', label: `Hospitals (${hospitals.length})`, badge: pendingHospitals.length },
          { id: 'donors', label: `Donors (${donors.length})` },
          { id: 'requests', label: `Blood Requests (${requests.length})` },
          { id: 'moderation', label: `Moderation (${stats?.reportedUsers || 0} reported)` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card text-ink hover:bg-black/5'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: HOSPITALS & VERIFICATION */}
      {activeTab === 'hospitals' && (
        <div className="space-y-4">
          {pendingHospitals.length > 0 && (
            <Alert tone="warning" className="mb-4">
              <strong>Action required:</strong> {pendingHospitals.length} hospital(s) are awaiting verification before they can post requests.
            </Alert>
          )}

          <div className="card overflow-hidden">
            <div className="border-b border-black/5 p-4">
              <h2 className="text-base font-semibold text-heading">Registered Hospitals & Blood Banks</h2>
              <p className="text-xs text-gray-500">Verify hospital licenses and manage medical privileges.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 bg-slate-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Hospital / Facility</th>
                    <th className="px-4 py-3">Reg. Number</th>
                    <th className="px-4 py-3">Contact Person</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {hospitals.map((hosp) => (
                    <tr key={hosp.id || hosp._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-heading">{hosp.hospitalName}</div>
                        <div className="text-xs text-gray-400">{hosp.email} · {hosp.phone}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {hosp.registrationNumber || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{hosp.contactPerson}</td>
                      <td className="px-4 py-3 text-gray-600">{hosp.city}</td>
                      <td className="px-4 py-3">
                        <VerifiedBadge verified={hosp.verified} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hosp.verified ? (
                          <button
                            type="button"
                            onClick={() => handleVerify(hosp.id || hosp._id, false)}
                            disabled={actionBusyId === (hosp.id || hosp._id)}
                            className="btn-ghost text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Revoke Verification
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyTarget(hosp)
                              setVerifyNotes('')
                            }}
                            className="btn-primary py-1 text-xs"
                          >
                            Approve Verification
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DONOR DIRECTORY */}
      {activeTab === 'donors' && (
        <div className="card overflow-hidden">
          <div className="border-b border-black/5 p-4">
            <h2 className="text-base font-semibold text-heading">Registered Blood Donors</h2>
            <p className="text-xs text-gray-500">Monitor donor eligibility, blood group distribution, and account status.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-slate-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Donor Name</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">City / Area</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Last Donation</th>
                  <th className="px-4 py-3 text-right">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {donors.map((donor) => (
                  <tr key={donor.id || donor._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-heading">{donor.name}</div>
                      <div className="text-xs text-gray-400">{donor.email} · {donor.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <BloodBadge group={donor.bloodGroup} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{donor.city}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {donor.age || '—'} / {donor.gender || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <AvailabilityBadge available={donor.available} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {donor.lastDonationDate ? formatDate(donor.lastDonationDate) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleUserActive(donor.uid, donor.isActive)}
                        className={`text-xs font-semibold ${
                          donor.isActive ? 'text-rose-600 hover:underline' : 'text-emerald-600 hover:underline'
                        }`}
                      >
                        {donor.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BLOOD REQUESTS */}
      {activeTab === 'requests' && (
        <div className="card overflow-hidden">
          <div className="border-b border-black/5 p-4">
            <h2 className="text-base font-semibold text-heading">Platform Blood Requests</h2>
            <p className="text-xs text-gray-500">Active and past blood requests across all registered hospitals.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-slate-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Hospital / Patient</th>
                  <th className="px-4 py-3">Required Group</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date Posted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {requests.map((req) => (
                  <tr key={req.id || req._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-heading">{req.hospitalName}</div>
                      <div className="text-xs text-gray-500">{req.patientName || 'Emergency Ward'} · {req.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <BloodBadge group={req.bloodGroup} />
                    </td>
                    <td className="px-4 py-3 font-semibold">{req.units} unit(s)</td>
                    <td className="px-4 py-3">
                      <UrgencyBadge level={req.urgency} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {timeAgo(req.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/hospital/requests/${req.id || req._id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View Request
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MODERATION & SUSPICIOUS ACCOUNTS */}
      {activeTab === 'moderation' && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-heading">Account Moderation & Security</h2>
          <p className="mt-1 text-xs text-gray-500">
            Review reported or suspended accounts to ensure trust and safety across BloodBridge.
          </p>

          <div className="mt-4 divide-y divide-black/5">
            {[...donors, ...hospitals]
              .filter((u) => u.isReported || !u.isActive)
              .map((account) => (
                <div key={account.id || account._id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-heading">{account.name || account.hospitalName}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-gray-600 uppercase">
                        {account.role || (account.hospitalName ? 'hospital' : 'donor')}
                      </span>
                      {account.isReported && (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          Reported
                        </span>
                      )}
                      {!account.isActive && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{account.email} · {account.phone} · {account.city}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleUserActive(account.uid, account.isActive)}
                      className="btn-outline text-xs"
                    >
                      {account.isActive ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleUserReported(account.uid, account.isReported)}
                      className="btn-ghost text-xs text-gray-600"
                    >
                      {account.isReported ? 'Clear Report' : 'Flag Account'}
                    </button>
                  </div>
                </div>
              ))}

            {[...donors, ...hospitals].filter((u) => u.isReported || !u.isActive).length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">
                No flagged or suspended accounts. All accounts are in good standing.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifyTarget && (
        <Modal
          open={Boolean(verifyTarget)}
          onClose={() => setVerifyTarget(null)}
          title={`Verify ${verifyTarget.hospitalName}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setVerifyTarget(null)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerify(verifyTarget.id || verifyTarget._id, true, verifyNotes)}
                disabled={actionBusyId === (verifyTarget.id || verifyTarget._id)}
                className="btn-primary text-xs"
              >
                Confirm Verification
              </button>
            </>
          }
        >
          <div className="space-y-4 text-sm">
            <p>
              You are about to verify <strong>{verifyTarget.hospitalName}</strong> (License: {verifyTarget.registrationNumber}).
            </p>
            <p className="text-xs text-gray-500">
              Verified facilities are authorized to broadcast emergency blood requests and initiate contact with compatible donors.
            </p>
            <TextField
              id="verifyNotes"
              label="Verification Notes (optional)"
              placeholder="e.g. Verified with state medical council database"
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
