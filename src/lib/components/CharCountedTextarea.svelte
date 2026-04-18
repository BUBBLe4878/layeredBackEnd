<script lang="ts">
	interface Props {
		name: string;
		placeholder: string | null;
		value: any;
		min: number;
		max: number;
	}

	let { name, placeholder, value = $bindable(), min, max }: Props = $props();

	let valueLength = $derived(value.toString().length);
	let valueValid = $derived(valueLength >= min && valueLength <= max);
	let valueCharCount = $derived(`${valueLength}/${valueLength >= min ? max : min}`);
</script>

<div class="group relative">
	<textarea
		{name}
		{placeholder}
		bind:value
		class="peer themed-input min-h-20 w-full"
	></textarea>
	<p
		class={`pointer-events-none absolute right-1 bottom-1 bg-primary-950/70 p-1 text-sm transition-opacity group-hover:opacity-25 peer-[:not(:focus)]:opacity-25 ${valueValid ? 'text-primary-500' : 'text-primary-400'}`}
	>
		{valueCharCount}
	</p>
</div>
