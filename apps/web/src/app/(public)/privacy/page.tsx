export const metadata = { title: "Privacy Policy — CloudSourceHRM" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-10">Last updated: May 21, 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Who We Are</h2>
          <p>
            CloudSourceHRM is a recruiter member portal operated by <strong>SHIRO Technologies LLC</strong>
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). We are part of the CHRM NEXUS ecosystem and provide
            tools for recruiters to manage contacts, send requirements, and build candidate hotlists.
          </p>
          <p className="mt-2">
            Our registered address is on file with the state of our incorporation. For privacy-related inquiries,
            contact us at <a href="mailto:privacy@shirotechnologies.com" className="text-pub-600 hover:underline">privacy@shirotechnologies.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
          <p>We collect information in the following ways:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Account information:</strong> Your name, email address, and password when you register.</li>
            <li><strong>Profile and billing:</strong> Subscription tier, payment method details (processed by Stripe — we never store raw card numbers), and billing address.</li>
            <li><strong>Contact data you upload:</strong> CSV or Excel files of employer/candidate contacts you import into the platform. This data is stored on your behalf.</li>
            <li><strong>Requirement data:</strong> Email subjects, body content, recipient lists, and engagement metrics (opens, delivery status).</li>
            <li><strong>Usage data:</strong> Pages visited, features used, timestamps, and browser/device information collected via standard server logs and analytics.</li>
            <li><strong>Communications:</strong> Messages you send us via the contact form or email.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide, maintain, and improve the CloudSourceHRM platform.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To send transactional emails (account confirmations, password resets, billing receipts).</li>
            <li>To deliver the requirements you create within the platform.</li>
            <li>To respond to your support requests.</li>
            <li>To detect fraud, abuse, or security incidents.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p className="mt-3">We do <strong>not</strong> sell your personal data to third parties. We do not use your contact database for our own marketing.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. How We Share Your Information</h2>
          <p>We share data only with service providers necessary to operate the platform:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Neon (database hosting):</strong> Your data is stored in a PostgreSQL database hosted on Neon&apos;s infrastructure.</li>
            <li><strong>Stripe:</strong> Payment processing. Stripe stores payment method details under their own privacy policy.</li>
            <li><strong>Resend / AhaSend:</strong> Email delivery providers used to send campaigns and transactional emails on your behalf.</li>
            <li><strong>Railway:</strong> Cloud hosting for our application servers.</li>
          </ul>
          <p className="mt-3">All providers are contractually bound to use your data only as directed by us.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. If you cancel your account,
            we will delete your data within 30 days, except where we are required to retain it for legal
            or tax purposes (typically up to 7 years for financial records).
          </p>
          <p className="mt-2">
            Contact records and campaign data you upload are retained until you delete them or close your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Security</h2>
          <p>
            We use industry-standard security practices including TLS encryption in transit, encrypted
            database connections, HMAC-signed tracking tokens, and role-based access controls.
            No system is 100% secure; if you become aware of any security issue, please contact us immediately at{" "}
            <a href="mailto:security@shirotechnologies.com" className="text-pub-600 hover:underline">security@shirotechnologies.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;).</li>
            <li>Object to or restrict certain processing activities.</li>
            <li>Data portability (receive your data in a machine-readable format).</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@shirotechnologies.com" className="text-pub-600 hover:underline">privacy@shirotechnologies.com</a>.
            We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Cookies</h2>
          <p>
            We use session cookies strictly necessary for authentication. We do not use advertising
            cookies or third-party tracking pixels beyond the email open-tracking pixel embedded in
            campaigns (which you control as the sender).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Children&apos;s Privacy</h2>
          <p>
            CloudSourceHRM is a professional B2B tool intended for users 18 years and older.
            We do not knowingly collect data from minors. If you believe we have inadvertently
            collected such data, contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this policy periodically. When we do, we will update the &ldquo;Last updated&rdquo; date
            at the top of this page and, for material changes, notify you via email or an in-app notice.
            Continued use of the platform after changes constitutes your acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Contact Us</h2>
          <p>
            For any privacy-related questions or requests, reach us at:
          </p>
          <address className="not-italic mt-2 space-y-1 text-slate-600">
            <p><strong>SHIRO Technologies LLC</strong></p>
            <p>Email: <a href="mailto:privacy@shirotechnologies.com" className="text-pub-600 hover:underline">privacy@shirotechnologies.com</a></p>
            <p>Website: <a href="https://shirotechnologies.com" className="text-pub-600 hover:underline" target="_blank">shirotechnologies.com</a></p>
          </address>
        </section>

      </div>
    </div>
  );
}
