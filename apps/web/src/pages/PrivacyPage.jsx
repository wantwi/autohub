export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Privacy Policy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: March 2026</p>
      </div>

      <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:tracking-tight prose-p:leading-relaxed">
        <h2>1. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul>
          <li><strong>Account information:</strong> Name, phone number, email address</li>
          <li><strong>Profile data:</strong> Avatar, vehicle information, business details (for dealers/technicians)</li>
          <li><strong>Communications:</strong> Messages sent through the in-app chat</li>
          <li><strong>Location data:</strong> When you choose to share your location in chat</li>
          <li><strong>Transaction data:</strong> Order history, payment references, booking details</li>
          <li><strong>Usage data:</strong> How you interact with the Platform</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and improve the Platform's services</li>
          <li>Facilitate communication between buyers, dealers, and technicians</li>
          <li>Process transactions and bookings</li>
          <li>Send notifications about your account activity</li>
          <li>Ensure platform safety and prevent fraud</li>
          <li>Provide customer support</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>We share your information only in the following circumstances:</p>
        <ul>
          <li><strong>With other users:</strong> Your name and contact info are shared with dealers/technicians when you initiate a conversation or booking</li>
          <li><strong>Payment processors:</strong> Transaction details with our payment providers (Paystack)</li>
          <li><strong>Cloud services:</strong> Media uploads are stored on Cloudinary</li>
          <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
        </ul>

        <h2>4. Data Storage and Security</h2>
        <p>
          Your data is stored securely using industry-standard encryption and security practices.
          We use Supabase (PostgreSQL) for data storage with SSL-encrypted connections.
        </p>

        <h2>5. Voice Notes and Media</h2>
        <p>
          Voice notes and media shared in chat are uploaded to secure cloud storage. They are accessible
          only to participants in the conversation. You can delete conversations from your view at any time.
        </p>

        <h2>6. Push Notifications</h2>
        <p>
          If you enable push notifications, we store a subscription token to send you alerts.
          You can disable notifications at any time through your browser settings.
        </p>

        <h2>7. Location Data</h2>
        <p>
          Location sharing in chat is optional and requires your explicit permission each time.
          We do not track your location in the background.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your account and data</li>
          <li>Opt out of notifications</li>
        </ul>

        <h2>9. Data Retention</h2>
        <p>
          We retain your data as long as your account is active. If you request account deletion,
          we will remove your personal data within 30 days, except where retention is required by law.
        </p>

        <h2>10. Children's Privacy</h2>
        <p>
          AutoHub is not intended for users under 18 years of age. We do not knowingly collect
          information from children.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify you of significant changes
          through the Platform.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          For privacy-related questions, contact us through the feedback form in the app
          or email <strong>privacy@autohub.com.gh</strong>.
        </p>
      </div>
    </div>
  )
}
