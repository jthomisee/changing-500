import React from 'react';
import { useScrollToTop } from '../hooks/useScrollToTop';

const SMSVerificationPage = () => {
  useScrollToTop();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              SMS Consent Verification - Changing 500
            </h1>
            <p className="text-gray-600 text-lg">
              This page provides verification of our SMS opt-in processes for
              compliance with Twilio A2P 10DLC requirements.
            </p>
          </div>

          {/* Registration Form Screenshot Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Registration Form SMS Consent
            </h2>
            <p className="text-gray-600 mb-6">
              During account registration at changing500.com, users must
              explicitly consent to SMS notifications by checking the consent
              checkbox and providing their mobile phone number.
            </p>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Registration Form Screenshot
                </h3>
                <p className="text-sm text-gray-600">
                  Screenshot showing SMS consent checkbox during user
                  registration
                </p>
              </div>
              <div className="p-4">
                <img
                  src="/images/sms-compliance/registration-consent.png"
                  alt="Registration form showing SMS consent checkbox"
                  className="w-full border border-gray-200 rounded shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center hidden">
                  <p className="text-blue-800 mb-2">
                    <strong>Screenshot will be displayed here</strong>
                  </p>
                  <p className="text-sm text-blue-600">
                    Please upload registration-consent.png to
                    /frontend/public/images/sms-compliance/
                  </p>
                  <div className="bg-white border border-blue-300 rounded p-3 text-left mt-3">
                    <div className="font-medium text-gray-900 mb-2">
                      Exact consent language shown to users:
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" disabled />
                      <span>
                        I consent to receive SMS notifications from Changing 500
                        about game invitations and results. Message frequency
                        may vary. Message and data rates may apply. Reply STOP
                        to opt out.
                        <a
                          href="/terms"
                          className="text-blue-600 underline ml-1"
                        >
                          Terms
                        </a>{' '}
                        |
                        <a
                          href="/privacy"
                          className="text-blue-600 underline ml-1"
                        >
                          Privacy
                        </a>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Settings Screenshot Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Profile Settings SMS Preferences
            </h2>
            <p className="text-gray-600 mb-6">
              After registration, users can manage their SMS notification
              preferences in their profile settings, with separate controls for
              different notification types.
            </p>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Profile Settings Screenshot
                </h3>
                <p className="text-sm text-gray-600">
                  Screenshot showing SMS preference controls in user profile
                </p>
              </div>
              <div className="p-4">
                <img
                  src="/images/sms-compliance/profile-settings.png"
                  alt="Profile settings showing SMS notification preferences"
                  className="w-full border border-gray-200 rounded shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center hidden">
                  <p className="text-blue-800 mb-2">
                    <strong>Screenshot will be displayed here</strong>
                  </p>
                  <p className="text-sm text-blue-600">
                    Please upload profile-settings.png to
                    /frontend/public/images/sms-compliance/
                  </p>
                  <div className="bg-white border border-blue-300 rounded p-3 text-left mt-3">
                    <div className="font-medium text-gray-900 mb-2">
                      SMS Notification Preferences:
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" disabled />
                        <span>
                          SMS Game Invitations from Changing 500
                          <br />
                          <span className="text-gray-600 text-xs">
                            Message and data rates may apply. Reply STOP to opt
                            out.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" disabled />
                        <span>
                          SMS Game Results from Changing 500
                          <br />
                          <span className="text-gray-600 text-xs">
                            Message and data rates may apply. Reply STOP to opt
                            out.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Compliance Information
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                Required Disclosures Provided:
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li>
                  • <strong>Brand Identification:</strong> "Changing 500"
                  clearly identified in all communications
                </li>
                <li>
                  • <strong>Message Frequency:</strong> Event-based (game
                  invitations and results as they occur)
                </li>
                <li>
                  • <strong>Terms of Service:</strong> Available at{' '}
                  <a href="/terms" className="underline">
                    changing500.com/terms
                  </a>
                </li>
                <li>
                  • <strong>Privacy Policy:</strong> Available at{' '}
                  <a href="/privacy" className="underline">
                    changing500.com/privacy
                  </a>
                </li>
                <li>
                  • <strong>Cost Disclosure:</strong> "Message and data rates
                  may apply" prominently displayed
                </li>
                <li>
                  • <strong>Opt-out Instructions:</strong> "Reply STOP to opt
                  out" + profile settings management
                </li>
              </ul>
            </div>
          </div>

          {/* Opt-out Methods */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Opt-out Methods
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-3">
                Users can opt out through:
              </h3>
              <ul className="space-y-2 text-green-800">
                <li>
                  • <strong>Text Reply:</strong> Reply STOP to any message for
                  immediate unsubscribe
                </li>
                <li>
                  • <strong>Profile Settings:</strong> Manage preferences at
                  changing500.com/profile
                </li>
                <li>
                  • <strong>Customer Support:</strong> Contact us through the
                  website
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              This verification page is publicly accessible for Twilio A2P 10DLC
              compliance review. Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSVerificationPage;
