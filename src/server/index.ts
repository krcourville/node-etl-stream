import { readFile } from "node:fs/promises";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import random from "lodash/random";
import { Actor, Resolvers } from "../generated/actor-types";
import { pool } from "../db";

export type ServerContext = {
}

async function main() {
    const sources = await readFile("src/server/schema.graphql");
    const typeDefs = sources.toString();

    const resolvers: Resolvers = {
        Query: {
            actors: queryActors,
            actor: queryActor,
        },
    };

    const server = new ApolloServer<ServerContext>({
        typeDefs,
        resolvers,
        allowBatchedHttpRequests: true
    });

    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
    });

    console.log(`Server is running at: ${url}`);
}

await main();


type QueryActorDao = {
    actor_id: number;
    first_name: string;
    last_name: string;
}

async function queryActors() {
    const response = await pool.query(`
        select  actor_id , first_name, last_name
        from public.actor
        limit 10;
    `);
    return response.rows.map(fromDbActor);
}

async function sleep(timeInMs: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMs);
    })
}

async function queryActor(_parent: any, { id }, _ctx: any, _info: any): Promise<Actor | null> {
    const response = await pool.query(`
        select  actor_id , first_name, last_name
            from public.actor
            where actor_id = $1;
    `, [id]);
    await sleep(random(100, 300));


    return response.rowCount > 0
        ? fromDbActor(response.rows[0])
        : null;
}


function fromDbActor(record: QueryActorDao): Actor {
    return {
        id: String(record.actor_id),
        firstName: record.first_name,
        lastName: record.last_name,
    };
}
