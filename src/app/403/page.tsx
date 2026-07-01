import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="rounded-full bg-red-50 p-4 mb-4">
        <ShieldAlert className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="mt-2 text-sm text-gray-500 text-center max-w-md">
        You do not have the required permissions to access this page. Contact your administrator if you believe this is an error.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
        <Link href="/" className="btn-secondary">Back to Home</Link>
      </div>
    </div>
  );
}
