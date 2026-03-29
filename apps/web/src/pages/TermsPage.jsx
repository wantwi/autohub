export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Terms of Service</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: March 2026</p>
      </div>

      <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:tracking-tight prose-p:leading-relaxed">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using AutoHub Ghana ("the Platform"), you agree to be bound by these Terms of Service.
          If you do not agree with any part of these terms, you may not use the Platform.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          AutoHub is a marketplace platform connecting car owners with auto parts dealers and service technicians in Ghana.
          The Platform facilitates discovery, communication, bookings, and transactions between buyers, dealers, and technicians.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You must provide accurate and complete information when creating an account. You are responsible for maintaining
          the confidentiality of your account credentials and for all activities that occur under your account.
        </p>

        <h2>4. User Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for any unlawful purpose</li>
          <li>Post false, misleading, or fraudulent content</li>
          <li>Harass, abuse, or threaten other users</li>
          <li>Interfere with or disrupt the Platform's operations</li>
          <li>Attempt to gain unauthorized access to any part of the Platform</li>
        </ul>

        <h2>5. Marketplace Transactions</h2>
        <p>
          AutoHub facilitates transactions between buyers and sellers but is not a party to any transaction.
          We do not guarantee the quality, safety, or legality of items listed. Buyers and sellers are responsible
          for fulfilling their respective obligations.
        </p>

        <h2>6. Service Bookings</h2>
        <p>
          When booking a technician through the Platform, you enter into a direct agreement with the technician.
          AutoHub is not responsible for the quality of work performed by technicians.
        </p>

        <h2>7. Payments</h2>
        <p>
          Payments are processed through third-party payment providers. AutoHub does not store your payment card
          details. All transactions are subject to the payment provider's terms.
        </p>

        <h2>8. Content and Intellectual Property</h2>
        <p>
          You retain ownership of content you post on the Platform. By posting content, you grant AutoHub a
          non-exclusive license to use, display, and distribute that content on the Platform.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          AutoHub is provided "as is" without warranties of any kind. We are not liable for any indirect,
          incidental, or consequential damages arising from your use of the Platform.
        </p>

        <h2>10. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account at any time for violation of these terms
          or for any other reason at our discretion.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of the Platform after changes constitutes
          acceptance of the revised terms.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these terms, please contact us through the feedback form in the app
          or email <strong>support@autohub.com.gh</strong>.
        </p>
      </div>
    </div>
  )
}
