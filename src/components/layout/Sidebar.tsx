"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/stores/sidebar";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GitBranch,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"] },
  { name: "Directory", href: "/directory", icon: Users, roles: ["HR_MANAGER", "SUPER_ADMIN"] },
  { name: "Onboarding", href: "/onboarding", icon: UserPlus, roles: ["HR_MANAGER", "SUPER_ADMIN"] },
  { name: "Org Chart", href: "/org-chart", icon: GitBranch, roles: ["HR_MANAGER", "SUPER_ADMIN"] },
  { name: "My Profile", href: "/my-profile", icon: UserCircle, roles: ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-gray-900 text-gray-300 transition-all duration-200 flex flex-col",
        isOpen ? "w-sidebar" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
        {isOpen && <span className="text-lg font-bold text-white">Nexus CRM</span>}
        <button
          onClick={toggle}
          className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-nexus-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {isOpen && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="border-t border-gray-800 p-4">
          <p className="text-xs text-gray-500">Nexus Enterprise CRM v1.0</p>
        </div>
      )}
    </aside>
  );
}
