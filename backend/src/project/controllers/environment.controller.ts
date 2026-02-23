import { Controller, Post, Get, Patch, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { EnvironmentService } from '../services/environment.service';
import { CreateEnvironmentDto } from '../dto/create-environment.dto';

@Controller('api/projects/:projectId/environments')
export class EnvironmentController {
    constructor(private readonly environmentService: EnvironmentService) { }

    @Post()
    @HttpCode(201)
    async addEnvironment(
        @Param('projectId') projectId: string,
        @Body() dto: CreateEnvironmentDto,
    ) {
        return this.environmentService.addEnvironment(projectId, dto);
    }

    @Get()
    async listEnvironments(@Param('projectId') projectId: string) {
        return this.environmentService.listEnvironments(projectId);
    }

    @Post('apply-template')
    @HttpCode(201)
    async applyTemplate(@Param('projectId') projectId: string) {
        return this.environmentService.applyTemplate(projectId);
    }

    @Patch(':envId')
    async updateEnvironment(
        @Param('envId') envId: string,
        @Body() dto: Partial<CreateEnvironmentDto>,
    ) {
        return this.environmentService.updateEnvironment(envId, dto);
    }

    @Delete(':envId')
    async removeEnvironment(@Param('envId') envId: string) {
        return this.environmentService.removeEnvironment(envId);
    }
}
