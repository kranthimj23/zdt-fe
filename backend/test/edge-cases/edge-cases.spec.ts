import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Edge Cases (e2e)', () => {
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

    beforeEach(async () => {
        prisma.reset();
    });

    it('TC-EDGE-001/002: Project with zero repos or environments', async () => {
        const project = await prisma.project.create({
            data: { name: 'empty-project', displayName: 'Empty', team: 'T', teamEmail: 't@e.com' }
        });

        const response = await request(app.getHttpServer())
            .get(`/api/projects/${project.id}/config`)
            .expect(200);

        expect(response.body.sourceRepos).toEqual([]);
        expect(response.body.environments).toEqual([]);
        expect(response.body.promotionRepo).toBeNull();
    });

    it('TC-EDGE-003: Very long project description', async () => {
        const longDesc = 'A'.repeat(5000);
        const response = await request(app.getHttpServer())
            .post('/api/projects')
            .send({
                name: 'long-desc-project',
                displayName: 'Long',
                team: 'T',
                teamEmail: 't@e.com',
                description: longDesc
            })
            .expect(201);

        expect(response.body.description.length).toBe(5000);
    });

    it('TC-EDGE-005: Unicode in display name and description', async () => {
        const unicodeName = '项目名称 (Project Name)';
        const unicodeDesc = '🚀 Multilingual description: 한국어, 日本語, हिन्दी';

        const response = await request(app.getHttpServer())
            .post('/api/projects')
            .send({
                name: 'unicode-project',
                displayName: unicodeName,
                team: 'T',
                teamEmail: 't@e.com',
                description: unicodeDesc
            })
            .expect(201);

        expect(response.body.displayName).toBe(unicodeName);
        expect(response.body.description).toBe(unicodeDesc);
    });
});
