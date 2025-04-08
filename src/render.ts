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

async function* html([initial, ...strings]: TemplateStringsArray, ...expressions: unknown[]): AsyncGenerator<string> {
	yield initial;

	for (const [i, string] of strings.entries()) {
		yield escape(await expressions[i]);
		yield string;
	}
}

async function render(template: AsyncGenerator<string>): Promise<string> {
	let output = '';

	for await (const chunk of template) output += chunk;

	return output;
}
