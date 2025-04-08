const pattern = /[&<>"']/g;

const escapes = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;',
} as const;

function escape(value: unknown): string {
	return String(value).replace(pattern, (c) => escapes[c]);
}

function isIterable(value: unknown): value is Iterable<string> | AsyncIterable<string> {
	return typeof value !== 'string' && (value?.[Symbol.iterator] || value?.[Symbol.asyncIterator]);
}

async function* html([initial, ...strings]: TemplateStringsArray, ...expressions: unknown[]): AsyncGenerator<string> {
	yield initial;

	for (const [i, string] of strings.entries()) {
		if (isIterable(expressions[i])) yield* expressions[i];
		else yield escape(await expressions[i]);

		yield string;
	}
}

async function render(template: AsyncGenerator<string>): Promise<string> {
	let output = '';

	for await (const chunk of template) output += chunk;

	return output;
}
