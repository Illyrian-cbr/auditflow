import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function PartnersPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-navy text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">White-Label Auditflow for Your Clients</h1>
          <p className="text-xl text-white/80 mb-10">
            Your brand. Your clients. Our AI. Earn 20% revenue share.
          </p>
          <Link
            href="/partners/apply"
            className="inline-block bg-teal text-white px-8 py-4 rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Apply to Partner Program
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { step: '1', title: 'Apply & get approved', desc: 'Submit your application. We review within 48 hours.' },
              { step: '2', title: 'Configure your branding', desc: 'Set your colors, logo, and brand name through your partner dashboard.' },
              { step: '3', title: 'Share your branded link', desc: 'Send clients to your white-labeled version of Auditflow.' },
              { step: '4', title: 'Earn 20% revenue share', desc: 'Get paid every month for every scan your clients run.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal text-white flex items-center justify-center font-bold">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-navy text-lg mb-1">{title}</h3>
                  <p className="text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">Partner Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Custom Branding',
                desc: 'Your logo, colors, and domain. Clients see your brand, not ours.',
              },
              {
                title: 'Revenue Share',
                desc: 'Earn 20% on every scan your clients run — paid out monthly.',
              },
              {
                title: 'Partner Dashboard',
                desc: 'Track clients, revenue, and growth all in one place.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-cream rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-navy text-xl mb-3">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-cream py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-navy mb-6">Pricing</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            White-label is available as an add-on to the Pro tier ($59/mo). Once approved, you can activate white-label branding from your dashboard settings.
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-navy py-16 px-6 text-center">
        <p className="text-white/70 text-lg">
          Already a partner?{' '}
          <Link href="/login" className="text-white underline hover:opacity-80">
            Sign in →
          </Link>
        </p>
      </section>
    </>
  );
}
