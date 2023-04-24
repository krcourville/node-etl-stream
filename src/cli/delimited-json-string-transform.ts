import internal, { Transform } from "node:stream";

/**
 * Stream Transform that accepts a stream of objects
 * and outputs a stream of newline-delimited JSON
 */
export class DelimitedJsonStringTransform extends Transform {
    constructor() {
        super({
            objectMode: true
        });
    }

    _transform(chunk: Record<string, any>, _encoding: BufferEncoding, callback: internal.TransformCallback): void {
        const next = JSON.stringify(chunk) + "\n";
        this.push(next);
        callback();
    }
}
