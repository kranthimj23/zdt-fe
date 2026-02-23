import { Controller, Post, Get, Patch, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { CredentialService } from '../services/credential.service';
import { CreateCredentialDto } from '../dto/create-credential.dto';

@Controller('api/projects/:projectId/credentials')
export class CredentialController {
    constructor(private readonly credentialService: CredentialService) { }

    @Post()
    @HttpCode(201)
    async addCredential(
        @Param('projectId') projectId: string,
        @Body() dto: CreateCredentialDto,
    ) {
        return this.credentialService.createCredential(projectId, dto);
    }

    @Get()
    async listCredentials(@Param('projectId') projectId: string) {
        return this.credentialService.getCredentials(projectId);
    }

    @Patch(':credId')
    async updateCredential(
        @Param('credId') credId: string,
        @Body() dto: Partial<CreateCredentialDto>,
    ) {
        return this.credentialService.updateCredential(credId, dto);
    }

    @Delete(':credId')
    async deleteCredential(@Param('credId') credId: string) {
        return this.credentialService.deleteCredential(credId);
    }
}
