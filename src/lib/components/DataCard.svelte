<script lang="ts">
	let { children, title } = $props();
</script>

<div class="themed-box flex flex-col p-3 shadow-xl">
	<p class="text-xs opacity-60">{title}:</p>
	<p>
		{@render children?.()}
	</p>
</div>
