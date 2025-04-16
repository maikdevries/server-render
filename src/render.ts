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

type Chunk = string | { 'id': string; 'promise': Promise<unknown> };

export function* html([initial = '', ...strings]: TemplateStringsArray, ...expressions: unknown[]): Generator<Chunk> {
	yield trim(initial);

	for (const [i, string] of strings.entries()) {
		yield* render(expressions[i]);
		yield trim(string);
	}
}

function isGenerator(value: any): value is Generator<Chunk> {
	return typeof value !== 'string' && typeof value?.[Symbol.iterator] === 'function';
}

function* render(chunk: unknown): Generator<Chunk> {
	if (chunk instanceof Promise) yield { 'id': crypto.randomUUID(), 'promise': chunk };
	else if (Array.isArray(chunk)) { for (const part of chunk) yield* render(part); }
	else if (isGenerator(chunk)) yield* chunk;
	else yield escape(chunk);
}

export async function stringify(template: Generator<Chunk>): Promise<string> {
	const output = [];
	const queue = new Map<string, Promise<unknown>>();
	const chain = new Map<string, string[]>();

	for (const chunk of template) {
		if (typeof chunk === 'string') output.push(chunk);
		else {
			queue.set(chunk.id, chunk.promise);
			output.push(`<server-render data-id='${chunk.id}'></server-render>`);
		}
	}

	while (queue.size) {
		const [id, chunk] = await Promise.race(queue.entries().map(([id, p]) => p.then((v) => [id, v]) as Promise<[string, unknown]>));
		const buffer = [];

		for (const part of render(chunk)) {
			if (typeof part === 'string') buffer.push(part);
			else {
				queue.set(part.id, part.promise);
				buffer.push(`<server-render data-id='${part.id}'></server-render>`);
			}
		}

		chain.set(id, buffer);
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

export function stream(template: Generator<Chunk>): ReadableStream {
	const queue = new Map<string, Promise<unknown>>();

	return new ReadableStream({
		start(controller): void {
			for (const chunk of template) {
				if (typeof chunk === 'string') controller.enqueue(chunk);
				else {
					queue.set(chunk.id, chunk.promise);
					controller.enqueue(`<server-render data-id='${chunk.id}'></server-render>`);
				}
			}
		},
		async pull(controller): Promise<void> {
			while (queue.size) {
				const [id, chunk] = await Promise.race(
					queue.entries().map(([id, p]) => p.then((v) => [id, v]) as Promise<[string, unknown]>),
				);

				const output = [];

				for (const part of render(chunk)) {
					if (typeof part === 'string') output.push(part);
					else {
						queue.set(part.id, part.promise);
						output.push(`<server-render data-id='${part.id}'></server-render>`);
					}
				}

				controller.enqueue(`<template data-id='${id}'>${output.join('')}</template>`);
				queue.delete(id);
			}

			controller.close();
		},
	}).pipeThrough(new TextEncoderStream());
}
