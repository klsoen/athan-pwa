<script>
  const stars = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 50,
    r: Math.random() * 1.5 + 0.5
  }));
</script>

<div class="sky">
  {#each stars as star, i}
    <div
      class="star"
      style="left:{star.x}%;top:{star.y}%;width:{star.r}px;height:{star.r}px"
    ></div>
  {/each}
</div>

<style>
  .sky {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -10;
    background: linear-gradient(180deg, #141e30 0%, #1a2840 40%, #1f3044 70%, #243548 100%);
    pointer-events: none;
    overflow: visible;
  }

  .star {
    position: absolute;
    background-color: white;
    border-radius: 50%;
    opacity: 0.6;
  }
</style>
