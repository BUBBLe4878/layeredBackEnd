<script lang="ts">
	let {
		children,
		text,
		state = $bindable(false),
		index = undefined,
		onstatechange = (newstate: boolean, index?: number) => {},
		...other
	} = $props();

	function invertState() {
		if (index) {
			onstatechange(!state, index);
		} else {
			onstatechange(!state);
		}

		state = !state;
	}
</script>

<div {...other}>
	<div class="my-4 transition-all {state ? 'ring-2 ring-primary-600' : ''}">
		<button
			class="{state
				? 'bg-primary-900'
				: 'bg-primary-800'} flex w-full cursor-pointer p-3 text-left transition-colors hover:bg-primary-900"
			onclick={invertState}
		>
			<span class="grow {state ? 'font-semibold' : 'font-medium'} transition-all">{text}</span>
			<span>
				{#if state}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><path fill="currentColor" d="M19 12.998H5v-2h14z" /></svg
					>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><path fill="currentColor" d="M19 12.998h-6v6h-2v-6H5v-2h6v-6h2v6h6z" /></svg
					>
				{/if}
			</span>
		</button>
		<div class="bg-primary-800 {state ? 'p-3' : 'h-0 opacity-0'} overflow-hidden transition-all">
			{#if children}
				{@render children?.()}
			{/if}
		</div>
	</div>
</div>
