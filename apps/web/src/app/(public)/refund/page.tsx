export const metadata = { title: "Refund Policy — CloudSourceHRM" };

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Refund Policy</h1>
      <p className="text-sm text-slate-500 mb-10">Last updated: May 12, 2025</p>

      <div className="space-y-8 text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Overview</h2>
          <p>
            This Refund Policy applies to all paid subscriptions purchased through CloudSourceHRM,
            operated by <strong>SHIRO Technologies LLC</strong>. We want you to be satisfied with
            the Service, and we&apos;ll do our best to resolve any issues before a refund becomes necessary.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Subscription Cancellations</h2>
          <p>
            You may cancel your subscription at any time from your account Settings page. Upon cancellation:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Your subscription will remain active until the end of the current billing period.</li>
            <li>You will not be charged for the following billing period.</li>
            <li>No partial refund is issued for the unused portion of the current billing period.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. 7-Day Money-Back Guarantee</h2>
          <p>
            If you are a <strong>first-time subscriber</strong> to the Standard plan and are not
            satisfied with the Service, you may request a full refund within <strong>7 days</strong> of
            your initial payment. To request a refund under this guarantee:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Email us at <a href="mailto:billing@shirotechnologies.com" className="text-pub-600 hover:underline">billing@shirotechnologies.com</a> within 7 days of your first charge.</li>
            <li>Include the email address associated with your account and the reason for your request.</li>
            <li>We will process the refund within 5–10 business days to your original payment method.</li>
          </ul>
          <p className="mt-3">
            This guarantee applies to the first subscription payment only and does not apply to
            renewals, add-ons, or accounts that have violated our Terms of Use.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Refunds for Service Outages</h2>
          <p>
            If the Service experiences a significant outage (defined as unavailability exceeding 24
            consecutive hours in a billing period) due to our infrastructure, you may be eligible for
            a pro-rated credit toward your next billing period. Service disruptions caused by third-party
            providers (email delivery, payment processors, database hosting) or events outside our
            reasonable control are not eligible for refunds.
          </p>
          <p className="mt-2">
            To report an outage or request a credit, contact{" "}
            <a href="mailto:support@shirotechnologies.com" className="text-pub-600 hover:underline">support@shirotechnologies.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Add-On Purchases (CHRMNEXUS)</h2>
          <p>
            Add-on subscriptions (such as the CHRMNEXUS Job Board access) are subject to the same
            cancellation and refund terms as the base Standard plan. The 7-day money-back guarantee
            applies to the first add-on payment if purchased separately from the base plan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Exceptions — No Refunds</h2>
          <p>Refunds will not be issued in the following circumstances:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Subscription renewals after the initial payment (unless covered by the 7-day guarantee).</li>
            <li>Accounts suspended or terminated for violations of our Terms of Use.</li>
            <li>Requests made after 7 days from the initial charge (unless under a service outage claim).</li>
            <li>Failure to cancel before the renewal date.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. How Refunds Are Processed</h2>
          <p>
            Approved refunds are processed via Stripe to the original payment method used at purchase.
            Processing time is typically 5–10 business days, depending on your card issuer. We will
            send a confirmation email once the refund is initiated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Contact Us</h2>
          <p>
            For all billing and refund inquiries:
          </p>
          <address className="not-italic mt-2 space-y-1 text-slate-600">
            <p><strong>SHIRO Technologies LLC — Billing</strong></p>
            <p>Email: <a href="mailto:billing@shirotechnologies.com" className="text-pub-600 hover:underline">billing@shirotechnologies.com</a></p>
            <p>General support: <a href="mailto:support@shirotechnologies.com" className="text-pub-600 hover:underline">support@shirotechnologies.com</a></p>
          </address>
        </section>

      </div>
    </div>
  );
}
