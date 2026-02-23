import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Repo and Credential Management (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaServiceMock;
    let projectId: string;

    beforeAll(async () => {
        prisma = new PrismaServiceMock();
        process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
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
        delete process.env.ENCRYPTION_KEY;
    });

    beforeEach(async () => {
        prisma.reset();
        const project = await prisma.project.create({
            data: { name: 'test-project', displayName: 'Test', team: 'T', teamEmail: 't@e.com' }
        });
        projectId = project.id;
    });

    it('TC-API-010: should add a source repository', async () => {
        const repoDto = {
            name: 'my-app',
            repoUrl: 'https://github.com/org/my-app.git',
            repoType: 'app',
            defaultBranch: 'main'
        };

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/source-repos`)
            .send(repoDto)
            .expect(201);

        expect(response.body.name).toBe('my-app');
        expect(response.body.repoUrl).toBe(repoDto.repoUrl);
    });

    it('TC-API-020: should add a credential and it should be encrypted', async () => {
        const credDto = {
            name: 'github-token',
            type: 'git-token',
            value: 'ghp_secret_token_123'
        };

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/credentials`)
            .send(credDto)
            .expect(201);

        expect(response.body.name).toBe('github-token');

        // Check storage directly via prisma mock
        const stored = await prisma.credential.findFirst({ where: { projectId } });
        expect(stored.value).not.toBe(credDto.value); // Should be encrypted
    });

    it('TC-API-050: should include environments in full config export and omit sensitive values', async () => {
        // Setup complex project
        await prisma.environment.create({ data: { projectId, name: 'dev', promotionOrder: 1, valuesFolder: 'v1', displayName: 'D' } });
        await prisma.sourceRepo.create({ data: { projectId, name: 'app', repoUrl: 'url', repoType: 'app' } });
        await prisma.credential.create({ data: { projectId, name: 'c1', type: 'git-token', value: 'secret' } });

        const response = await request(app.getHttpServer())
            .get(`/api/projects/${projectId}/config`)
            .expect(200);

        expect(response.body.project.name).toBe('test-project');
        expect(response.body.environments.length).toBe(1);
        expect(response.body.sourceRepos.length).toBe(1);
        expect(response.body.credentials.length).toBe(1);
        expect(response.body.credentials[0].name).toBe('c1');
        // Redaction verification
        expect(response.body.credentials[0].value).toBeUndefined();
    });
});
