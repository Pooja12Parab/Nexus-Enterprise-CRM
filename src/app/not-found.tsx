import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <FileQuestion className="h-8 w-8 text-gray-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-gray-500 text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
        <Link href="/" className="btn-secondary">Back to Home</Link>
      </div>
    </div>
  );
}
