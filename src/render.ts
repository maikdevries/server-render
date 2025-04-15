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
	if (Array.isArray(chunk)) for (const part of chunk) yield* render(part);
	else if (isGenerator(chunk)) yield* chunk;
	else yield escape(chunk);
}

export function stringify(template: Generator<string>): string {
	const output = [];

	for (const chunk of template) output.push(chunk);

	return output.join('');
}
