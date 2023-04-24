
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    overwrite: true,
    schema: "src/server/schema.graphql",
    documents: ["src/**/*.tsx"],
    generates: {
        "src/generated/actor-types.ts": {
            plugins: ["typescript", "typescript-resolvers"]
        },
        "src/generated/gql/": {
            preset: "client",
            plugins: [],
            presetConfig: {
                gqlTagName: "gql"
            },
        }
    },
    ignoreNoDocuments: true,
    config: {
        useIndexSignature: true,
        contextType: "src/server/index#ServerContext"
    }
};

export default config;
