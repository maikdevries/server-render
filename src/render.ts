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

function* html([initial, ...strings]: TemplateStringsArray, ...expressions: unknown[]): Generator<string> {
	yield initial;

	for (const [i, string] of strings.entries()) {
		yield escape(expressions[i]);
		yield string;
	}
}

function render(template: Generator<string>): string {
	let output = '';

	for (const chunk of template) output += chunk;

	return output;
}
