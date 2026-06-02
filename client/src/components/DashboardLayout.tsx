import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const { client, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-xl font-bold">LQP</h2>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-4">
          <NavLink
            to="/dashboard"
            label="Dashboard"
            icon="📊"
            open={sidebarOpen}
          />
          <NavLink
            to="/leads"
            label="Leads"
            icon="📧"
            open={sidebarOpen}
          />
          <NavLink
            to="/analytics"
            label="Analytics"
            icon="📈"
            open={sidebarOpen}
          />
          <NavLink
            to="/settings"
            label="Settings"
            icon="⚙️"
            open={sidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-gray-700">
          {sidebarOpen && (
            <div className="mb-4">
              <p className="text-xs text-gray-400">Logged in as</p>
              <p className="text-sm font-medium truncate">{client?.name}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded hover:bg-gray-800 transition"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{client?.email}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

interface NavLinkProps {
  to: string;
  label: string;
  icon: string;
  open: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, icon, open }) => {
  const isActive = window.location.pathname === to;

  return (
    <a
      href={to}
      className={`flex items-center gap-3 px-4 py-2 rounded transition ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {open && <span>{label}</span>}
    </a>
  );
};
