import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService Integration Test', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('should be defined and successfully connect to database', () => {
    expect(prisma).toBeDefined();
  });

  it('should create, query, and delete an Organization record', async () => {
    // 1. Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Retail Org',
      },
    });

    expect(org).toBeDefined();
    expect(org.id).toBeDefined();
    expect(org.name).toBe('Test Retail Org');

    // 2. Query the organization back
    const found = await prisma.organization.findUnique({
      where: { id: org.id },
    });
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Test Retail Org');

    // 3. Clean up test record
    await prisma.organization.delete({
      where: { id: org.id },
    });

    const deleted = await prisma.organization.findUnique({
      where: { id: org.id },
    });
    expect(deleted).toBeNull();
  });

  it('should enforce cascade deletion from Organization to Branches', async () => {
    // Create org + branch
    const org = await prisma.organization.create({
      data: {
        name: 'Cascade Test Org',
        branches: {
          create: {
            name: 'Test Branch',
            city: 'Test City',
          },
        },
      },
      include: { branches: true },
    });

    expect(org.branches.length).toBe(1);
    const branchId = org.branches[0].id;

    // Delete org
    await prisma.organization.delete({
      where: { id: org.id },
    });

    // Branch must be cascaded and deleted
    const orphanedBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    expect(orphanedBranch).toBeNull();
  });
});
