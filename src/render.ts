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

function* html(strings: TemplateStringsArray, ...expressions: unknown[]): Generator<string> {
	for (const [i, string] of strings.entries()) {
		yield string;

		const expr = expressions[i];
		if (expr) yield escape(expr);
	}
}

function render(template: Generator<string>): string {
	let output = '';

	for (const chunk of template) output += chunk;

	return output;
}
