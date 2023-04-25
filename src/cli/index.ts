import { argv } from "node:process";
import groupBy from "lodash/groupBy";
import mean from "lodash/mean";
import sum from "lodash/sum";
import { performance } from "node:perf_hooks";
import { program } from "commander";
import { config } from "dotenv";
import { migrateData } from "./migration-process";
import { createMovieActorsTable, dumpMovieActorsTable } from "./movie-actors-table";
import { AsyncPerfCounter } from "../util/performance";
import { EntityStore } from "@apollo/client/cache";

performance.mark("process_start");

config();
program.name("etl").version("0.0.0").description("Proof of Concept, using streams for ETL");

program
    .command("echo <text>")
    .description("Basic cli test. Writes <text> to stdout")
    .action((text) => {
        console.log(text);
    });

class PerfTestClass {
    @AsyncPerfCounter()
    public async process(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, 100);
        });
    }
}

program
    .command("test-async-perf")
    .description("Test for AsyncPerfCounter")
    .action(async () => {
        const test = new PerfTestClass();
        await test.process();
        await test.process();
        await test.process();
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
type Measure = {
    name: string;
    total: number;
    min: number;
    max: number;
    avg: number;
    entries: PerformanceEntry[];
};
const measures = performance
    .getEntriesByType("measure");
const groupedMeasures = groupBy(measures, "name");
const metrics = Object.keys(groupedMeasures).map(key => {
    const entries = groupedMeasures[key];
    const durations = entries.map(e => e.duration);
    return <Measure>{
        name: key,
        total: sum(durations),
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: mean(durations),
        entries,
    };
});
for (const metric of metrics.sort((a, b) => a.total - b.total)) {
    console.log(`METRIC: ${metric.name}: total=${metric.total} avg=${metric.avg} min=${metric.min} max=${metric.max}`);
}

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
