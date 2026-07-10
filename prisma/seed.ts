import { PrismaClient, UserRole, EmpStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data in reverse dependency order
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Create departments
  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Engineering" } }),
    prisma.department.create({ data: { name: "Product" } }),
    prisma.department.create({ data: { name: "Design" } }),
    prisma.department.create({ data: { name: "Marketing" } }),
    prisma.department.create({ data: { name: "Sales" } }),
    prisma.department.create({ data: { name: "Human Resources" } }),
    prisma.department.create({ data: { name: "Finance" } }),
    prisma.department.create({ data: { name: "Operations" } }),
  ]);

  console.log(`Created ${departments.length} departments`);

  // Create users (using Clerk-compatible IDs for seeded users)
  const users = [
    { id: "user_super", email: "admin+clerk_test@nexus.com", role: UserRole.SUPER_ADMIN },
    { id: "user_hr1", email: "sarah.hr@nexus.internal", role: UserRole.HR_MANAGER },
    { id: "user_hr2", email: "mike.hr@nexus.internal", role: UserRole.HR_MANAGER },
    { id: "user_dept_eng", email: "alex.eng@nexus.internal", role: UserRole.DEPT_HEAD },
    { id: "user_dept_prod", email: "lisa.prod@nexus.internal", role: UserRole.DEPT_HEAD },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`Created ${users.length} users`);

  // Seed employee profiles
  const employeeData = [
    { firstName: "Marcus", lastName: "Chen", jobTitle: "Senior Engineer", department: "Engineering", status: EmpStatus.ACTIVE, salary: 135000 },
    { firstName: "Aisha", lastName: "Patel", jobTitle: "Staff Engineer", department: "Engineering", status: EmpStatus.ACTIVE, salary: 155000 },
    { firstName: "James", lastName: "Wilson", jobTitle: "Junior Engineer", department: "Engineering", status: EmpStatus.ONBOARDING, salary: 85000 },
    { firstName: "Sofia", lastName: "Garcia", jobTitle: "Engineering Manager", department: "Engineering", status: EmpStatus.ACTIVE, salary: 170000 },
    { firstName: "Daniel", lastName: "Kim", jobTitle: "Product Manager", department: "Product", status: EmpStatus.ACTIVE, salary: 140000 },
    { firstName: "Emma", lastName: "Thompson", jobTitle: "UX Designer", department: "Design", status: EmpStatus.ACTIVE, salary: 120000 },
    { firstName: "Noah", lastName: "Martinez", jobTitle: "Marketing Lead", department: "Marketing", status: EmpStatus.ACTIVE, salary: 125000 },
    { firstName: "Olivia", lastName: "Brown", jobTitle: "Sales Director", department: "Sales", status: EmpStatus.ACTIVE, salary: 160000 },
    { firstName: "Liam", lastName: "Davis", jobTitle: "HR Coordinator", department: "Human Resources", status: EmpStatus.ACTIVE, salary: 75000 },
    { firstName: "Zara", lastName: "Nguyen", jobTitle: "Financial Analyst", department: "Finance", status: EmpStatus.ACTIVE, salary: 110000 },
    { firstName: "Ethan", lastName: "Taylor", jobTitle: "Operations Manager", department: "Operations", status: EmpStatus.ACTIVE, salary: 130000 },
    { firstName: "Ava", lastName: "Anderson", jobTitle: "DevOps Engineer", department: "Engineering", status: EmpStatus.INACTIVE, salary: 140000 },
    { firstName: "Lucas", lastName: "Thomas", jobTitle: "Backend Engineer", department: "Engineering", status: EmpStatus.LEAVE, salary: 125000 },
    { firstName: "Mia", lastName: "Jackson", jobTitle: "Frontend Engineer", department: "Engineering", status: EmpStatus.ACTIVE, salary: 115000 },
    { firstName: "Benjamin", lastName: "White", jobTitle: "Data Scientist", department: "Engineering", status: EmpStatus.ACTIVE, salary: 145000 },
  ];

  let count = 0;
  for (const emp of employeeData) {
    const dept = departments.find((d) => d.name === emp.department);
    if (!dept) continue;
    count++;
    await prisma.employeeProfile.create({
      data: {
        employeeId: `EMP-${String(count).padStart(3, "0")}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        departmentId: dept.id,
        status: emp.status,
        hireDate: new Date(Date.now() - Math.random() * 365 * 3 * 24 * 60 * 60 * 1000),
        location: ["New York", "San Francisco", "Austin", "Chicago", "Seattle"][Math.floor(Math.random() * 5)],
        salaries: { create: { amount: emp.salary, effectiveDate: new Date(), notes: "Initial salary" } },
      },
    });
  }

  // Generate 500 bulk employees for testing virtualization
  const bulkNames = [
    { first: "Alice", last: "Johnson" }, { first: "Bob", last: "Smith" },
    { first: "Carol", last: "Williams" }, { first: "David", last: "Jones" },
    { first: "Eve", last: "Miller" }, { first: "Frank", last: "Moore" },
    { first: "Grace", last: "Lee" }, { first: "Henry", last: "Clark" },
    { first: "Iris", last: "Hall" }, { first: "Jack", last: "Allen" },
    { first: "Kate", last: "Young" }, { first: "Leo", last: "King" },
  ];
  const bulkTitles = ["Software Engineer", "Product Designer", "Data Analyst", "QA Engineer",
    "DevOps Engineer", "Engineering Manager", "Tech Lead", "UX Researcher"];
  const bulkStatuses = [EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE,
    EmpStatus.ONBOARDING, EmpStatus.INACTIVE, EmpStatus.LEAVE];
  const bulkLocations = ["New York", "San Francisco", "Austin", "Chicago", "Seattle", "Remote"];

  for (let i = 0; i < 500; i++) {
    count++;
    const name = bulkNames[i % bulkNames.length];
    const dept = departments[i % departments.length];
    const minSalary = (i % 5) * 15000 + 60000;
    await prisma.employeeProfile.create({
      data: {
        employeeId: `EMP-${String(count).padStart(3, "0")}`,
        firstName: name.first,
        lastName: name.last,
        jobTitle: bulkTitles[i % bulkTitles.length],
        departmentId: dept.id,
        status: bulkStatuses[i % bulkStatuses.length],
        hireDate: new Date(Date.now() - Math.random() * 365 * 5 * 24 * 60 * 60 * 1000),
        location: bulkLocations[i % bulkLocations.length],
        salaries: { create: { amount: minSalary, effectiveDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) } },
      },
    });
  }

  console.log(`Created ${count} employee profiles`);
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });