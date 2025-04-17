import { assertEquals } from '@std/assert';
import { render } from '../mod.ts';

Deno.test('render', async () => {
	assertEquals(
		await render.stringify(render.html`A string on its own should be rendered properly`),
		'A string on its own should be rendered properly',
	);
});

Deno.test('interpolation', async () => {
	assertEquals(
		await render.stringify(render.html`A string with an expression ${'should'} be ${'interpolated'} properly`),
		'A string with an expression should be interpolated properly',
	);
});

Deno.test('no_trim', async () => {
	assertEquals(
		await render.stringify(render.html`   A string on its own should not be trimmed   `),
		'   A string on its own should not be trimmed   ',
	);
});

Deno.test('trim', async () => {
	assertEquals(
		await render.stringify(render.html`<span>   A string between HTML tags should be trimmed   </span>`),
		'<span>A string between HTML tags should be trimmed</span>',
	);
});

Deno.test('escape', async () => {
	assertEquals(
		await render.stringify(render.html`An interpolated expression ${'<span>should be</span>'} escaped`),
		'An interpolated expression &lt;span&gt;should be&lt;/span&gt; escaped',
	);
});

Deno.test('numerical', async () => {
	assertEquals(
		await render.stringify(render.html`The numerical expression ${42} should be stringified`),
		'The numerical expression 42 should be stringified',
	);
});

Deno.test('conditional', async () => {
	assertEquals(
		await render.stringify(render.html`A logical expression ${true ? 'should be' : false} rendered properly`),
		'A logical expression should be rendered properly',
	);
});

Deno.test('iterables', async () => {
	assertEquals(
		await render.stringify(render.html`An iterable expression ${['s', 'h', 'o', 'u', 'l', 'd', ' ', 'b', 'e']} rendered properly`),
		'An iterable expression should be rendered properly',
	);
});

Deno.test('thenable', async () => {
	assertEquals(
		await render.stringify(render.html`A thenable expression ${Promise.resolve('should be')} rendered properly`),
		'A thenable expression should be rendered properly',
	);
});

Deno.test('composition', async () => {
	assertEquals(
		await render.stringify(render.html`A composition of tagged templates ${render.html`should be`} rendered properly`),
		'A composition of tagged templates should be rendered properly',
	);
});
