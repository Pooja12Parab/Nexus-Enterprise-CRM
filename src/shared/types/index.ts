import type { UserRole, EmpStatus } from "@prisma/client";

export interface EmployeeRow {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: {
    id: string;
    name: string;
  };
  status: EmpStatus;
  user: {
    email: string;
  };
  location: string | null;
  hireDate: Date | null;
  phoneNumber: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalCount: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface DepartmentOption {
  id: string;
  name: string;
  employeeCount: number;
}

export type { UserRole, EmpStatus };
