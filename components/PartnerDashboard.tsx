'use client';

interface ClientRow {
  userId: string;
  email: string;
  scansCount: number;
  joinedAt: string;
}

interface RevenueData {
  totalRevenue: number;
  totalShare: number;
  monthlyBreakdown: { month: string; revenue: number; share: number }[];
}

interface PartnerDashboardProps {
  clients: ClientRow[];
  revenue: RevenueData;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function PartnerDashboard({
  clients,
  revenue,
}: PartnerDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Clients</p>
          <p className="mt-2 text-3xl font-bold text-navy">{clients.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-navy">
            {formatCurrency(revenue.totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Your Share (20%)
          </p>
          <p className="mt-2 text-3xl font-bold text-teal">
            {formatCurrency(revenue.totalShare)}
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          Monthly Breakdown
        </h2>
        {revenue.monthlyBreakdown.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No revenue data yet. Revenue will appear here as your clients use
            Auditflow.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 pr-4 font-semibold text-gray-500">
                    Month
                  </th>
                  <th className="pb-3 pr-4 text-right font-semibold text-gray-500">
                    Revenue
                  </th>
                  <th className="pb-3 text-right font-semibold text-gray-500">
                    Your Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {revenue.monthlyBreakdown.map((row) => (
                  <tr key={row.month}>
                    <td className="py-3 pr-4 font-medium text-navy">
                      {formatMonth(row.month)}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="py-3 text-right font-medium text-teal">
                      {formatCurrency(row.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Your Clients</h2>
        {clients.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No clients yet. Share your referral link to start building your
            client base.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 pr-4 font-semibold text-gray-500">
                    Email
                  </th>
                  <th className="pb-3 pr-4 text-right font-semibold text-gray-500">
                    Scans
                  </th>
                  <th className="pb-3 text-right font-semibold text-gray-500">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((client) => (
                  <tr key={client.userId}>
                    <td className="py-3 pr-4 font-medium text-navy">
                      {client.email}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {client.scansCount}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {formatDate(client.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
