import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateCredentialDto {
    @IsString()
    name: string;

    @IsEnum(['git-token', 'jira-api-key', 'gcp-service-account', 'generic'], {
        message: 'type must be one of: git-token, jira-api-key, gcp-service-account, generic',
    })
    type: 'git-token' | 'jira-api-key' | 'gcp-service-account' | 'generic';

    @IsString()
    value: string;

    @IsDateString()
    @IsOptional()
    expiresAt?: string;
}
