import { Controller, Post, Get, Patch, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ConfigExportService } from './services/config-export.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('api/projects')
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
        private readonly configExportService: ConfigExportService,
    ) { }

    @Post()
    @HttpCode(201)
    async createProject(@Body() dto: CreateProjectDto) {
        return this.projectService.createProject(dto);
    }

    @Get()
    async listProjects(@Query() pagination: PaginationDto) {
        return this.projectService.listProjects(pagination);
    }

    @Get(':id')
    async getProject(@Param('id') id: string) {
        return this.projectService.getProjectById(id);
    }

    @Get('by-name/:name')
    async getProjectByName(@Param('name') name: string) {
        return this.projectService.getProjectByName(name);
    }

    @Patch(':id')
    async updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
        return this.projectService.updateProject(id, dto);
    }

    @Delete(':id')
    async archiveProject(@Param('id') id: string) {
        return this.projectService.archiveProject(id);
    }

    @Get(':id/config')
    async getFullConfig(@Param('id') id: string) {
        return this.configExportService.getFullConfig(id);
    }
}
