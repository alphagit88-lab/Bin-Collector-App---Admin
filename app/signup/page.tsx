'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('customer');
  const [supplierType, setSupplierType] = useState<'commercial' | 'residential' | 'commercial_residential' | ''>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, signup } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <main className="py-20 min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Don't render form if already authenticated (will redirect)
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'supplier' && !supplierType) {
      setError('Please select supplier type');
      return;
    }

    setLoading(true);

    const result = await signup(
      name,
      phone,
      email || undefined,
      role,
      password,
      role === 'supplier' ? supplierType || undefined : undefined
    );
    setLoading(false);

    if (result.success) {
      showToast('Account created successfully!', 'success');
      router.push('/dashboard');
    } else {
      setError(result.message || 'Signup failed. Please check your information.');
    }
  };

  return (
    <main className="py-20 min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-black mb-2">Sign Up</h1>
          <p className="text-gray-600 text-sm">
            Create your BinRental account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-black mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
              placeholder="+1234567890"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
              Email Address <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`h-10 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                  role === 'customer'
                    ? 'bg-[#10B981] text-white border-[#10B981]'
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('supplier');
                  if (!supplierType) {
                    setSupplierType('commercial');
                  }
                }}
                className={`h-10 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                  role === 'supplier'
                    ? 'bg-[#10B981] text-white border-[#10B981]'
                    : 'bg-white text-black border-gray-300 hover:border-gray-400'
                }`}
              >
                Supplier
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Admin accounts can only be created by existing administrators
            </p>
          </div>

          {role === 'supplier' && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Supplier Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSupplierType('commercial')}
                  className={`h-10 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    supplierType === 'commercial'
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Commercial
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierType('residential')}
                  className={`h-10 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    supplierType === 'residential'
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => setSupplierType('commercial_residential')}
                  className={`h-10 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    supplierType === 'commercial_residential'
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2' }}
                >
                  Commercial / Residential
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-[#10B981] text-white font-medium hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-[#10B981] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
