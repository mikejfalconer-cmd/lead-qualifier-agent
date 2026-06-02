import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter your webhook token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(token);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid webhook token. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lead Qualifier Pro</h1>
          <p className="text-gray-600 mt-2">Client Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your webhook token"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Your webhook token was provided when you signed up
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
          <p className="text-xs text-gray-600 text-center">
            New to Lead Qualifier Pro?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Create an account
            </button>
          </p>
          <p className="text-xs text-gray-600 text-center">
            Need help? Contact support at support@leadqualifierpro.com
          </p>
        </div>
      </div>
    </div>
  );
};
