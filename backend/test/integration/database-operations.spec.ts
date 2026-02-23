import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

describe('Database Operations (Integration)', () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;

    beforeAll(async () => {
        // Start PostgreSQL container
        container = await new PostgreSqlContainer('postgres:16-alpine').start();
        const url = container.getConnectionUri();
        process.env.DATABASE_URL = url;

        // Run schema sync
        execSync('npx prisma db push --skip-generate', {
            env: { ...process.env, DATABASE_URL: url },
        });

        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: url
                }
            }
        });
        await prisma.$connect();
    }, 120000);

    afterAll(async () => {
        if (prisma) await prisma.$disconnect();
        if (container) await container.stop();
    });

    beforeEach(async () => {
        // Clean database between tests
        await prisma.branchTracker.deleteMany();
        await prisma.credential.deleteMany();
        await prisma.environment.deleteMany();
        await prisma.sourceRepo.deleteMany();
        await prisma.promotionRepo.deleteMany();
        await prisma.project.deleteMany();
    });

    it('TC-INT-001: should create and retrieve project', async () => {
        const project = await prisma.project.create({
            data: {
                name: 'test-project',
                displayName: 'Test Project',
                team: 'Test Team',
                teamEmail: 'test@example.com',
            },
        });

        expect(project.id).toBeDefined();

        const retrieved = await prisma.project.findUnique({
            where: { id: project.id },
        });

        expect(retrieved?.name).toBe('test-project');
    });

    it('TC-INT-002: should enforce unique constraint on project name', async () => {
        await prisma.project.create({
            data: {
                name: 'unique-name',
                displayName: 'Project 1',
                team: 'Team 1',
                teamEmail: 'team1@example.com',
            },
        });

        await expect(prisma.project.create({
            data: {
                name: 'unique-name',
                displayName: 'Project 2',
                team: 'Team 2',
                teamEmail: 'team2@example.com',
            },
        })).rejects.toThrow();
    });

    it('TC-INT-003: archiving project does not delete related data', async () => {
        const project = await prisma.project.create({
            data: { name: 'archive-test', displayName: 'A', team: 'T', teamEmail: 't@e.com' }
        });

        await prisma.environment.create({
            data: { projectId: project.id, name: 'dev', promotionOrder: 1, valuesFolder: 'v1', displayName: 'Dev' }
        });

        await prisma.project.update({
            where: { id: project.id },
            data: { status: 'archived' }
        });

        const envCount = await prisma.environment.count({ where: { projectId: project.id } });
        expect(envCount).toBe(1);
    });

    it('TC-INT-004: Add multiple source repos to project', async () => {
        const project = await prisma.project.create({
            data: { name: 'multi-repo', displayName: 'M', team: 'T', teamEmail: 't@e.com' }
        });

        await prisma.sourceRepo.createMany({
            data: [
                { projectId: project.id, name: 'r1', repoUrl: 'u1', repoType: 'app' },
                { projectId: project.id, name: 'r2', repoUrl: 'u2', repoType: 'infra' },
            ]
        });

        const count = await prisma.sourceRepo.count({ where: { projectId: project.id } });
        expect(count).toBe(2);
    });

    it('TC-INT-005: Environment ordering is maintained', async () => {
        const project = await prisma.project.create({
            data: { name: 'env-order', displayName: 'Env Order', team: 'T', teamEmail: 't@e.com' }
        });

        // Create envs out of order
        await prisma.environment.create({ data: { projectId: project.id, name: 'uat', promotionOrder: 3, valuesFolder: 'v3', displayName: 'UAT' } });
        await prisma.environment.create({ data: { projectId: project.id, name: 'dev', promotionOrder: 1, valuesFolder: 'v1', displayName: 'Dev' } });
        await prisma.environment.create({ data: { projectId: project.id, name: 'sit', promotionOrder: 2, valuesFolder: 'v2', displayName: 'SIT' } });

        const envs = await prisma.environment.findMany({
            where: { projectId: project.id },
            orderBy: { promotionOrder: 'asc' }
        });

        expect(envs[0].name).toBe('dev');
        expect(envs[1].name).toBe('sit');
        expect(envs[2].name).toBe('uat');
    });

    it('TC-INT-006: Branch tracker CRUD operations', async () => {
        const project = await prisma.project.create({
            data: { name: 'bt-crud', displayName: 'BT', team: 'T', teamEmail: 't@e.com' }
        });

        const bt = await prisma.branchTracker.create({
            data: {
                projectId: project.id,
                branchName: 'release/1.0.0',
                version: '1.0.0',
                environmentStatuses: { dev: 'release/1.0.0', sit: 'X' },
                isActive: true
            }
        });

        expect(bt.id).toBeDefined();

        // Update
        const updated = await prisma.branchTracker.update({
            where: { id: bt.id },
            data: { environmentStatuses: { dev: 'release/1.0.0', sit: 'release/1.0.0' } }
        });

        expect((updated.environmentStatuses as any).sit).toBe('release/1.0.0');

        // Verify retrieval
        const retrieved = await prisma.branchTracker.findFirst({ where: { projectId: project.id, isActive: true } });
        expect(retrieved?.branchName).toBe('release/1.0.0');
    });
});
