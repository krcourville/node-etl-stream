import { pipeline } from "node:stream/promises";
import { marshall } from "@aws-sdk/util-dynamodb";
import internal, { Transform, Writable } from "node:stream";
import { BatchWriteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v5 as uuid } from "uuid";
import { pool } from "../db";
import { ActorApiClient } from "../services/actor-api-client";
import { ProgressReporterTransform } from "./progress-reporter-transform";
import QueryStream from "pg-query-stream";
import { tableName } from "./movie-actors-table";


const ddbClient = new DynamoDBClient({
    endpoint: "http://localhost:8000"
});

export async function migrateData() {
    await pipeline(
        await getFilmActorsStream(),
        new ProgressReporterTransform({ increment: 100 }),
        new AugmentActorNameTransform({
            batchSize: 25,
            actorApiClient: new ActorApiClient()
        }),
        new MapPropertiesTransform(),
        new DynamoDbWriteStream({
            tablename: tableName,
            ddbClient,
        })
    );
}

function getFilmActorsStream(): Promise<QueryStream> {
    return new Promise((resolve, reject) => {
        pool.connect((err, client, done) => {
            if (err) {
                reject(err);
                return;
            }

            const query = new QueryStream(`
                select
                    f.title,
                    f.description,
                    fa.actor_id,
                    fa.film_id
                from public.film f
                    inner join film_actor fa
                    on f.film_id = fa.actor_id
            `);
            const inputStream = client.query(query);
            inputStream.on("end", done);
            resolve(inputStream);
        });
    });
}

/**
 * Stream Transform that accepts a stream of objects
 * and outputs the same objects, augmented with
 * actor name
 */
class AugmentActorNameTransform extends Transform {
    private buffer: Record<string, any>[] = [];

    constructor(private config: { batchSize: number, actorApiClient: ActorApiClient }) {
        super({
            objectMode: true
        })
    }

    async _transform(actorMovie: Record<string, any>, _encoding: BufferEncoding, done: internal.TransformCallback): Promise<void> {
        const { actor_id } = actorMovie;
        if (actor_id == null) {
            throw new Error(`Expected property 'actor_id' was not found in data.`)
        }
        this.buffer.push(actorMovie);

        if (this.buffer.length % this.config.batchSize === 0) {
            await this.processBuffer();
        }
        done();
    }

    async _final(callback: (error?: Error | null | undefined) => void): Promise<void> {
        await this.processBuffer();
        callback();
    }

    private async processBuffer(): Promise<void> {
        const queries = this.buffer
            .map(async actorMovie => {
                const actor = await this.config.actorApiClient.getActorNameById(actorMovie.actor_id);
                if (actor == null) {
                    throw new Error(`Actor not found with id of: ${actorMovie.actor_id}`);
                }
                return {
                    ...actorMovie,
                    ...actor,
                };
            });
        this.buffer.length = 0;
        await Promise.all(queries).then(responses => {
            for (const response of responses) {
                this.push(response);
            }
        });
    }
}

class MapPropertiesTransform extends Transform {
    private uuidNamespace = "d67d13a2-44b7-4046-aa94-699598bfe95b";

    constructor() {
        super({ objectMode: true })
    }

    _transform(actorMovie: Record<string, any>, _encoding: BufferEncoding, done: internal.TransformCallback) {
        // To ensure the same result on subsequent imports; a uuid is generated
        // but, will always be the same, based on actor and film id.
        const id = uuid(`${actorMovie.actor_id}-${actorMovie.film_id}`, this.uuidNamespace);
        this.push({
            id,
            title: actorMovie.title,
            description: actorMovie.description,
            actorId: actorMovie.actor_id,
            filmId: actorMovie.film_id,
            firstName: actorMovie.firstName,
            lastName: actorMovie.lastName,
        });
        done();
    }
}

/**
 * Writable stream that dumps objects into a DynamoDb table via BatchWriteItem
 *
 * https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
 */
class DynamoDbWriteStream extends Writable {
    private maxBufferSize = 25;
    private buffer: Record<string, any>[] = []

    constructor(private config: { tablename: string, ddbClient: DynamoDBClient }) {
        super({
            objectMode: true
        });
    }


    async _write(chunk: any, _encoding: BufferEncoding, done: (error?: Error | null | undefined) => void): Promise<void> {
        this.buffer.push(chunk);

        if (this.buffer.length >= this.maxBufferSize) {
            await this.sendBatch();
        }
        done();
    }



    async _final(done: (error?: Error | null | undefined) => void): Promise<void> {
        await this.sendBatch();
        done();
    }

    private async sendBatch(): Promise<void> {
        const request = new BatchWriteItemCommand({
            RequestItems: {
                [this.config.tablename]: this.buffer.map(item => ({
                    PutRequest: {
                        Item: marshall(item)
                    }
                }))
            }
        });
        this.writeCount += this.buffer.length;
        this.buffer.length = 0;
        await this.config.ddbClient.send(request);
    }
}
