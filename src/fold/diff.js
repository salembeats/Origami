import * as Graph from "./graph";
import { validate } from "./file";


export const diff_new_v = function(graph, newVertex) {
	let i = Graph.verticesCount(graph);
	Object.keys(newVertex).forEach(suffix => {
		let key = "vertices_" + suffix;
		// console.log("setting " + key + " at " + i + " with " + newVertex[suffix]);
		graph[key][i] = newVertex[suffix];
		if (newVertex[suffix] == null) {
			console.log("ERROR NEW VERTEX");
			console.log(key);
			console.log(i);
			console.log(graph[key]);
		}
	});
	return i;
}

export const diff_new_e = function(graph, newEdge) {
	let i = Graph.edgesCount(graph);
	Object.keys(newEdge).forEach(suffix => {
		let key = "edges_" + suffix;
		// console.log("setting " + key + " at " + i + " with " + newEdge[suffix]);
		graph[key][i] = newEdge[suffix];
		if (newEdge[suffix] == null) {
			console.log("ERROR new edge");
			console.log(key);
			console.log(i);
			console.log(graph[key]);
		}
	});
	return i;
}
export const diff_new_f = function(graph, newFace) {
	let i = Graph.facesCount(graph);
	Object.keys(newFace).forEach(suffix => {
		let key = "faces_" + suffix;
		// console.log("setting " + key + " at " + i + " with " + newFace[suffix]);
		graph[key][i] = newFace[suffix];
		if (newFace[suffix] == null) {
			console.log("ERROR new face");
			console.log(key);
			console.log(i);
			console.log(graph[key]);
		}
	});
	return i;
}

export const join_diff = function(a, b) {
	let c = {};
	if (a.vertices != null || b.vertices != null) {
		if (a.vertices == null) { a.vertices = {}; }
		if (b.vertices == null) { b.vertices = {}; }
		if (a.vertices.new == null) { a.vertices.new = []; }
		if (b.vertices.new == null) { b.vertices.new = []; }
		c.vertices = {};
		c.vertices.new = a.vertices.new.concat(b.vertices.new);
	}

	if (a.edges != null || b.edges != null) {
		if (a.edges == null) { a.edges = {}; }
		if (b.edges == null) { b.edges = {}; }
		if (a.edges.new == null) { a.edges.new = []; }
		if (b.edges.new == null) { b.edges.new = []; }
		c.edges = {};
		c.edges.new = a.edges.new.concat(b.edges.new);

		if (a.edges.replace == null) { a.edges.replace = []; }
		if (b.edges.replace == null) { b.edges.replace = []; }
		c.edges = {};
		c.edges.replace = a.edges.replace.concat(b.edges.replace);
	}

	if (a.faces != null || b.faces != null) {
		if (a.faces == null) { a.faces = {}; }
		if (b.faces == null) { b.faces = {}; }

		if (a.faces.replace == null) { a.faces.replace = []; }
		if (b.faces.replace == null) { b.faces.replace = []; }
		c.faces = {};
		c.faces.replace = a.faces.replace.concat(b.faces.replace);
	}
	return c;

}

export const apply_diff = function(graph, diff) {

	let remove_vertices = [];
	let remove_edges = [];
	let remove_faces = [];
	// should we remove all parts at the end of everything?
	if (diff.vertices != null) {
		if (diff.vertices.new != null) {
			diff.vertices.new.forEach(el => diff_new_v(graph, el))
		}
	}
	if (diff.edges != null) {
		if (diff.edges.replace != null) {
			diff.edges.replace.forEach(el => {
				let oldAssignment = graph.edges_assignment[el.old_index];
				el.new
					.filter(e => e.edges_assignment == null)
					.forEach(e => e.assignment = oldAssignment);
				el.new.forEach(newEdge => {
					let index = diff_new_e(graph, newEdge);
					// check the standard keys and infer any that were left out
					// ["vertices", "faces", "assignment", "foldAngle", "length"]
					let allKeys = ["faces", "assignment"];
					allKeys.filter(suffix => newEdge[suffix] != null)
						.forEach(suffix => {
							let key = "edges_" + suffix;
							graph[key][index] = graph[key][el.old_index];
						});
				})
			});
			remove_edges = remove_edges
				.concat(diff.edges.replace.map(el => el.old_index));
		}
		if (diff.edges.new != null) {
			diff.edges.new.forEach(el => diff_new_e(graph, el));
		}
	}
	if (diff.faces != null) {
		if (diff.faces.replace != null) {
			diff.faces.replace.forEach(el => {
				el.new.forEach(newFace => {
					let index = diff_new_f(graph, newFace);
					// check the standard keys and infer any that were left out
					// ["vertices", "faces", "assignment", "foldAngle", "length"]
					let allKeys = ["vertices", "edges"];
					allKeys.filter(suffix => newFace[suffix] != null)
						.forEach(suffix => {
							let key = "faces_" + suffix;
							graph[key][index] = graph[key][el.old_index];
						});
				})
			});
			remove_faces = remove_faces
				.concat(diff.faces.replace.map(el => el.old_index));
		}
	}

	// let validated = validate(graph);

	return {
		vertices: remove_vertices,
		edges: remove_edges,
		faces: remove_faces
	};

}
