import { html, stringify } from '@maikdevries/server-render';
import { assertEquals } from '@std/assert';

Deno.test('render', async () => {
	assertEquals(
		await stringify(html`A string on its own should be rendered properly`),
		'A string on its own should be rendered properly',
	);
});

Deno.test('interpolation', async () => {
	assertEquals(
		await stringify(html`A string with an expression ${'should'} be ${'interpolated'} properly`),
		'A string with an expression should be interpolated properly',
	);
});

Deno.test('no_trim', async () => {
	assertEquals(
		await stringify(html`   A string on its own should not be trimmed   `),
		'   A string on its own should not be trimmed   ',
	);
});

Deno.test('trim', async () => {
	assertEquals(
		await stringify(html`<span>   A string between HTML tags should be trimmed   </span>`),
		'<span>A string between HTML tags should be trimmed</span>',
	);
});

Deno.test('escape', async () => {
	assertEquals(
		await stringify(html`An interpolated expression ${'<span>should be</span>'} escaped`),
		'An interpolated expression &lt;span&gt;should be&lt;/span&gt; escaped',
	);
});

Deno.test('numerical', async () => {
	assertEquals(
		await stringify(html`The numerical expression ${42} should be stringified`),
		'The numerical expression 42 should be stringified',
	);
});

Deno.test('conditional', async () => {
	assertEquals(
		await stringify(html`A logical expression ${true ? 'should be' : false} rendered properly`),
		'A logical expression should be rendered properly',
	);
});

Deno.test('iterables', async () => {
	assertEquals(
		await stringify(html`An iterable expression ${['s', 'h', 'o', 'u', 'l', 'd', ' ', 'b', 'e']} rendered properly`),
		'An iterable expression should be rendered properly',
	);
});

Deno.test('numerical_iterables', async () => {
	assertEquals(
		await stringify(
			html`The numerical iterable expression ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]} should be rendered properly`,
		),
		'The numerical iterable expression 1234567890 should be rendered properly',
	);
});

Deno.test('thenable', async () => {
	assertEquals(
		await stringify(html`A thenable expression ${Promise.resolve('should be')} rendered properly`),
		'A thenable expression should be rendered properly',
	);
});

Deno.test('nested_thenable', async () => {
	assertEquals(
		await stringify(
			html`A ${Promise.resolve(html`nested thenable expression ${Promise.resolve('should be')}`)} rendered properly`,
		),
		'A nested thenable expression should be rendered properly',
	);
});

Deno.test('composition', async () => {
	assertEquals(
		await stringify(html`A composition of tagged templates ${html`should be`} rendered properly`),
		'A composition of tagged templates should be rendered properly',
	);
});

Deno.test('composed_iterable_thenable', async () => {
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	assertEquals(
		await stringify(html`<ol>${days.map((x) => html`<li>${Promise.resolve(x)}</li>`)}</ol>`),
		'<ol><li>Monday</li><li>Tuesday</li><li>Wednesday</li><li>Thursday</li><li>Friday</li><li>Saturday</li><li>Sunday</li></ol>',
	);
});
