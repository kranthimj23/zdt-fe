import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCredentialDto } from '../dto/create-credential.dto';
import * as crypto from 'crypto';

@Injectable()
export class CredentialService {
    private readonly key: Buffer;
    private readonly algorithm = 'aes-256-gcm';

    constructor(private readonly prisma: PrismaService) {
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY environment variable is not defined');
        }
        this.key = Buffer.from(encryptionKey, 'base64');
        if (this.key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (base64 encoded)');
        }
    }

    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:encrypted
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    }

    decrypt(encryptedBase64: string): string {
        const [ivPart, authTagPart, encryptedPart] = encryptedBase64.split(':');
        if (!ivPart || !authTagPart || !encryptedPart) {
            throw new Error('Invalid encrypted format');
        }

        const iv = Buffer.from(ivPart, 'base64');
        const authTag = Buffer.from(authTagPart, 'base64');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedPart, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    async createCredential(projectId: string, dto: CreateCredentialDto) {
        const encrypted = this.encrypt(dto.value);
        return this.prisma.credential.create({
            data: {
                projectId,
                name: dto.name,
                type: dto.type as any,
                value: encrypted,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
            select: { id: true, name: true, type: true, expiresAt: true, createdAt: true },
        });
    }

    async getCredentials(projectId: string) {
        return this.prisma.credential.findMany({
            where: { projectId },
            select: { id: true, name: true, type: true, expiresAt: true, createdAt: true },
        });
    }

    async getDecryptedValue(credentialId: string): Promise<string> {
        const cred = await this.prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
        return this.decrypt(cred.value);
    }

    async deleteCredential(credentialId: string) {
        return this.prisma.credential.delete({ where: { id: credentialId } });
    }

    async updateCredential(credentialId: string, dto: Partial<CreateCredentialDto>) {
        const data: any = { ...dto };
        if (dto.value) {
            data.value = this.encrypt(dto.value);
        }
        if (dto.expiresAt) {
            data.expiresAt = new Date(dto.expiresAt);
        }
        return this.prisma.credential.update({
            where: { id: credentialId },
            data,
            select: { id: true, name: true, type: true, expiresAt: true, createdAt: true },
        });
    }
}
