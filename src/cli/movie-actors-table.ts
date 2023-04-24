import { AttributeValue, CreateTableCommand, DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { DelimitedJsonStringTransform } from "./delimited-json-string-transform";
import { ProgressReporterTransform } from "./progress-reporter-transform";

const ddbClient = new DynamoDBClient({
    endpoint: "http://localhost:8000"
});

export const tableName = "movie-actors";

export async function createMovieActorsTable() {

    const request = new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
            {
                AttributeName: "id",
                AttributeType: "S"
            }
        ],
        KeySchema: [
            {
                AttributeName: "id",
                KeyType: "HASH"
            }
        ],
        BillingMode: "PAY_PER_REQUEST",
    });

    await ddbClient.send(request);

}

export async function dumpMovieActorsTable() {
    await pipeline(
        scanTable(),
        new ProgressReporterTransform({ increment: 1000 }),
        new DelimitedJsonStringTransform(),
        createWriteStream("./data/movie-actors-dump.ldjson")
    );
}

async function* scanTable(): AsyncGenerator<Record<string, any>, void, unknown> {
    let startkey: Record<string, AttributeValue> | undefined;
    while (true) {
        const response = await ddbClient.send(new ScanCommand({
            TableName: tableName,
            ExclusiveStartKey: startkey,
        }));
        startkey = response.LastEvaluatedKey;
        if (startkey == null) {
            break;
        }
        for (const item of response.Items || []) {
            yield unmarshall(item);
        }
    }
}
