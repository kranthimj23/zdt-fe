import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Project CRUD (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaServiceMock;

    beforeAll(async () => {
        prisma = new PrismaServiceMock();
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(PrismaService)
            .useValue(prisma)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        prisma.reset();
    });

    it('TC-API-001: should create a valid project', async () => {
        const projectDto = {
            name: 'e2e-project',
            displayName: 'E2E Project',
            team: 'DevOps',
            teamEmail: 'devops@example.com',
        };

        const response = await request(app.getHttpServer())
            .post('/api/projects')
            .send(projectDto)
            .expect(201);

        expect(response.body.name).toBe(projectDto.name);
        expect(response.body.id).toBeDefined();
        expect(response.body.status).toBe('active');
    });

    it('TC-API-002: should fail for duplicate project name', async () => {
        const projectDto = {
            name: 'duplicate-project',
            displayName: 'Duplicate Project',
            team: 'DevOps',
            teamEmail: 'devops@example.com',
        };

        // First one succeeds
        await request(app.getHttpServer())
            .post('/api/projects')
            .send(projectDto)
            .expect(201);

        // Second one fails with 409 Conflict
        const response = await request(app.getHttpServer())
            .post('/api/projects')
            .send(projectDto)
            .expect(409);

        expect(response.body.message).toContain('already exists');
    });

    it('TC-API-004: should retrieve project by ID', async () => {
        const projectDto = {
            name: 'get-by-id',
            displayName: 'Get By ID',
            team: 'Test',
            teamEmail: 'test@example.com',
        };

        const createRes = await request(app.getHttpServer())
            .post('/api/projects')
            .send(projectDto)
            .expect(201);

        const projectId = createRes.body.id;

        const response = await request(app.getHttpServer())
            .get(`/api/projects/${projectId}`)
            .expect(200);

        expect(response.body.id).toBe(projectId);
        expect(response.body.name).toBe(projectDto.name);
    });

    it('TC-API-005: should return 404 for non-existent ID', async () => {
        await request(app.getHttpServer())
            .get('/api/projects/non-existent-id')
            .expect(404);
    });

    it('TC-API-003: GET /api/projects - list projects (paginated)', async () => {
        // Create 25 projects in the mock
        for (let i = 1; i <= 25; i++) {
            await prisma.project.create({
                data: {
                    name: `p-${i}`,
                    displayName: `Project ${i}`,
                    team: 'T',
                    teamEmail: 't@e.com'
                }
            });
        }

        const response = await request(app.getHttpServer())
            .get('/api/projects?page=1&limit=10')
            .expect(200);

        expect(response.body.items.length).toBe(10);
        expect(response.body.total).toBe(25);
        expect(response.body.totalPages).toBe(3);
    });

    it('TC-API-006: GET /api/projects/by-name/:name - should get project by name', async () => {
        const name = 'query-by-name';
        await prisma.project.create({
            data: { name, displayName: 'Query', team: 'T', teamEmail: 't@e.com' }
        });

        const response = await request(app.getHttpServer())
            .get(`/api/projects/by-name/${name}`)
            .expect(200);

        expect(response.body.name).toBe(name);
    });

    it('TC-API-007: PATCH /api/projects/:id - update fields', async () => {
        const project = await prisma.project.create({
            data: { name: 'update-me', displayName: 'Old Name', team: 'T', teamEmail: 't@e.com' }
        });

        const response = await request(app.getHttpServer())
            .patch(`/api/projects/${project.id}`)
            .send({ displayName: 'New Name', description: 'Updated' })
            .expect(200);

        expect(response.body.displayName).toBe('New Name');
        expect(response.body.description).toBe('Updated');
    });

    it('TC-API-008: DELETE /api/projects/:id - soft delete (archive)', async () => {
        const project = await prisma.project.create({
            data: { name: 'delete-me', displayName: 'Delete', team: 'T', teamEmail: 't@e.com' }
        });

        await request(app.getHttpServer())
            .delete(`/api/projects/${project.id}`)
            .expect(200);

        const checkRes = await request(app.getHttpServer())
            .get(`/api/projects/${project.id}`)
            .expect(200);

        expect(checkRes.body.status).toBe('archived');
    });

    it('/api/projects (GET) - should list projects', async () => {
        // Add two projects
        await prisma.project.create({ data: { name: 'p1', displayName: 'P1', team: 'T1', teamEmail: 't1@ex.com' } });
        await prisma.project.create({ data: { name: 'p2', displayName: 'P2', team: 'T2', teamEmail: 't2@ex.com' } });

        const response = await request(app.getHttpServer())
            .get('/api/projects')
            .expect(200);

        expect(Array.isArray(response.body.items)).toBe(true);
        expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    });
});
