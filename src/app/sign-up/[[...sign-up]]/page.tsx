import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-nexus-900">Nexus Enterprise CRM</h1>
          <p className="mt-2 text-sm text-gray-600">Create your enterprise account</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-card rounded-lg border border-gray-200",
            },
          }}
        />
      </div>
    </div>
  );
}
