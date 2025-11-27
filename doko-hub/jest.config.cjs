const { defaults: tsjPreset } = require('ts-jest/presets'); 

/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest', 
    
    testEnvironment: 'node', 
    
    testMatch: [
        '<rootDir>/src/tests/**/*.api.test.ts', 
        '<rootDir>/src/**/*.spec.ts' 
    ],
    
    testPathIgnorePatterns: [
        '/node_modules/', 
        'src/routes/page.svelte.spec.ts',
        'src/demo.spec.ts',
        '/src/tests/setup/', 
    ],
    
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json', 
            useESM: true,
        }],

        '^.+\\.svelte$': [
            'svelte-jester', 
            {
                preprocess: true, 
            },
        ],
        
        '^.+\\.js$': 'babel-jest',
    },
    
    
    moduleNameMapper: {
        '^\\$env/dynamic/private$': '<rootDir>/src/tests/setup/env-test.js',
        '^\\$lib/(.*)$': '<rootDir>/src/lib/$1',
    },
    
    moduleFileExtensions: ['js', 'ts', 'json', 'node', 'svelte'],

    transform: {
    '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: 'tsconfig.json',
        useESM: true,
    }],
    },
};
module.exports = config;