import type { Config } from 'jest';

const config: Config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '..',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/project/**/*.ts',
        '!src/project/**/*.module.ts',
        '!src/project/**/*.dto.ts',
        '!src/project/**/*.interface.ts',
        '!src/project/**/__tests__/**',
    ],
    coverageDirectory: './test/reports/coverage',
    coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90,
        },
        './src/project/services/credential.service.ts': {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
        './src/project/project.service.ts': {
            branches: 90,
            lines: 90,
        },
    },
    testEnvironment: 'node',
    // setupFilesAfterEnv: ['./test/setup/jest.setup.ts'],
    testTimeout: 30000,
    verbose: true,
};

export default config;
