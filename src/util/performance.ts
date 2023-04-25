export function AsyncPerfCounter() {
    return function (
        target: Record<string, any>,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<any>) {
        const original: (...args: any[]) => Promise<any> = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const name = `${target.constructor.name}.${propertyKey}`;
            performance.mark(`${name}_start`);
            try {
                return await original.apply(this, args);
            } finally {
                performance.mark(`${name}_end`);
                performance.measure(`${name}`, `${name}_start`, `${name}_end`);
            }
        }
    }
}
