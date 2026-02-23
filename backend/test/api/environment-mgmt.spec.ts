import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Environment Management (e2e)', () => {
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
        // Create a project for these tests
        const project = await prisma.project.create({
            data: { name: 'test-project', displayName: 'Test', team: 'T', teamEmail: 't@e.com' }
        });
        projectId = project.id;
    });

    it('TC-API-030: should add a custom environment', async () => {
        const envDto = {
            name: 'staging',
            displayName: 'Staging',
            promotionOrder: 2,
            valuesFolder: 'staging-values',
            kubernetesNamespace: 'staging-ns'
        };

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/environments`)
            .send(envDto)
            .expect(201);

        expect(response.body.name).toBe('staging');
        expect(response.body.promotionOrder).toBe(2);
    });

    it('TC-API-031: should apply default environment template', async () => {
        await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/environments/apply-template`)
            .expect(201);

        const response = await request(app.getHttpServer())
            .get(`/api/projects/${projectId}/environments`)
            .expect(200);

        expect(response.body.length).toBe(5);
        expect(response.body.map((e: any) => e.name)).toContain('prod');
    });

    it('should list environments ordered by promotionOrder', async () => {
        // Add out of order
        await prisma.environment.create({ data: { projectId, name: 'sit', promotionOrder: 2, valuesFolder: 'v2', displayName: 'S' } });
        await prisma.environment.create({ data: { projectId, name: 'dev', promotionOrder: 1, valuesFolder: 'v1', displayName: 'D' } });

        const response = await request(app.getHttpServer())
            .get(`/api/projects/${projectId}/environments`)
            .expect(200);

        expect(response.body[0].name).toBe('dev');
        expect(response.body[1].name).toBe('sit');
    });
});
