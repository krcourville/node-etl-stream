import { argv } from "node:process";
import { program } from "commander";
import { config } from "dotenv";
import { migrateData } from "./migration-process";
import { createMovieActorsTable, dumpMovieActorsTable } from "./movie-actors-table";

performance.mark("process_start");

config();
program.name("etl").version("0.0.0").description("Proof of Concept, using streams for ETL");

program
    .command("echo <text>")
    .description("Basic cli test. Writes <text> to stdout")
    .action((text) => {
        console.log(text);
    });

program
    .command("migrate")
    .description("Run the migration process")
    .action(async () => migrateData());

program
    .command("create-movie-actors-table")
    .description("Create DynamoDb table movie-actors")
    .action(async () => createMovieActorsTable());

program
    .command("dump-movie-actors-table")
    .description("Dump content of movie-actors as nd-json to ./data/movie-actors-dump.ldjson")
    .action(async () => dumpMovieActorsTable())

await program.parseAsync(argv);

performance.mark("process_end");
performance.measure("process_time", "process_start", "process_end");
performance.getEntriesByName("process_time").forEach(measureItem => {
    console.log(`${measureItem.name}: ${measureItem.duration}`);
});

/**
 * total records: 5463
 *
 * Process time without GQL batching:
 * 45,547.17499998212
 *
 * Apollo Batch Link Batching made no difference
 *
 * With batching api requests X 10
 * 4,974.97524997592
 *
 * With batching api requests X 25
 * 4,707.205332994461
 *
 * With dynamod writes:
 * 67,389.74212497473
 */
