import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEnvironmentDto } from '../dto/create-environment.dto';

@Injectable()
export class EnvironmentService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly defaultTemplate = [
        { name: 'dev', displayName: 'Development', promotionOrder: 1, valuesFolder: 'dev-values', isProduction: false },
        { name: 'sit', displayName: 'System Integration Testing', promotionOrder: 2, valuesFolder: 'sit-values', isProduction: false },
        { name: 'uat', displayName: 'User Acceptance Testing', promotionOrder: 3, valuesFolder: 'uat-values', isProduction: false },
        { name: 'pre-prod', displayName: 'Pre-Production', promotionOrder: 4, valuesFolder: 'pre-prod-values', isProduction: false },
        { name: 'prod', displayName: 'Production', promotionOrder: 5, valuesFolder: 'prod-values', isProduction: true },
    ];

    async applyTemplate(projectId: string) {
        const existing = await this.prisma.environment.count({ where: { projectId } });
        if (existing > 0) {
            throw new ConflictException('Project already has environments. Remove them first or add individually.');
        }

        return this.prisma.environment.createMany({
            data: this.defaultTemplate.map(env => ({ ...env, projectId })),
        });
    }

    async listEnvironments(projectId: string) {
        return this.prisma.environment.findMany({
            where: { projectId },
            orderBy: { promotionOrder: 'asc' },
        });
    }

    async addEnvironment(projectId: string, dto: CreateEnvironmentDto) {
        const existing = await this.prisma.environment.findFirst({
            where: {
                projectId,
                OR: [
                    { name: dto.name },
                    { promotionOrder: dto.promotionOrder },
                ],
            },
        });

        if (existing) {
            if (existing.name === dto.name) {
                throw new ConflictException(`Environment "${dto.name}" already exists in this project`);
            }
            throw new ConflictException(`Promotion order ${dto.promotionOrder} is already used by "${existing.name}"`);
        }

        return this.prisma.environment.create({
            data: { ...dto, projectId },
        });
    }

    async updateEnvironment(envId: string, dto: Partial<CreateEnvironmentDto>) {
        return this.prisma.environment.update({
            where: { id: envId },
            data: dto,
        });
    }

    async removeEnvironment(envId: string) {
        return this.prisma.environment.delete({ where: { id: envId } });
    }
}
