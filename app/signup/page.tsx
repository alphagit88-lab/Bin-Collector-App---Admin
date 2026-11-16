'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { normalizePassword, validatePassword } from '@/lib/passwordValidation';
import PasswordRequirements from '@/components/PasswordRequirements';
import PasswordInput from '@/components/PasswordInput';
import { normalizeCanadianPhone, validateCanadianPhone } from '@/lib/phoneValidation';

function SignupContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const roleParam = searchParams.get('role');
  const typeParam = searchParams.get('type');
  const isSupplierParam = roleParam === 'supplier' || typeParam === 'supplier';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(isSupplierParam ? 'supplier' : 'customer');
  const [supplierType, setSupplierType] = useState<'commercial' | 'residential' | 'commercial_residential' | ''>(
    isSupplierParam ? 'commercial' : ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, signup } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Ensure role and default supplierType stay synced if query params change
  useEffect(() => {
    if (isSupplierParam) {
      setRole('supplier');
      setSupplierType((prev) => prev || 'commercial');
    }
  }, [isSupplierParam]);

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

    const phoneError = validateCanadianPhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (normalizePassword(password) !== normalizePassword(confirmPassword)) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await signup(
      name,
      normalizeCanadianPhone(phone),
      email || undefined,
      role,
      normalizePassword(password),
      role === 'supplier' ? supplierType || undefined : undefined
    );
    setLoading(false);

    if (result.success) {
      showToast(result.message || 'Account created successfully!', 'success');
      if (role === 'supplier') {
        router.push('/login');
        return;
      }
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(result.message || 'Signup failed. Please check your information.');
    }
  };

  const formContent = (
    <>
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
            placeholder="+14165550123"
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

        {!isSupplierParam && (
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
        )}

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
          <PasswordRequirements password={password} />
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
            placeholder="Enter your password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-2">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-10 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
            placeholder="Confirm your password"
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
          <Link href={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login"} className="text-[#10B981] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );

  if (isSupplierParam) {
    return (
      <main className="min-h-screen py-8 lg:py-12 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-[1140px] w-full bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col lg:flex-row lg:h-[840px] lg:max-h-[92vh]">
          {/* Left Column: Fixed / Static Marketing Info */}
          <div className="lg:w-[48%] bg-[#f4fbf9] p-8 sm:p-12 lg:p-14 xl:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[#d4ece6] shrink-0 lg:h-full lg:overflow-hidden select-none">
            <div className="max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-3 mb-8 sm:mb-10">
                <div className="w-1.5 h-9 bg-[#4fb7af] rounded-full shrink-0" />
                <div className="text-xs sm:text-sm font-bold tracking-wider text-[#148e7a] uppercase leading-snug">
                  Operations Software for<br />Rental Businesses
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#00152c] leading-[1.15] tracking-tight mb-6">
                Run Your<br />
                Operations for Just<br />
                <span className="text-[#239085]">$50/User/Month.</span>
              </h1>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                Manage bookings, dispatch drivers, track equipment, organize customers, and simplify billing—all from one easy-to-use platform.
              </p>
            </div>
          </div>

          {/* Right Column: Scrollable Signup Form */}
          <div className="lg:w-[52%] flex-1 lg:h-full lg:overflow-y-auto p-6 sm:p-10 lg:p-12 flex flex-col justify-start">
            <div className="max-w-md w-full mx-auto my-auto py-2">
              <div className="mb-8 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-black mb-2">Sign Up</h2>
                <p className="text-gray-600 text-sm">
                  Create your Bin Drop account
                </p>
              </div>
              {formContent}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="py-20 min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-black mb-2">Sign Up</h1>
          <p className="text-gray-600 text-sm">
            Create your Bin Drop account
          </p>
        </div>
        {formContent}
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <main className="py-20 min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <SignupContent />
    </Suspense>
  );
}
