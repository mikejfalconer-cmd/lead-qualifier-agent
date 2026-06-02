import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { leadsAPI, Lead } from '../lib/api';
import { Search, Filter } from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const { client } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');

  useEffect(() => {
    if (!client) return;

    const fetchLeads = async () => {
      try {
        setIsLoading(true);
        const response = await leadsAPI.getByClient(client.id);
        setLeads(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch leads:', err);
        setError('Failed to load leads');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [client]);

  // Filter leads based on search and qualification
  useEffect(() => {
    let filtered = leads;

    if (qualificationFilter !== 'all') {
      filtered = filtered.filter(lead => lead.qualification === qualificationFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.senderEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.senderName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, qualificationFilter]);

  const getQualificationColor = (qualification: string) => {
    switch (qualification) {
      case 'hot':
        return 'bg-red-100 text-red-800';
      case 'warm':
        return 'bg-orange-100 text-orange-800';
      case 'cold':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualificationEmoji = (qualification: string) => {
    switch (qualification) {
      case 'hot':
        return '🔥';
      case 'warm':
        return '🌤️';
      case 'cold':
        return '❄️';
      default:
        return '📧';
    }
  };

  return (
    <DashboardLayout title="Leads">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by email, name, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={qualificationFilter}
                onChange={(e) => setQualificationFilter(e.target.value as any)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="all">All Qualifications</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">🌤️ Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading leads...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              {leads.length === 0 ? 'No leads yet' : 'No leads match your filters'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">From</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Subject</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Qualification</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{lead.senderName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{lead.senderEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{lead.subject}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getQualificationColor(lead.qualification)}`}>
                        {getQualificationEmoji(lead.qualification)}
                        {lead.qualification.charAt(0).toUpperCase() + lead.qualification.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/leads/${lead.id}`}
                        className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>
    </DashboardLayout>
  );
};
