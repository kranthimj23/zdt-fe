import baseConfig from './jest.config';

export default {
    ...baseConfig,
    testRegex: 'test/unit/.*\\.spec\\.ts$',
    testTimeout: 10000,
};
