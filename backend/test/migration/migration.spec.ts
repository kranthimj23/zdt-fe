import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Migration (e2e)', () => {
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
            data: { name: 'mig-project', displayName: 'Mig', team: 'T', teamEmail: 't@e.com' }
        });
        projectId = project.id;
    });

    it('TC-MIG-002: Import existing Jenkins repo lists', async () => {
        const repoList = `
            https://github.com/org/repo1.git
            https://github.com/org/repo2.git
            https://github.com/org/repo3.git
        `;

        const response = await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/migration/import-repos`)
            .send({
                repoListText: repoList,
                repoType: 'app'
            })
            .expect(201);

        expect(response.body.importedCount).toBe(3);

        const repos = await prisma.sourceRepo.findMany({ where: { projectId } });
        expect(repos.length).toBe(3);
        expect(repos.map(r => r.repoUrl)).toContain('https://github.com/org/repo1.git');
    });

    it('TC-MIG-001: Import meta-sheet (stub check)', async () => {
        await request(app.getHttpServer())
            .post(`/api/projects/${projectId}/migration/import-meta-sheet`)
            .send({ filePath: 'meta-sheet.xlsx' })
            .expect(201);
    });
});
