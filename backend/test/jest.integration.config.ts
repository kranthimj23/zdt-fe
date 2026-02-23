import baseConfig from './jest.config';

export default {
    ...baseConfig,
    testRegex: 'test/integration/.*\\.spec\\.ts$',
    // globalSetup: './test/setup/global-setup.ts',
    // globalTeardown: './test/setup/global-teardown.ts',
    testTimeout: 60000,
};
