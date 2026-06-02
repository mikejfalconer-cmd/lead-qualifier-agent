import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { leadsAPI } from '../lib/api';
import { TrendingUp } from 'lucide-react';

interface Stats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  contacted: number;
  converted: number;
}

export const DashboardPage: React.FC = () => {
  const { client } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await leadsAPI.getStats(client.id);
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [client]);

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stats) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Failed to load dashboard'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : '0';
  const contactRate = stats.total > 0 ? ((stats.contacted / stats.total) * 100).toFixed(1) : '0';

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {client?.name}!</h2>
          <p className="text-indigo-100">
            Here's a summary of your lead qualification performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Leads"
            value={stats.total}
            icon="📧"
            color="blue"
          />
          <MetricCard
            title="Hot Leads"
            value={stats.hot}
            icon="🔥"
            color="red"
          />
          <MetricCard
            title="Warm Leads"
            value={stats.warm}
            icon="🌤️"
            color="orange"
          />
          <MetricCard
            title="Cold Leads"
            value={stats.cold}
            icon="❄️"
            color="gray"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PerformanceCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            subtitle={`${stats.converted} converted from ${stats.total} total`}
            icon="✅"
            trend="up"
          />
          <PerformanceCard
            title="Contact Rate"
            value={`${contactRate}%`}
            subtitle={`${stats.contacted} contacted from ${stats.total} total`}
            icon="📞"
            trend="up"
          />
        </div>

        {/* Qualification Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Qualification Breakdown</h3>
          <div className="space-y-4">
            <QualificationBar
              label="Hot Leads"
              value={stats.hot}
              total={stats.total}
              color="bg-red-500"
              emoji="🔥"
            />
            <QualificationBar
              label="Warm Leads"
              value={stats.warm}
              total={stats.total}
              color="bg-orange-500"
              emoji="🌤️"
            />
            <QualificationBar
              label="Cold Leads"
              value={stats.cold}
              total={stats.total}
              color="bg-gray-500"
              emoji="❄️"
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Status Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusCard
              label="New"
              value={stats.total - stats.contacted - stats.converted}
              color="bg-blue-100 text-blue-800"
            />
            <StatusCard
              label="Contacted"
              value={stats.contacted}
              color="bg-yellow-100 text-yellow-800"
            />
            <StatusCard
              label="Converted"
              value={stats.converted}
              color="bg-green-100 text-green-800"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'red' | 'orange' | 'gray';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  const bgColors = {
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    orange: 'bg-orange-50',
    gray: 'bg-gray-50',
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-6 border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
};

interface PerformanceCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend: 'up' | 'down';
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600 mt-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          {trend === 'up' && (
            <TrendingUp className="text-green-500" size={24} />
          )}
        </div>
      </div>
    </div>
  );
};

interface QualificationBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  emoji: string;
}

const QualificationBar: React.FC<QualificationBarProps> = ({
  label,
  value,
  total,
  color,
  emoji,
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {emoji} {label}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface StatusCardProps {
  label: string;
  value: number;
  color: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ label, value, color }) => {
  return (
    <div className={`${color} rounded-lg p-4 text-center`}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
