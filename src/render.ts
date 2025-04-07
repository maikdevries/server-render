function* render(strings: TemplateStringsArray, ...expressions: unknown[]): Generator<string> {
	for (const [i, string] of strings.entries()) {
		yield string;

		const expr = expressions[i];
		if (expr) yield String(expr);
	}
}
