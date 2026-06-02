import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Copy, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { client } = useAuth();
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        setClientInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch client info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientInfo();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const webhookUrl = clientInfo
    ? `${window.location.origin}/api/webhooks/email?token=${clientInfo.token}`
    : '';

  if (isLoading) {
    return (
      <DashboardLayout title="Settings">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-8">
        {/* Account Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <p className="text-lg text-gray-900">{clientInfo?.businessName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <p className="text-lg text-gray-900">{clientInfo?.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Created
              </label>
              <p className="text-lg text-gray-900">
                {new Date(clientInfo?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Email Integration Setup */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Integration Setup</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="border-l-4 border-indigo-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Step 1: Copy Your Webhook URL
              </h3>
              <p className="text-gray-600 mb-4">
                This URL receives all your incoming leads. Copy it and set up email forwarding.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <code className="text-sm text-gray-900 break-all">{webhookUrl}</code>
                <button
                  onClick={() => copyToClipboard(webhookUrl)}
                  className="ml-4 flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                >
                  {copied ? (
                    <>
                      <Check size={16} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-l-4 border-indigo-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Step 2: Set Up Email Forwarding
              </h3>
              <p className="text-gray-600 mb-4">
                Forward your lead emails to our webhook URL. Here's how:
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">For Gmail:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Go to Gmail Settings</li>
                    <li>Click "Forwarding and POP/IMAP"</li>
                    <li>Click "Add a forwarding address"</li>
                    <li>Enter: <code className="bg-white px-2 py-1 rounded">webhook@leadqualifierpro.com</code></li>
                    <li>Confirm the forwarding address</li>
                    <li>Select "Forward all mail to webhook@leadqualifierpro.com"</li>
                    <li>Save changes</li>
                  </ol>
                </div>

                <div className="pt-3 border-t border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">For Outlook:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Go to Settings → Mail → Forwarding</li>
                    <li>Enable "Start forwarding"</li>
                    <li>Enter: <code className="bg-white px-2 py-1 rounded">webhook@leadqualifierpro.com</code></li>
                    <li>Choose whether to keep a copy</li>
                    <li>Save</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-l-4 border-indigo-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Step 3: Send Your First Lead
              </h3>
              <p className="text-gray-600 mb-4">
                Once forwarding is set up, send a test email to your account. Our system will:
              </p>

              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">1.</span>
                  Receive the email via webhook
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">2.</span>
                  Analyze it with AI
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">3.</span>
                  Score it (Hot/Warm/Cold)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">4.</span>
                  Generate a follow-up email
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">5.</span>
                  Display it in your dashboard
                </li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="border-l-4 border-indigo-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Step 4: View Your Dashboard
              </h3>
              <p className="text-gray-600">
                Go to the <strong>Leads</strong> page to see all your incoming leads with AI scores and follow-ups.
              </p>
            </div>
          </div>
        </div>

        {/* API Token */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API Token</h2>

          <p className="text-gray-600 mb-4">
            Your unique API token for authentication. Keep this secret!
          </p>

          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <code className="text-sm text-gray-900 break-all">{clientInfo?.token}</code>
            <button
              onClick={() => copyToClipboard(clientInfo?.token)}
              className="ml-4 flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
            >
              {copied ? (
                <>
                  <Check size={16} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
          <p className="text-gray-700 mb-4">
            If you have questions about setting up email forwarding or using Lead Qualifier Pro, 
            please contact our support team.
          </p>
          <a
            href="mailto:support@leadqualifierpro.com"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
          >
            Contact Support
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
};
