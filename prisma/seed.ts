import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Branchwork demo data (Padma Retail)...");

  // 1. Clean existing seed records if present
  const existingOrg = await prisma.organization.findFirst({
    where: { name: "Padma Retail" },
  });

  if (existingOrg) {
    await prisma.organization.delete({
      where: { id: existingOrg.id },
    });
  }

  // Common password hash for demo accounts: "demo123"
  const passwordHash = await bcrypt.hash("demo123", 10);

  // 2. Create Organization: Padma Retail
  const org = await prisma.organization.create({
    data: {
      name: "Padma Retail",
    },
  });

  // 3. Create Branches: Dhanmondi and Gulshan
  const dhanmondi = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Dhanmondi",
      city: "Dhaka",
    },
  });

  const gulshan = await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: "Gulshan",
      city: "Dhaka",
    },
  });

  // 4. Create Roles with Permission Checklists
  await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Branch manager",
      description: "Oversees branch staff and local inventory",
      permissions: JSON.stringify([
        "manage_staff",
        "view_products",
        "organize_products",
      ]),
    },
  });

  const stockClerkRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Stock clerk",
      description: "Manages shelf stock and category organization",
      permissions: JSON.stringify(["view_products", "organize_products"]),
    },
  });

  // 5. Create Owner: Nadia Rahman (Superadmin across all branches)
  await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Nadia Rahman",
      email: "nadia@demo.com",
      passwordHash,
      isOwner: true,
    },
  });

  // 6. Create Staff: Rafi Ahmed (Locked to Gulshan Branch as Stock Clerk)
  await prisma.user.create({
    data: {
      organizationId: org.id,
      branchId: gulshan.id,
      roleId: stockClerkRole.id,
      name: "Rafi Ahmed",
      email: "rafi@demo.com",
      passwordHash,
      isOwner: false,
    },
  });

  // 7. Create Products matching prototype inventory
  // Product 1: Mustard oil 1L (Dhanmondi)
  await prisma.product.create({
    data: {
      organizationId: org.id,
      branchId: dhanmondi.id,
      name: "Mustard oil 1L",
      sku: "OIL-001",
      category: "Grocery",
      price: 112.6,
      stock: 50,
    },
  });

  // Product 2: Basmati rice 5kg (Gulshan)
  await prisma.product.create({
    data: {
      organizationId: org.id,
      branchId: gulshan.id,
      name: "Basmati rice 5kg",
      sku: "RIC-005",
      category: "Grocery",
      price: 890.0,
      stock: 40,
    },
  });

  // Product 3: Steel flask (Gulshan)
  await prisma.product.create({
    data: {
      organizationId: org.id,
      branchId: gulshan.id,
      name: "Steel flask",
      sku: "HOM-212",
      category: "Home",
      price: 1250.0,
      stock: 20,
    },
  });

  console.log("✅ Seed completed successfully!\n");
  console.log("Demo Credentials:");
  console.log("------------------------------------------------------------");
  console.log(
    "👑 OWNER:       nadia@demo.com       / demo123 (All branches)",
  );
  console.log(
    "📦 STOCK CLERK: rafi@demo.com        / demo123 (Gulshan branch)",
  );
  console.log("------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
