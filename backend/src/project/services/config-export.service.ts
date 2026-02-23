import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchTrackerService } from './branch-tracker.service';

export interface ProjectConfig {
    project: {
        id: string;
        name: string;
        displayName: string;
        team: string;
        status: string;
    };
    promotionRepo: {
        repoUrl: string;
        helmChartsPath: string;
        defaultBranch: string;
    } | null;
    sourceRepos: Array<{
        name: string;
        repoUrl: string;
        repoType: string;
        defaultBranch: string;
    }>;
    environments: Array<{
        name: string;
        promotionOrder: number;
        valuesFolder: string;
        namespace: string | null;
        isProduction: boolean;
    }>;
    activeBranches: Record<string, string>;
    credentials: Array<{
        name: string;
        type: string;
    }>;
}

@Injectable()
export class ConfigExportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly branchTrackerService: BranchTrackerService,
    ) { }

    async getFullConfig(projectId: string): Promise<ProjectConfig> {
        const [project, promotionRepo, sourceRepos, environments, credentials] = await Promise.all([
            this.prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
            this.prisma.promotionRepo.findUnique({ where: { projectId } }),
            this.prisma.sourceRepo.findMany({ where: { projectId } }),
            this.prisma.environment.findMany({ where: { projectId }, orderBy: { promotionOrder: 'asc' } }),
            this.prisma.credential.findMany({
                where: { projectId },
                select: { id: true, name: true, type: true, expiresAt: true },
            }),
        ]);

        const activeBranches = await this.branchTrackerService.getActiveBranches(projectId);

        return {
            project: {
                id: project.id,
                name: project.name,
                displayName: project.displayName,
                team: project.team,
                status: project.status,
            },
            promotionRepo: promotionRepo ? {
                repoUrl: promotionRepo.repoUrl,
                helmChartsPath: promotionRepo.helmChartsPath,
                defaultBranch: promotionRepo.defaultBranch,
            } : null,
            sourceRepos: sourceRepos.map(r => ({
                name: r.name,
                repoUrl: r.repoUrl,
                repoType: r.repoType,
                defaultBranch: r.defaultBranch,
            })),
            environments: environments.map(e => ({
                name: e.name,
                promotionOrder: e.promotionOrder,
                valuesFolder: e.valuesFolder,
                namespace: e.kubernetesNamespace,
                isProduction: e.isProduction,
            })),
            activeBranches,
            credentials: credentials.map(c => ({
                name: c.name,
                type: c.type,
            })),
        };
    }
}
