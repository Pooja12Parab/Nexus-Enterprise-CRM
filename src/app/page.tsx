import Link from "next/link";
import { Users, Zap, Share2, Shield } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "50K+ Records at 60fps",
    description: "TanStack Virtual renders only visible rows, ensuring zero UI degradation even with massive datasets.",
  },
  {
    icon: Share2,
    title: "Shareable URLs",
    description: "Every filter, sort, and page state is encoded in the URL. Share exact views with colleagues.",
  },
  {
    icon: Shield,
    title: "Enterprise Auth",
    description: "SAML SSO + MFA via Clerk. Route-level RBAC protects every endpoint.",
  },
  {
    icon: Users,
    title: "Modern HR Workflows",
    description: "Multi-step onboarding wizards, bulk actions, audit logs. Designed for HR professionals.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-nexus-200 bg-nexus-50 px-4 py-1.5 text-sm text-nexus-700 mb-6">
          <Zap className="h-4 w-4" />
          Built for Enterprise Scale
        </div>
        <h1 className="text-5xl font-bold text-nexus-900 tracking-tight leading-tight">
          Nexus Enterprise CRM
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          A modern, high-performance HR dashboard built with Next.js 16, React 19, and Tailwind CSS.
          Handle 50,000+ records at 60fps with shareable, URL-driven state.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
            Go to Dashboard
          </Link>
          <Link href="/sign-in" className="btn-secondary px-6 py-3 text-base">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Why Nexus?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-white rounded-lg border border-gray-200 p-6 shadow-card hover:shadow-md transition-shadow">
                <div className="rounded-lg bg-nexus-50 p-2.5 w-fit mb-4">
                  <Icon className="h-5 w-5 text-nexus-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400">
        Nexus Enterprise CRM v1.0 — Built with Next.js, React 19, Tailwind CSS
      </footer>
    </div>
  );
}
