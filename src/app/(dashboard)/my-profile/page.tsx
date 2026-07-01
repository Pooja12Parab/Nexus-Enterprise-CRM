import { auth } from "@clerk/nextjs/server";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { UserCircle, Mail, Shield, Calendar } from "lucide-react";

export default async function MyProfilePage() {
  const { userId, sessionClaims } = await auth();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Your personal information and account settings</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Account Information</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-nexus-100 flex items-center justify-center">
              <UserCircle className="h-8 w-8 text-nexus-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {sessionClaims?.firstName as string || "User"} {sessionClaims?.lastName as string || ""}
              </p>
              <p className="text-sm text-gray-500">ID: {userId}</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="flex items-center gap-3 py-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{sessionClaims?.email as string || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-sm font-medium text-gray-900">{sessionClaims?.role as string || "Employee"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="text-sm font-medium text-gray-900">
                  {sessionClaims?.createdAt
                    ? new Date(sessionClaims.createdAt as string).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
