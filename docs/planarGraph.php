<?php include 'header.php';?>
<script type="text/javascript" src="../lib/perlin.js"></script>

<h3 class="centered" style="padding-top:2em;">CHAPTER II.</h3>
<h1>PLANAR GRAPHS</h1>

<section id="intro">

	<div class="centered">
		<canvas id="canvas-intersection-wobble" resize class="panorama"></canvas>
	</div>

	<p>A <b>planar graph</b> is a collection of <b>nodes</b> and <b>edges</b> in 2D space.</p>

	<div class="centered">
		<pre><code><key>let</key> planarGraph<key> = new</key> PlanarGraph()</code></pre>
	</div>

	<p>The simple application of a 2D position to every node ushers in a new set of rules and ways of orienting oneself to the graph.</p>

	<p>Positions are mapped to the Euclidean plane and are described in terms of X and Y. Two adjacent edges create an interior angle between them. It's now possible for nodes and edges to be <strong>near in proximity</strong> to each other. Edges can enclose a space to create a <strong>face</strong>.</p>

	<p>It's now possible for edges to cross each other, something traditionally not allowed in mathematics. Two crossing edges should be resolved into four edges with a new node sitting at their intersection.</p>

</section>

<!-- <div class="nav">
	<div class="nav-back">
		<a href="/docs/graph.php">⇦ Back: Graphs</a>
	</div>
	<div class="nav-next">
		<a href="planarClean.php">Next: Clean ⇒</a>
	</div>
</div> -->

<script type="text/javascript" src="../tests/intersect_wobble.js"></script>

<script>
// wobble_intersections_callback = function(e){
// 	document.getElementById("span-intersection-results").innerHTML = "<v>Array</v>(<n>" + e.length + "</n>) ← ";
// }
</script>
<?php include 'footer.php';?>