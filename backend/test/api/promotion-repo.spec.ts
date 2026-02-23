import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Promotion Repository (e2e)', () => {
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
            data: { name: 'promo-project', displayName: 'Promo', team: 'T', teamEmail: 't@e.com' }
        });
        projectId = project.id;
    });

    it('TC-API-010: should set promotion repository', async () => {
        const promoDto = {
            repoUrl: 'https://github.com/org/promo-repo.git',
            defaultBranch: 'master',
            helmChartsPath: 'charts'
        };

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/promotion-repo`)
            .send(promoDto)
            .expect(201);

        expect(response.body.repoUrl).toBe(promoDto.repoUrl);
        expect(response.body.projectId).toBe(projectId);
    });

    it('TC-API-011: should fail if promotion repo already exists', async () => {
        const promoDto = {
            repoUrl: 'https://github.com/org/promo-repo.git'
        };

        // First creation
        await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/promotion-repo`)
            .send(promoDto)
            .expect(201);

        // Second creation should fail
        await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/promotion-repo`)
            .send({ repoUrl: 'https://github.com/org/other.git' })
            .expect(409);
    });

    it('TC-API-012: should verify connectivity (mocked)', async () => {
        await prisma.promotionRepo.create({
            data: {
                projectId,
                repoUrl: 'https://github.com/org/promo-repo.git',
                helmChartsPath: 'charts',
                defaultBranch: 'master'
            }
        });

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/promotion-repo/verify`)
            .expect(200);

        expect(response.body).toHaveProperty('accessible');
    });
});
