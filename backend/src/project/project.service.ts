import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RepoVerificationService } from './services/repo-verification.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CreatePromotionRepoDto } from './dto/create-promotion-repo.dto';
import { CreateSourceRepoDto } from './dto/create-source-repo.dto';

@Injectable()
export class ProjectService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly repoVerificationService: RepoVerificationService,
    ) { }

    async createProject(dto: CreateProjectDto) {
        const existing = await this.prisma.project.findUnique({ where: { name: dto.name } });
        if (existing) {
            throw new ConflictException(`Project "${dto.name}" already exists`);
        }

        return this.prisma.project.create({ data: dto });
    }

    async listProjects(pagination: PaginationDto) {
        const page = pagination.page || 1;
        const limit = pagination.limit || 20;
        const [items, total] = await Promise.all([
            this.prisma.project.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.project.count(),
        ]);

        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getProjectById(id: string) {
        return this.prisma.project.findUniqueOrThrow({ where: { id } });
    }

    async getProjectByName(name: string) {
        return this.prisma.project.findUniqueOrThrow({ where: { name } });
    }

    async updateProject(id: string, dto: UpdateProjectDto) {
        return this.prisma.project.update({ where: { id }, data: dto });
    }

    async archiveProject(id: string) {
        return this.prisma.project.update({
            where: { id },
            data: { status: 'archived' },
        });
    }

    // Promotion Repo
    async setPromotionRepo(projectId: string, dto: CreatePromotionRepoDto) {
        const existing = await this.prisma.promotionRepo.findUnique({ where: { projectId } });
        if (existing) {
            // Guide says throw, but we could also update. I'll follow the guide.
            throw new ConflictException('Project already has a promotion repo. Update it instead.');
        }

        const repo = await this.prisma.promotionRepo.create({
            data: { projectId, ...dto },
        });

        // Optionally verify connectivity on creation
        await this.repoVerificationService.verifyPromotionRepo(projectId);

        return repo;
    }

    async getPromotionRepo(projectId: string) {
        return this.prisma.promotionRepo.findUnique({ where: { projectId } });
    }

    // Source Repos
    async addSourceRepo(projectId: string, dto: CreateSourceRepoDto) {
        const existing = await this.prisma.sourceRepo.findFirst({
            where: { projectId, repoUrl: dto.repoUrl },
        });
        if (existing) {
            throw new ConflictException('This repository URL is already registered in this project');
        }

        // Map aql-db and sql-db to aql_db and sql_db for Prisma
        const repoType = dto.repoType === 'aql-db' ? 'aql_db' :
            dto.repoType === 'sql-db' ? 'sql_db' :
                dto.repoType;

        return this.prisma.sourceRepo.create({
            data: {
                projectId,
                ...dto,
                repoType: repoType as any,
            },
        });
    }

    async listSourceRepos(projectId: string, repoType?: string) {
        const where: any = { projectId };
        if (repoType) where.repoType = repoType;
        return this.prisma.sourceRepo.findMany({ where });
    }

    async getSourceRepo(repoId: string) {
        return this.prisma.sourceRepo.findUniqueOrThrow({ where: { id: repoId } });
    }

    async removeSourceRepo(repoId: string) {
        return this.prisma.sourceRepo.delete({ where: { id: repoId } });
    }
}
