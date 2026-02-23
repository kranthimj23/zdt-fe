import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Branch Tracking (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaServiceMock;
    let projectId: string;

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

    beforeEach(async () => {
        prisma.reset();
        const project = await prisma.project.create({
            data: { name: 'bt-project', displayName: 'BT', team: 'T', teamEmail: 't@e.com' }
        });
        projectId = project.id;

        // Setup environments
        await prisma.environment.create({ data: { projectId, name: 'dev', promotionOrder: 1, valuesFolder: 'v1', displayName: 'D' } });
        await prisma.environment.create({ data: { projectId, name: 'sit', promotionOrder: 2, valuesFolder: 'v2', displayName: 'S' } });
    });

    it('TC-API-051: should create a new branch entry', async () => {
        const branchDto = {
            branchName: 'release/1.0.0',
            version: '1.0.0'
        };

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/branches`)
            .send(branchDto)
            .expect(201);

        expect(response.body.branchName).toBe(branchDto.branchName);
        expect(response.body.environmentStatuses.dev).toBe(branchDto.branchName);
        expect(response.body.environmentStatuses.sit).toBe('X');
    });

    it('TC-API-050: should get active branches', async () => {
        // Create two branch entries
        const b1 = await prisma.branchTracker.create({
            data: {
                projectId,
                branchName: 'release/0.9.0',
                version: '0.9.0',
                environmentStatuses: { dev: 'release/0.9.0', sit: 'release/0.9.0' },
                isActive: false
            }
        });

        const b2 = await prisma.branchTracker.create({
            data: {
                projectId,
                branchName: 'release/1.0.0',
                version: '1.0.0',
                environmentStatuses: { dev: 'release/1.0.0', sit: 'release/0.9.0' },
                isActive: true
            }
        });

        const response = await request(app.getHttpServer())
            .get(`/api/projects/${projectId}/branches/active`)
            .expect(200);

        // Expected: dev is on 1.0.0, sit is on 0.9.0
        expect(response.body.dev).toBe('release/1.0.0');
        expect(response.body.sit).toBe('release/0.9.0');
    });

    it('should update environment status for a branch', async () => {
        const branch = await prisma.branchTracker.create({
            data: {
                projectId,
                branchName: 'release/2.0.0',
                version: '2.0.0',
                environmentStatuses: { dev: 'release/2.0.0', sit: 'X' },
                isActive: true
            }
        });

        await request(app.getHttpServer())
            .patch(`/api/projects/${projectId}/branches/${branch.id}`)
            .send({ envName: 'sit', branchName: 'release/2.0.0' })
            .expect(200);

        const updated = await prisma.branchTracker.findUnique({ where: { id: branch.id } });
        expect((updated.environmentStatuses as any).sit).toBe('release/2.0.0');
    });
});
