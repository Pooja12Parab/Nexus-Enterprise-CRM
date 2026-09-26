import { PrismaClient, UserRole, EmpStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seed Nexus CRM with realistic, diverse data.
 * - 8 departments
 * - 5 demo users with various roles
 * - 15 hand-curated "VIP" employees (Marcus, Aisha, Sofia, etc.)
 * - 500 bulk employees from a large name pool so the directory grid is varied
 */

// Large, diverse name pools so the directory doesn't repeat "Jack Allen, QA Engineer" 64 times
const FIRST_NAMES = [
  "Aaron", "Abigail", "Adam", "Aditya", "Aisha", "Alex", "Alice", "Amir",
  "Ananya", "Andrew", "Anita", "Arjun", "Ava", "Benjamin", "Bianca", "Carlos",
  "Chen", "Chloe", "Daniel", "David", "Devanshi", "Diya", "Elena", "Eli",
  "Emma", "Ethan", "Fatima", "Gabriel", "Grace", "Hannah", "Hiro", "Isabella",
  "Jamal", "James", "Jasmine", "Jay", "Jessica", "Jin", "Jordan", "Kai",
  "Kavya", "Khalid", "Kira", "Krishna", "Lakshmi", "Liam", "Lina", "Lucas",
  "Marcus", "Maria", "Maya", "Mei", "Mia", "Mohammed", "Nadia", "Naomi",
  "Nia", "Noah", "Olivia", "Omar", "Owen", "Priya", "Rafael", "Ravi",
  "Riya", "Rohan", "Rosa", "Ryan", "Saanvi", "Sakura", "Sam", "Sara",
  "Sarah", "Sean", "Sofia", "Sonia", "Tara", "Tenzin", "Theo", "Tia",
  "Tomas", "Vikram", "Wei", "Yuki", "Zara", "Zoe",
];

const LAST_NAMES = [
  "Adams", "Adler", "Agarwal", "Ahmed", "Anderson", "Bailey", "Baker", "Barnes",
  "Bell", "Bennett", "Bhatia", "Brown", "Campbell", "Carter", "Chang", "Chatterjee",
  "Chen", "Choi", "Chowdhury", "Clark", "Cohen", "Collins", "Cook", "Cooper",
  "Cox", "Davis", "Diaz", "Edwards", "Evans", "Fischer", "Fisher", "Foster",
  "Gomez", "Gonzalez", "Graham", "Green", "Hall", "Harris", "Hassan", "Hayes",
  "Henderson", "Hernandez", "Hill", "Howard", "Hussain", "Iyer", "Jackson", "Jensen",
  "Johansson", "Johnson", "Jones", "Kapoor", "Khan", "Kim", "Kumar", "Larsen",
  "Lee", "Lewis", "Liu", "Lopez", "Martin", "Martinez", "Mehta", "Mitchell",
  "Mohamed", "Morgan", "Murphy", "Nakamura", "Nguyen", "O'Brien", "Olsen", "Patel",
  "Pereira", "Petersen", "Phillips", "Powell", "Price", "Qureshi", "Ramirez", "Rao",
  "Reed", "Reyes", "Rivera", "Roberts", "Robinson", "Rodriguez", "Ross", "Sato",
  "Schmidt", "Scott", "Shah", "Sharma", "Singh", "Smith", "Sullivan", "Sun",
  "Tanaka", "Taylor", "Thomas", "Thompson", "Turner", "Verma", "Walker", "Wang",
  "White", "Williams", "Wilson", "Wong", "Wright", "Yamamoto", "Yang", "Zhang",
  "Zhao",
];

const TITLES_BY_DEPARTMENT: Record<string, string[]> = {
  Engineering: [
    "Software Engineer",
    "Senior Software Engineer",
    "Staff Engineer",
    "Engineering Manager",
    "Backend Engineer",
    "Frontend Engineer",
    "Full-Stack Engineer",
    "Site Reliability Engineer",
    "DevOps Engineer",
    "Platform Engineer",
    "Engineering Director",
    "VP of Engineering",
  ],
  Product: [
    "Product Manager",
    "Senior Product Manager",
    "Product Designer",
    "Group Product Manager",
    "Director of Product",
    "VP of Product",
    "Product Analyst",
  ],
  Design: [
    "UX Designer",
    "Senior UX Designer",
    "UX Researcher",
    "Design Lead",
    "Visual Designer",
    "Design Director",
    "UX Writer",
  ],
  Marketing: [
    "Marketing Manager",
    "Content Strategist",
    "Growth Marketer",
    "Brand Manager",
    "Marketing Director",
    "Demand Generation Specialist",
    "SEO Specialist",
  ],
  Sales: [
    "Account Executive",
    "Senior Account Executive",
    "Sales Development Representative",
    "Sales Manager",
    "Enterprise Account Executive",
    "Sales Director",
    "VP of Sales",
    "Customer Success Manager",
  ],
  "Human Resources": [
    "HR Business Partner",
    "Recruiter",
    "Senior Recruiter",
    "HR Coordinator",
    "People Operations Manager",
    "Director of People",
  ],
  Finance: [
    "Financial Analyst",
    "Senior Financial Analyst",
    "Controller",
    "Accountant",
    "FP&A Manager",
    "CFO",
  ],
  Operations: [
    "Operations Manager",
    "Senior Operations Manager",
    "Workforce Planning Lead",
    "Facilities Manager",
    "IT Operations Specialist",
    "Director of Operations",
  ],
};

const LOCATIONS = [
  "Bangalore, IN",
  "Mumbai, IN",
  "Hyderabad, IN",
  "New York, NY",
  "San Francisco, CA",
  "Austin, TX",
  "Seattle, WA",
  "Chicago, IL",
  "Remote",
];

// Helper: pick random element from an array
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: pick random integer in [min, max]
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: salary band by seniority (tier = years-of-experience bucket)
function salaryForTier(tier: "junior" | "mid" | "senior" | "lead" | "principal"): number {
  const ranges = {
    junior: [70000, 95000],
    mid: [100000, 140000],
    senior: [140000, 185000],
    lead: [180000, 240000],
    principal: [220000, 320000],
  };
  const [lo, hi] = ranges[tier];
  // Round to nearest 5k for cleaner numbers
  return Math.round((randInt(lo, hi) / 5000)) * 5000;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data in reverse dependency order
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.aiUsageLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Create departments
  const departments = await Promise.all(
    Object.keys(TITLES_BY_DEPARTMENT).map((name) =>
      prisma.department.create({ data: { name } })
    )
  );
  const deptByName = Object.fromEntries(departments.map((d) => [d.name, d]));
  console.log(`Created ${departments.length} departments`);

  // Create demo users with varied roles
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

  // Hand-curated "VIP" employees (realistic, varied)
  const vipEmployees = [
    { first: "Marcus", last: "Chen", title: "VP of Engineering", dept: "Engineering", tier: "principal" as const, status: EmpStatus.ACTIVE, yearsAgo: 5 },
    { first: "Aisha", last: "Patel", title: "Staff Software Engineer", dept: "Engineering", tier: "lead" as const, status: EmpStatus.ACTIVE, yearsAgo: 4 },
    { first: "Sofia", last: "Garcia", title: "Engineering Director", dept: "Engineering", tier: "principal" as const, status: EmpStatus.ACTIVE, yearsAgo: 6 },
    { first: "Daniel", last: "Kim", title: "Senior Product Manager", dept: "Product", tier: "senior" as const, status: EmpStatus.ACTIVE, yearsAgo: 3 },
    { first: "Emma", last: "Thompson", title: "Design Lead", dept: "Design", tier: "lead" as const, status: EmpStatus.ACTIVE, yearsAgo: 4 },
    { first: "Noah", last: "Martinez", title: "Marketing Director", dept: "Marketing", tier: "principal" as const, status: EmpStatus.ACTIVE, yearsAgo: 5 },
    { first: "Olivia", last: "Brown", title: "VP of Sales", dept: "Sales", tier: "principal" as const, status: EmpStatus.ACTIVE, yearsAgo: 6 },
    { first: "Liam", last: "Davis", title: "Director of People", dept: "Human Resources", tier: "principal" as const, status: EmpStatus.ACTIVE, yearsAgo: 4 },
    { first: "Zara", last: "Nguyen", title: "FP&A Manager", dept: "Finance", tier: "lead" as const, status: EmpStatus.ACTIVE, yearsAgo: 3 },
    { first: "Ethan", last: "Taylor", title: "Director of Operations", dept: "Operations", tier: "principal" as const, status: EmpStatus.ACTIVE, yearsAgo: 5 },
    { first: "Ava", last: "Anderson", title: "Senior Site Reliability Engineer", dept: "Engineering", tier: "senior" as const, status: EmpStatus.ONBOARDING, yearsAgo: 0.1 },
    { first: "Lucas", last: "Thomas", title: "Backend Engineer", dept: "Engineering", tier: "mid" as const, status: EmpStatus.LEAVE, yearsAgo: 2 },
    { first: "Mia", last: "Jackson", title: "Frontend Engineer", dept: "Engineering", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 2 },
    { first: "Benjamin", last: "White", title: "Data Scientist", dept: "Engineering", tier: "senior" as const, status: EmpStatus.ACTIVE, yearsAgo: 3 },
    { first: "James", last: "Wilson", title: "Junior Software Engineer", dept: "Engineering", tier: "junior" as const, status: EmpStatus.ONBOARDING, yearsAgo: 0.2 },
    { first: "Sarah", last: "Mitchell", title: "Product Designer", dept: "Product", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 2 },
    { first: "Robert", last: "Chen", title: "Data Analyst", dept: "Product", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 3 },
    { first: "Yuki", last: "Tanaka", title: "UX Researcher", dept: "Design", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 2 },
    { first: "Jamal", last: "Hassan", title: "Growth Marketer", dept: "Marketing", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 1 },
    { first: "Priya", last: "Sharma", title: "Account Executive", dept: "Sales", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 2 },
    { first: "Tomas", last: "Garcia", title: "Senior Account Executive", dept: "Sales", tier: "senior" as const, status: EmpStatus.ACTIVE, yearsAgo: 4 },
    { first: "Nadia", last: "Ahmed", title: "Senior Recruiter", dept: "Human Resources", tier: "senior" as const, status: EmpStatus.ACTIVE, yearsAgo: 4 },
    { first: "Kavya", last: "Iyer", title: "Financial Analyst", dept: "Finance", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 1 },
    { first: "Tenzin", last: "Sherpa", title: "Workforce Planning Lead", dept: "Operations", tier: "lead" as const, status: EmpStatus.ACTIVE, yearsAgo: 5 },
    { first: "Wei", last: "Chen", title: "Staff Engineer", dept: "Engineering", tier: "lead" as const, status: EmpStatus.ACTIVE, yearsAgo: 6 },
    { first: "Theo", last: "Martin", title: "Platform Engineer", dept: "Engineering", tier: "senior" as const, status: EmpStatus.ACTIVE, yearsAgo: 3 },
    { first: "Ravi", last: "Krishnan", title: "DevOps Engineer", dept: "Engineering", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 2 },
    { first: "Iris", last: "Hall", title: "UX Writer", dept: "Design", tier: "junior" as const, status: EmpStatus.ACTIVE, yearsAgo: 1 },
    { first: "Diya", last: "Mehta", title: "Content Strategist", dept: "Marketing", tier: "mid" as const, status: EmpStatus.ACTIVE, yearsAgo: 2 },
  ];

  let count = 0;
  for (const vip of vipEmployees) {
    count++;
    const dept = deptByName[vip.dept];
    if (!dept) continue;
    const salary = salaryForTier(vip.tier);
    const hireDate = new Date(Date.now() - vip.yearsAgo * 365 * 24 * 60 * 60 * 1000);
    await prisma.employeeProfile.create({
      data: {
        employeeId: `EMP-${String(count).padStart(3, "0")}`,
        firstName: vip.first,
        lastName: vip.last,
        jobTitle: vip.title,
        departmentId: dept.id,
        status: vip.status,
        hireDate,
        location: pick(LOCATIONS),
        salaries: {
          create: {
            amount: salary,
            effectiveDate: hireDate,
            notes: "Initial salary",
          },
        },
      },
    });
  }
  console.log(`Created ${count} VIP employees`);

  // Bulk employees — large name pool ensures no repeats
  const STATUS_DISTRIBUTION: EmpStatus[] = [
    EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE,
    EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE, EmpStatus.ACTIVE,
    EmpStatus.ONBOARDING, EmpStatus.ONBOARDING, EmpStatus.ONBOARDING,
    EmpStatus.LEAVE, EmpStatus.INACTIVE,
  ];
  const TIERS: Array<"junior" | "mid" | "senior" | "lead" | "principal"> = [
    "junior", "junior", "mid", "mid", "mid", "senior", "senior", "lead", "principal",
  ];

  // Track unique name combos to avoid duplicates
  const usedCombos = new Set<string>();
  for (const vip of vipEmployees) usedCombos.add(`${vip.first}|${vip.last}`);

  let attempts = 0;
  const TARGET = 500;
  while (count < vipEmployees.length + TARGET && attempts < TARGET * 3) {
    attempts++;
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const combo = `${first}|${last}`;
    if (usedCombos.has(combo)) continue;
    usedCombos.add(combo);

    count++;
    const deptName = pick(Object.keys(TITLES_BY_DEPARTMENT));
    const dept = deptByName[deptName];
    const tier = pick(TIERS);
    const salary = salaryForTier(tier);
    const yearsAgo = Math.random() * 6; // 0-6 years
    const hireDate = new Date(Date.now() - yearsAgo * 365 * 24 * 60 * 60 * 1000);
    await prisma.employeeProfile.create({
      data: {
        employeeId: `EMP-${String(count).padStart(3, "0")}`,
        firstName: first,
        lastName: last,
        jobTitle: pick(TITLES_BY_DEPARTMENT[deptName]),
        departmentId: dept.id,
        status: pick(STATUS_DISTRIBUTION),
        hireDate,
        location: pick(LOCATIONS),
        salaries: {
          create: {
            amount: salary,
            effectiveDate: hireDate,
            notes: "Initial salary",
          },
        },
      },
    });
  }

  console.log(`Created ${count} total employee profiles`);
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
