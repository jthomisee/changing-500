import React from 'react';
import { useScrollToTop } from '../hooks/useScrollToTop';

const TermsPage = () => {
  useScrollToTop();
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-lg text-gray-700 space-y-6">
            <p className="text-sm text-gray-500 mb-8">
              <strong>Last Updated:</strong>{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using Changing 500 ("the Service"), you accept
                and agree to be bound by the terms and provision of this
                agreement. If you do not agree to abide by the above, please do
                not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                2. Description of Service
              </h2>
              <p>
                Changing 500 is a private poker game management platform that
                helps poker groups organize games, manage RSVPs, track results,
                and facilitate communication between group members. The Service
                is intended for private, recreational poker games among
                consenting adults.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. User Accounts and Registration
              </h2>
              <p>
                To use certain features of the Service, you must register for an
                account. You agree to provide accurate, current, and complete
                information during registration and to update such information
                as needed to keep it accurate, current, and complete.
              </p>
              <p>
                You are responsible for safeguarding your password and for all
                activities that occur under your account. You agree to notify us
                immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                4. SMS and Communication Services
              </h2>
              <p>
                By providing your mobile phone number and opting into SMS
                notifications, you consent to receive text messages from
                Changing 500 regarding:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Game invitations and RSVP requests</li>
                <li>Game results and updates</li>
                <li>Service-related communications</li>
              </ul>
              <p>
                <strong>Message Frequency:</strong> You may receive
                approximately 1-3 messages per week, depending on your poker
                group activity.
              </p>
              <p>
                <strong>Message and Data Rates:</strong> Standard message and
                data rates may apply. Check with your mobile carrier for
                details.
              </p>
              <p>
                <strong>Opt-Out:</strong> You can opt out of SMS communications
                at any time by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Replying "STOP" to any text message</li>
                <li>
                  Updating your notification preferences in your account
                  settings
                </li>
              </ul>
              <p>
                <strong>Help:</strong> For support, reply "HELP" to any message
                or visit our website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                5. Acceptable Use
              </h2>
              <p>
                You agree to use the Service only for lawful purposes and in
                accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal gambling activities</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Upload or transmit any malicious software or content</li>
                <li>
                  Attempt to gain unauthorized access to the Service or other
                  users' accounts
                </li>
                <li>
                  Use the Service in any way that violates applicable laws or
                  regulations
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                6. Privacy and Data Protection
              </h2>
              <p>
                Your privacy is important to us. Please review our Privacy
                Policy, which also governs your use of the Service, to
                understand our practices regarding the collection and use of
                your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                7. Intellectual Property
              </h2>
              <p>
                The Service and its original content, features, and
                functionality are owned by Changing 500 and are protected by
                international copyright, trademark, patent, trade secret, and
                other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                8. Disclaimer of Warranties
              </h2>
              <p>
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis.
                We make no warranties, expressed or implied, and hereby disclaim
                all other warranties including without limitation, implied
                warranties of merchantability, fitness for a particular purpose,
                or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                9. Limitation of Liability
              </h2>
              <p>
                In no event shall Changing 500, its directors, employees,
                partners, agents, suppliers, or affiliates be liable for any
                indirect, incidental, punitive, consequential, or similar
                damages arising out of or related to your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                10. Termination
              </h2>
              <p>
                We may terminate or suspend your account and access to the
                Service immediately, without prior notice or liability, for any
                reason, including if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                11. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify or replace these Terms at any
                time. If a revision is material, we will provide at least 30
                days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                12. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms, please contact us
                through the Service or visit our support page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
