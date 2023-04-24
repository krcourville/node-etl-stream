import internal, { Transform } from "node:stream";

/**
 * Provides progress feedback to stdout
 */
export class ProgressReporterTransform extends Transform {
    private itemCount = 0;

    constructor(private config: { increment: number; }) {
        super({
            objectMode: true
        });
    }

    _transform(chunk: Record<string, any>, _encoding: BufferEncoding, callback: internal.TransformCallback): void {
        this.itemCount++;
        if (this.itemCount % this.config.increment === 0) {
            console.log(`PROCESSED: ${this.itemCount}`);
        }

        this.push(chunk);
        callback();
    }

    _final(callback: (error?: Error | null | undefined) => void): void {
        console.log(`PROCESSING_COMPLETE: ${this.itemCount}`);
        callback();
    }
}
