const REGEXP_HTML_ESCAPES = /[&<>"']/g;

const MAPPING_HTML_ESCAPES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;',
} as const;

function escape(value: unknown): string {
	return String(value).replace(REGEXP_HTML_ESCAPES, (c) => MAPPING_HTML_ESCAPES[c as keyof typeof MAPPING_HTML_ESCAPES]);
}

const REGEXP_TRIM_START = /\s+</g;
const REGEXP_TRIM_END = />\s+/g;

function trim(value: string): string {
	return value.replace(REGEXP_TRIM_START, '<').replace(REGEXP_TRIM_END, '>');
}

export function* html([initial = '', ...strings]: TemplateStringsArray, ...expressions: unknown[]): Generator<string> {
	yield trim(initial);

	for (const [i, string] of strings.entries()) {
		yield* render(expressions[i]);
		yield trim(string);
	}
}

function isGenerator(value: any): value is Generator<string> {
	return typeof value !== 'string' && typeof value?.[Symbol.iterator] === 'function';
}

function* render(chunk: unknown): Generator<string> {
	if (chunk instanceof Promise) {
		const id = crypto.randomUUID();
		queue.set(id, chunk);

		yield `<server-render data-id='${id}'></server-render>`;
	} else if (Array.isArray(chunk)) {
		for (const part of chunk) yield* render(part);
	} else if (isGenerator(chunk)) yield* chunk;
	else yield escape(chunk);
}

const queue = new Map<string, Promise<unknown>>();

export async function stringify(template: Generator<string>): Promise<string> {
	const output = [];
	const chain = new Map<string, string[]>();

	for (const chunk of template) output.push(chunk);

	while (queue.size) {
		const [id, chunk] = await Promise.race(queue.entries().map(([id, p]) => p.then((v) => [id, v]) as Promise<[string, unknown]>));

		chain.set(id, Array.from(render(chunk)));
		queue.delete(id);
	}

	return output.reduce(substitute.bind(null, chain));
}

const REGEXP_PLACEHOLDER =
	/<server-render data-id='([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})'><\/server-render>/i;

function substitute(chain: Map<string, string[]>, a: string, c: string): string {
	const [_, id] = c.match(REGEXP_PLACEHOLDER) ?? [];
	return a + (id ? chain.get(id)?.reduce(substitute.bind(null, chain)) : c);
}
