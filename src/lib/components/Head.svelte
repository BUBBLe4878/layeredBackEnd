<script lang="ts">
	import favicon from '$lib/assets/favicon.png';

	let { title } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{title ? `${title} | Layered` : 'Layered'}</title>
</svelte:head>
