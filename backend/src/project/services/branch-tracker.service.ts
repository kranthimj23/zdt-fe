import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchTrackerDto } from '../dto/create-branch-tracker.dto';

@Injectable()
export class BranchTrackerService {
    constructor(private readonly prisma: PrismaService) { }

    async createBranch(projectId: string, dto: CreateBranchTrackerDto) {
        const envs = await this.prisma.environment.findMany({
            where: { projectId },
            orderBy: { promotionOrder: 'asc' },
        });

        const environmentStatuses: Record<string, string> = {};
        envs.forEach((env, index) => {
            environmentStatuses[env.name] = index === 0 ? dto.branchName : 'X';
        });

        return this.prisma.branchTracker.create({
            data: {
                projectId,
                branchName: dto.branchName,
                version: dto.version,
                environmentStatuses: environmentStatuses as any,
                isActive: true,
            },
        });
    }

    async getActiveBranches(projectId: string): Promise<Record<string, string>> {
        const trackers = await this.prisma.branchTracker.findMany({
            where: { projectId, isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        const envs = await this.prisma.environment.findMany({
            where: { projectId },
            orderBy: { promotionOrder: 'asc' },
        });

        const activeBranches: Record<string, string> = {};
        for (const env of envs) {
            for (const tracker of trackers) {
                const statuses = tracker.environmentStatuses as Record<string, string>;
                if (statuses[env.name] && statuses[env.name] !== 'X') {
                    activeBranches[env.name] = statuses[env.name];
                    break;
                }
            }
        }

        return activeBranches;
    }

    async getPromotionBranches(projectId: string, sourceEnv: string, targetEnv: string) {
        const activeBranches = await this.getActiveBranches(projectId);
        return {
            sourceBranch: activeBranches[sourceEnv] || null,
            targetBranch: activeBranches[targetEnv] || null,
        };
    }

    async updateEnvironmentStatus(trackerId: string, envName: string, branchName: string) {
        const tracker = await this.prisma.branchTracker.findUniqueOrThrow({
            where: { id: trackerId },
        });
        const statuses = tracker.environmentStatuses as Record<string, string>;
        statuses[envName] = branchName;

        return this.prisma.branchTracker.update({
            where: { id: trackerId },
            data: { environmentStatuses: statuses as any },
        });
    }

    async listBranches(projectId: string) {
        return this.prisma.branchTracker.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
