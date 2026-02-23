import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Security (e2e/api)', () => {
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
            data: { name: 'sec-project', displayName: 'Security', team: 'T', teamEmail: 't@e.com' }
        });
        projectId = project.id;
    });

    it('TC-SEC-001: Credential values never in API responses', async () => {
        const secretValue = 'ghp_sensitive_token_999';
        await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/credentials`)
            .send({ name: 'github', type: 'git-token', value: secretValue })
            .expect(201);

        // List credentials
        const listRes = await request(app.getHttpServer())
            .get(`/api/projects/${projectId}/credentials`)
            .expect(200);

        // Verify secretValue is not in the response body anywhere
        const bodyStr = JSON.stringify(listRes.body);
        expect(bodyStr).not.toContain(secretValue);
        expect(listRes.body[0].value).toBeUndefined();
    });

    it('TC-SEC-003: SQL injection in project name should be rejected by validation', async () => {
        const maliciousName = "test'; DROP TABLE projects; --";
        await request(app.getHttpServer())
            .post('/api/projects')
            .send({
                name: maliciousName,
                displayName: 'Malicious',
                team: 'X',
                teamEmail: 'x@e.com'
            })
            .expect(400); // ValidationPipe (Regex) should catch this
    });

    it('TC-SEC-004: SQL injection in repo URL should be rejected by validation', async () => {
        const maliciousUrl = "https://github.com/o/r.git'; DROP TABLE projects; --";
        await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/source-repos`)
            .send({
                name: 'malicious',
                repoUrl: maliciousUrl,
                repoType: 'app'
            })
            .expect(400); // Regex should catch this
    });
});
