import baseConfig from './jest.config';

export default {
    ...baseConfig,
    testRegex: 'test/(api|security|edge-cases|migration)/.*\\.spec\\.ts$',
    // globalSetup: './test/setup/global-setup.ts',
    // globalTeardown: './test/setup/global-teardown.ts',
    testTimeout: 60000,
};
