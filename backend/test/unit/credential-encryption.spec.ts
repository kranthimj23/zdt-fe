import { CredentialService } from '../../src/project/services/credential.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Credential Encryption (TC-UNIT-030 to 033)', () => {
    let service: CredentialService;
    let prismaMock: PrismaServiceMock;

    beforeEach(() => {
        prismaMock = new PrismaServiceMock();
        // Correct 32-byte base64 key
        process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        service = new CredentialService(prismaMock as any);
    });

    afterAll(() => {
        delete process.env.ENCRYPTION_KEY;
    });

    it('TC-UNIT-030: should encrypt credential value before storage', () => {
        const plaintext = 'ghp_abc123def456';
        const encrypted = service.encrypt(plaintext);

        expect(encrypted).not.toBe(plaintext);
        expect(typeof encrypted).toBe('string');

        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
    });

    it('TC-UNIT-031: should be decryptable', () => {
        const plaintext = 'my-secret-token';
        const encrypted = service.encrypt(plaintext);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
    });

    it('TC-UNIT-032: should produce different ciphertexts for the same input (unique IV)', () => {
        const plaintext = 'same-value';
        const encrypted1 = service.encrypt(plaintext);
        const encrypted2 = service.encrypt(plaintext);

        expect(encrypted1).not.toBe(encrypted2);

        const decrypted1 = service.decrypt(encrypted1);
        const decrypted2 = service.decrypt(encrypted2);

        expect(decrypted1).toBe(plaintext);
        expect(decrypted2).toBe(plaintext);
    });

    it('TC-UNIT-033: should fail on tampered ciphertext', () => {
        const plaintext = 'integrity-test';
        const encrypted = service.encrypt(plaintext);

        // Tamper the string (it's iv:authTag:encrypted)
        const parts = encrypted.split(':');
        const tamperedEncrypted = 'a' + parts[2].substring(1);
        const tamperedPayload = [parts[0], parts[1], tamperedEncrypted].join(':');

        expect(() => service.decrypt(tamperedPayload)).toThrow();
    });
});
