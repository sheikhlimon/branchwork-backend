import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService TDD Suite', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test_jwt_secret_key',
          signOptions: { expiresIn: '1d' },
        }),
        PrismaModule,
      ],
      providers: [AuthService],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test organizations created during auth tests
    await prisma.organization.deleteMany({
      where: {
        name: { in: ['Padma Retail Test', 'Duplicate Test Org'] },
      },
    });
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('Organization & Owner Registration', () => {
    it('should register an organization with an owner and return a JWT', async () => {
      const result = await authService.registerOrg({
        organizationName: 'Padma Retail Test',
        ownerName: 'Nadia Rahman',
        email: 'nadia.test@demo.com',
        password: 'demo123password',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('nadia.test@demo.com');
      expect(result.user.name).toBe('Nadia Rahman');
      expect(result.user.isOwner).toBe(true);
      expect(result.user.organizationId).toBeDefined();
    });

    it('should reject registration if email is already taken with ConflictException', async () => {
      await expect(
        authService.registerOrg({
          organizationName: 'Duplicate Test Org',
          ownerName: 'Duplicate Nadia',
          email: 'nadia.test@demo.com', // Duplicate email
          password: 'demo123password',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('User Login & Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const result = await authService.login({
        email: 'nadia.test@demo.com',
        password: 'demo123password',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('nadia.test@demo.com');
      expect(result.user.isOwner).toBe(true);
    });

    it('should reject login with invalid password throwing UnauthorizedException', async () => {
      await expect(
        authService.login({
          email: 'nadia.test@demo.com',
          password: 'WRONG_PASSWORD',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login with non-existent email throwing UnauthorizedException', async () => {
      await expect(
        authService.login({
          email: 'ghost_user@nonexistent.com',
          password: 'demo123password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Session Profile Resolution (getMe)', () => {
    it('should return the full session profile with wildcard permissions for owner', async () => {
      const loginRes = await authService.login({
        email: 'nadia.test@demo.com',
        password: 'demo123password',
      });

      const profile = await authService.getMe(loginRes.user.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe('nadia.test@demo.com');
      expect(profile.isOwner).toBe(true);
      expect(profile.permissions).toContain('*');
    });

    it('should throw UnauthorizedException if user ID does not exist', async () => {
      await expect(authService.getMe('non-existent-user-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
