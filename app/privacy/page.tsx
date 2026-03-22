import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - BinCollect',
  description: 'Privacy Policy and Terms of Use for BinCollect Waste Management Platform',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Header Section */}
        <div className="bg-[#9AD346] px-8 py-10 text-white text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-white/80 font-medium tracking-wide">
            BinCollect: Smart Bin Management. Simplified.
          </p>
          <div className="mt-4 inline-block px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
            Last Updated: {lastUpdated}
          </div>
        </div>

        {/* Content Section */}
        <div className="px-8 py-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-[#9AD346]/30 pb-2 mb-4">
              Introduction
            </h2>
            <p>
              Welcome to **BinCollect**. Your privacy is important to us. This Privacy Policy explains how we collect,
              use, and protect your information when you use our mobile application and web dashboard. 
              By using our platform, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-[#9AD346]/30 pb-2 mb-4">
              Information We Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Information:</strong> Name, Phone Number, and Address for order placement and identity verification.</li>
              <li><strong>Auth Credentials:</strong> Encrypted passwords for secure account access.</li>
              <li><strong>Transaction Data:</strong> Payment confirmation details for bin rental services.</li>
            </ul>
          </section>

          <section className="bg-green-50/50 p-6 rounded-xl border border-green-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-[#29B554]">📸</span> Device Permissions
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-800">Camera Permission</h3>
                <p className="text-sm">
                  We require access to your camera to allow Suppliers and Drivers to capture <strong>Proof of Delivery</strong> 
                  or bin placement photos. These photos are used to resolve disputes and verify successful service completion.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Location Access</h3>
                <p className="text-sm">
                  We use your location to help drivers navigate to the correct delivery address 
                  and to allow customers to accurately drop a pin for bin placement.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-[#9AD346]/30 pb-2 mb-4">
              How We Use Your Data
            </h2>
            <p>
              We use the collected information for:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Facilitating the booking and delivery of waste bins.</li>
              <li>Notifying you about the status of your orders.</li>
              <li>Improving our fleet management and route optimization.</li>
              <li>Providing support to customers, drivers, and suppliers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-[#9AD346]/30 pb-2 mb-4">
              Data Protection & Sharing
            </h2>
            <p>
              We do not sell your personal data to third parties. We only share information with authorized 
              service providers (e.g., drivers assigned to your job) to ensure the service is fulfilled. 
              All communication between your device and our servers is encrypted using industry-standard protocols.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-[#9AD346]/30 pb-2 mb-4">
              Your Rights
            </h2>
            <p>
              You have the right to access, correct, or request the deletion of your personal data at any time. 
              For any privacy-related inquiries, please contact our support team.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} BinCollect. All rights reserved.
        </div>
      </div>
    </div>
  );
}
