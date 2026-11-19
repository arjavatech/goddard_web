import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/data-table';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { StatCard } from '../../components/ui/stat-card';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { usePageSize } from '../../hooks/usePageSize';
import { Eye, Search, X, ClipboardList } from 'lucide-react';

export function OfferLetterReview() {
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const schoolId = userData?.schoolId ?? '';
  const offerLetterEnabled = userData?.schoolData?.features?.offerLetterEnabled ?? false;

  const [offers, setOffers] = useState<OfferLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePageSize('offerLetterReview', 10);

  const loadOffers = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const all = await OfferLetterService.listOfferLetters(schoolId);
      setOffers(all.filter(o => o.status === 'employee_signed' || o.status === 'offer_accepted'));
    } catch {
      showToast('error', 'Failed to load pending offer letters');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const filtered = offers.filter(o => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      `${o.firstName} ${o.lastName}`.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!offerLetterEnabled) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] mt-16 sm:mt-10">
          <p className="text-slate-500 text-sm">Offer Letter feature is not enabled for this school.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Offer Letter Review</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              Review and approve accepted offer letters before activating employees
            </p>
          </div>
        </div>

        {/* Stat card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            label="Awaiting Review"
            value={offers.length}
            icon={ClipboardList}
            iconBgClass="bg-blue-50"
            iconColorClass="text-blue-600"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pending Approval</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Employees who accepted their offer letter and are awaiting your review
                </p>
              </div>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <DataTable
            className="relative z-0"
            loading={isLoading}
            loadingMessage="Loading pending offer letters…"
            emptyMessage="No offer letters are awaiting review."
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={setItemsPerPage}
            onPageChange={setCurrentPage}
            columns={[
              { header: 'Employee', className: 'w-1/3' },
              { header: 'Email', className: 'w-1/3' },
              { header: 'Accepted At', className: 'w-32' },
              { header: 'Actions', className: 'w-auto' },
            ]}
            rows={paginated.map(offer => {
              const initials = `${offer.firstName?.[0] || ''}${offer.lastName?.[0] || ''}`.toUpperCase();
              const acceptedDate = offer.employeeRespondedAt
                ? new Date(offer.employeeRespondedAt).toLocaleDateString()
                : '—';
              return (
                <tr key={offer.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <AvatarInitials initials={initials} className="bg-[#0151a0] text-white font-semibold" />
                      <span className="text-sm font-bold text-slate-900">{offer.firstName} {offer.lastName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-xs text-slate-600 font-semibold break-all">{offer.email}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-xs text-slate-500">{acceptedDate}</p>
                  </td>
                  <td className="py-4 px-4">
                    <Link
                      to={`/${schoolSlug}/admin/offer-letters/review/${offer.id}`}
                      state={{ offer, returnPath: `/${schoolSlug}/admin/offer-letters/review` }}
                    >
                      <Button size="sm" className="h-7 rounded-lg bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white text-xs px-3 gap-1.5 hover:opacity-90 border-0">
                        <Eye className="w-3.5 h-3.5" /> Review
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          />
        </div>
      </div>

    </AdminLayout>
  );
}
