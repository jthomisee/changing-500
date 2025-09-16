import React from 'react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="prose prose-lg text-gray-700 space-y-6">
            <p className="text-sm text-gray-500 mb-8">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>

              <h3 className="text-lg font-medium text-gray-800 mb-2">Personal Information</h3>
              <p>When you register for Changing 500, we collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name (first and last)</li>
                <li>Email address</li>
                <li>Phone number (optional, for SMS notifications)</li>
                <li>Timezone preference</li>
                <li>Password (encrypted and stored securely)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Usage Information</h3>
              <p>We automatically collect information about your use of the Service, including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Game participation and results</li>
                <li>RSVP responses and preferences</li>
                <li>Notification preferences</li>
                <li>Login activity and timestamps</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Technical Information</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP addresses</li>
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>Usage analytics and performance data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Provide the Service:</strong> Manage poker games, track results, and facilitate group communication</li>
                <li><strong>Send Notifications:</strong> Deliver game invitations, results, and updates via SMS and email when you opt-in</li>
                <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and performance</li>
                <li><strong>Security:</strong> Protect against fraud, abuse, and unauthorized access</li>
                <li><strong>Legal Compliance:</strong> Meet legal obligations and respond to lawful requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>

              <h3 className="text-lg font-medium text-gray-800 mb-2">Within Poker Groups</h3>
              <p>
                When you join a poker group, certain information is shared with other group members, including:
                your name, game participation, and results. This is essential for the functionality of the Service.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Third-Party Service Providers</h3>
              <p>We may share information with trusted third parties who help us operate the Service:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>AWS:</strong> Cloud hosting and database services</li>
                <li><strong>Twilio:</strong> SMS message delivery</li>
                <li><strong>Email Service Providers:</strong> Email notification delivery</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Legal Requirements</h3>
              <p>We may disclose information if required by law or to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Comply with legal obligations</li>
                <li>Protect our rights and property</li>
                <li>Prevent fraud or abuse</li>
                <li>Protect user safety</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">What We Don't Share</h3>
              <p>We do not:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sell your personal information to advertisers or third parties</li>
                <li>Share your contact information outside your poker groups without consent</li>
                <li>Use your information for advertising or marketing unrelated to the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. SMS and Communication Privacy</h2>

              <h3 className="text-lg font-medium text-gray-800 mb-2">SMS Notifications</h3>
              <p>If you opt-in to SMS notifications:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We use your phone number solely to send game-related messages</li>
                <li>We partner with Twilio for message delivery</li>
                <li>Message and data rates may apply from your carrier</li>
                <li>You can opt-out anytime by replying "STOP" or updating your preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4">Email Communications</h3>
              <p>Email notifications are sent through secure email services and include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Game invitations and RSVP links</li>
                <li>Results notifications</li>
                <li>Important service updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p>We implement security measures to protect your information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
                <li><strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis</li>
                <li><strong>Secure Infrastructure:</strong> Hosted on AWS with enterprise-grade security</li>
                <li><strong>Password Protection:</strong> Passwords are hashed and never stored in plain text</li>
              </ul>
              <p>
                While we strive to protect your information, no method of transmission over the internet is 100% secure.
                We cannot guarantee absolute security but are committed to protecting your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p>We retain your information as long as:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your account is active</li>
                <li>Necessary to provide the Service</li>
                <li>Required for legal, tax, or accounting purposes</li>
              </ul>
              <p>
                When you delete your account, we will delete your personal information within 30 days,
                except for information we are required to retain by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Privacy Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Update:</strong> Correct or update your information through your account settings</li>
                <li><strong>Delete:</strong> Request deletion of your account and personal information</li>
                <li><strong>Opt-Out:</strong> Disable SMS and email notifications at any time</li>
                <li><strong>Data Portability:</strong> Request your data in a portable format</li>
              </ul>
              <p>To exercise these rights, contact us through the Service or your account settings.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Keep you logged in</li>
                <li>Remember your preferences</li>
                <li>Analyze usage patterns</li>
                <li>Improve service performance</li>
              </ul>
              <p>You can control cookies through your browser settings, but disabling them may affect service functionality.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
              <p>
                Changing 500 is not intended for users under 18 years of age. We do not knowingly collect personal information
                from children under 18. If we become aware that a child under 18 has provided personal information,
                we will delete such information immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Posting the updated policy on this page</li>
                <li>Sending you an email notification (if you've provided an email address)</li>
                <li>Providing notice through the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our privacy practices,
                please contact us through the Service or visit our support page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;