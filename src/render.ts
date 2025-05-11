const REGEXP_HTML_ESCAPES = /[&<>"']/g;

const MAPPING_HTML_ESCAPES = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;',
} as const;

function escape(value: string): string {
	return REGEXP_HTML_ESCAPES.test(value)
		? value.replace(REGEXP_HTML_ESCAPES, (c) => MAPPING_HTML_ESCAPES[c as keyof typeof MAPPING_HTML_ESCAPES])
		: value;
}

const REGEXP_TRIM_START = /\s+</g;
const REGEXP_TRIM_END = />\s+/g;

function trim(value: string): string {
	return value.replace(REGEXP_TRIM_START, '<').replace(REGEXP_TRIM_END, '>');
}

type Chunk = string | Promise<unknown>;

export function* html([initial = '', ...strings]: TemplateStringsArray, ...expressions: unknown[]): Generator<Chunk> {
	yield trim(initial);

	for (const [i, string] of strings.entries()) {
		yield* render(expressions[i]);
		yield trim(string);
	}
}

function* render(chunk: unknown): Generator<Chunk> {
	if (typeof chunk === 'string') yield escape(chunk);
	else if (chunk instanceof Promise) yield chunk;
	else if (Array.isArray(chunk)) { for (const part of chunk) yield* render(part); }
	else if (typeof (chunk as any)?.[Symbol.iterator] === 'function') yield* chunk as Iterable<Chunk>;
	else yield String(chunk);
}

function* renderChunk(chunk: Generator<Chunk>, queue: Array<Promise<[number, unknown]> | undefined>): Generator<string> {
	for (const part of chunk) {
		if (typeof part === 'string' && part.length) yield part;
		else if (part instanceof Promise) {
			const id = queue.length;

			queue.push(part.then((v) => [id, v]));
			yield `<server-render data-id='${id}'></server-render>`;
		}
	}
}

export async function stringify(template: Generator<Chunk>): Promise<string> {
	const queue = new Array<Promise<[number, unknown]> | undefined>();
	const output = Array.from(renderChunk(template, queue));

	if (!queue.length) return output.join('');
	const resolved = new Map<number, string[]>();

	while (queue.some(Boolean)) {
		const [id, chunk] = await Promise.race(queue.filter(Boolean)) as [number, unknown];

		resolved.set(id, Array.from(renderChunk(render(chunk), queue)));
		queue[id] = undefined;
	}

	return output.reduce(substitute.bind(null, resolved));
}

const REGEXP_PLACEHOLDER = /<server-render data-id='([0-9]+)'><\/server-render>/i;

function substitute(resolved: Map<number, string[]>, a: string, c: string): string {
	const [_, id] = c.match(REGEXP_PLACEHOLDER) ?? [];
	return a + (id ? resolved.get(Number.parseInt(id))?.reduce(substitute.bind(null, resolved)) : c);
}

export function stream(template: Generator<Chunk>): ReadableStream {
	const queue = new Array<Promise<[number, unknown]> | undefined>();

	return new ReadableStream({
		start(controller): void {
			for (const part of renderChunk(template, queue)) controller.enqueue(part);
			if (queue.length) controller.enqueue(script);
		},
		async pull(controller): Promise<void> {
			while (queue.some(Boolean)) {
				const [id, chunk] = await Promise.race(queue.filter(Boolean)) as [number, unknown];

				controller.enqueue(`<template data-id='${id}'>${Array.from(renderChunk(render(chunk), queue)).join('')}</template>`);
				queue[id] = undefined;
			}

			controller.close();
		},
	}).pipeThrough(new TextEncoderStream());
}

const script = `
<script>
	const observer = new MutationObserver(((placeholders, mutations) => {
		for (const mutation of mutations) {
			for (const node of Array.from(mutation.addedNodes)) {
				if (node instanceof HTMLTemplateElement) {
					Array.from(placeholders).find((p) => p.dataset['id'] === node.dataset['id'])?.replaceWith(node.content);
					node.remove();
				}
			}
		}
	}).bind(null, document.getElementsByTagName('server-render')));

	document.addEventListener('DOMContentLoaded', ((script) => {
		observer.disconnect();
		script.remove();
	}).bind(null, document.currentScript));

	observer.observe(document, { 'childList': true, 'subtree': true });
</script>
`;
