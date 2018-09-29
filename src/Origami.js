'use strict';

import * as Geometry from './geometry.js'

class Fold{
	static square(meta){
		var author = ""
		if(meta != undefined){
			if(meta.author != undefined){ author = meta.author; }
		}
		return {
			"file_spec":1.1,
			"file_creator":"Rabbit Ear",
			"file_author":author,
			"file_classes":["singleModel"],
			"vertices_coords":[[0,0],[1,0],[1,1],[0,1]],
			"edges_vertices":[[0,1],[1,2],[2,3],[3,0]],
			"edges_assignment":["B","B","B","B"],
			"faces_vertices":[[0,1,2,3]],
			"faces_layer":[0],
			"faces_matrix":[[1, 0, 0, 1, 0, 0]],
			"faces_coloring":[0]
		};
	}
	static oneFold(){
		return {
			"file_spec": 1.1,
			"file_creator": "Rabbit Ear",
			"file_author": "Robby Kraft",
			"file_classes": ["singleModel"],
			"frame_attributes": ["2D"],
			"frame_title": "one valley crease",
			"frame_classes": ["creasePattern"],
			"vertices_coords": [ [0,0], [1,0], [1,1], [0,1], [1,0.21920709], [0,0.75329794] ],
			"vertices_vertices": [ [1,3], [4,0], [3,4], [0,2], [2,5,1], [0,4,3] ],
			"vertices_faces": [ [0], [0], [1], [1], [1,0], [0,1] ],
			"edges_vertices": [ [0,1], [1,4], [4,5], [5,0], [4,2], [2,3], [3,5] ],
			"edges_faces": [ [0], [0], [1,0], [0], [1], [1], [1] ],
			"edges_assignment": ["B","B","V","B","B","B","B"],
			"edges_foldAngle": [0,0,180,0,0,0,0],
			"faces_vertices": [ [0,1,4,5], [2,3,5,4] ],
			"faces_edges": [ [0,1,2,3], [5,6,2,4] ],
      "faces_layer": [1,0],
			"faceOrders": [ [0,1,1] ],
			"faces_matrix": [
				[0.55611381,-0.83110614,-0.83110614,-0.55611381,0.62607055,1.17221733],
				[1,0,0,1,0,0]
			],
			"faces_coloring": [1,0]
		}
	}
}


function makeFaceClipLines(foldFile, line){
	
	// use each face's matrix to transform the input line
	//   from folded coords to crease pattern coords
	let matrices = foldFile["faces_matrix"].map(n => 
		new Geometry.Matrix(n[0],n[1],n[2],n[3],n[4],n[5]) )

	let facesVertices = foldFile.faces_vertices.map( vIndices => {
		// from face vertex indices, create faces with vertex geometry
		return vIndices.map( vI => foldFile.vertices_coords[vI])
	})
	// generate one clip line per face, or none if there is no intersection
	let facePolys = facesVertices.map(vertices => {
		// convex hull algorithm turns faces into a convex polygon object
		let poly = new Geometry.ConvexPolygon();
		poly.edges = vertices.map((el,i,verts) => {
			let nextEl = verts[ (i+1)%verts.length ];
			return new Geometry.Edge(el[0], el[1], nextEl[0], nextEl[1]);
		});
		return poly;
		// return Geometry.ConvexPolygon.convexHull( vertices.map(v => {x:v[0], y:v[1]}) )
	})
	// for every face, we have one clipped crease edge or undefined if no intersection
	let clipLines = facePolys.map(function(poly, i){
		return poly.clipLine( line.transform(matrices[i].inverse()) );
	},this).map(function(edge){
		// convert to [ [x,y], [x,y] ]. or undefined if no intersection
		if(edge != undefined){return [[edge.nodes[0].x,edge.nodes[0].y],[edge.nodes[1].x,edge.nodes[1].y]];}
		return undefined;
	},this);

	// 
	let edgeDictionary = {}
	clipLines.map((clip, f) => {
		if(clip != undefined){
			facePolys[f].edges.forEach((edge, eI) => {
				let foundIndex = undefined;
				if(edge.collinear( {x:clip[0][0], y:clip[0][1]} )){ foundIndex = 0; }
				if(edge.collinear( {x:clip[1][0], y:clip[1][1]} )){ foundIndex = 1; }
				if(foundIndex != undefined){
					let fVI = foldFile.faces_vertices[f];
					let key = [fVI[eI], fVI[(eI+1)%fVI.length]].sort(function(a,b){return a-b;}).join(" ");
					edgeDictionary[key] = clip[foundIndex];
				}
			})
		}
	})

  //     make dictionary 
  //       from edges (in verted index sorted order) 
  //       to vertex indices
  //     add new vertices when necessary and translate faces_line to vertex index pairs
  //     (each clip line goes from [(x, y), (x, y)] to [v1, v2])

	// deep copy vertices array
	let new_vertices_coords = JSON.parse(JSON.stringify(foldFile.vertices_coords));

	for(let key in edgeDictionary){
		if(edgeDictionary.hasOwnProperty(key)){
			let edges = key.split(' ').map( e => parseInt(e) )
			let newVertex = edgeDictionary[key]
			new_vertices_coords.push(newVertex)
			edgeDictionary[key] = new_vertices_coords.length-1
		}
	}

	// console.log(new_vertices_coords)
	// console.log(edgeDictionary);

	// console.log(clipLines);
	// console.log(edgeDictionary);



}

export default class Origami{

	constructor(){
		// this.unfolded = Fold.square();
		// this.folded = Fold.square();
		this.unfolded = Fold.oneFold();
		this.folded = Fold.oneFold();
	}

	crease(line){

		// 1. vertices_intersections
		// [ boolean, boolean, boolean, boolean, boolean, boolean]
		var faces_clipLines = makeFaceClipLines(this.unfolded, line);
    // input is a fold format JSON and a Robby line
    // output is an faces_ array of pairs of [x, y] points, or undefined

    // 2. walk around each face with a clipped edge.
    //     check clipped edge endpoints for intersection with edges and vertices in order
    //     initialize new vertex set with old vertices
    //     make dictionary 
    //       from edges (in verted index sorted order) 
    //       to vertex indices
    //     add new vertices when necessary and translate faces_line to vertex index pairs
    //     (each clip line goes from [(x, y), (x, y)] to [v1, v2])
/*
    var output = cleanClipSegments(this.unfold, faces_clipLine);
    var faces_clipSegmentByIndex = output.faces_clipSegmentByIndex;
    var newVertices_coords      = output.newVertices_coords;

    //     walk around each face and build split faces side1, side2 using new vertices_coords
    var faces_splitFaces = splitFaces(this.unfold, faces_clipLine, newVertices_coords);
*/
    // 3.5. draw lines on crease pattern
    //  - using faces_lines, draw these on crease pattern
    // 
    // now user clicks on a face:
    // -------
    // we loop through faces, checking if user clicked in face. choose top most one f
    // then check which side was click by checking click intersection with faces_pieces[f]
    // NOW WE KNOW which side1 or side2 inside all of faces_pieces will be the one that moves

    // console.log(this.unfolded);

    var nf = this.unfolded.faces_vertices.length;
    var point = [0.6, 0.6];
    var splitFaces = this.unfolded.faces_vertices.map((f) => [undefined, f])
    var faces_splitFaces_move = markMovingFaces(
        this.unfolded, 
        splitFaces,	// faces_splitFaces
        this.unfolded.vertices_coords,  // newVertices_coords, 
        point
    );
    // point is place where user clicked
    // unfold must have faces_layer as a permutation of the face indices

    
    // var newUnfolded = foldMovingFaces(
    //     this.unfolded, 
    //     // faces_splitFaces, 
    //     Array(n).fill(0, n, [undefined,[1,2,3,4]]),
    //     newVertices_coords, 
    //     Array(n).fill(0, n, [0,1])
    // );

		// var creasePattern = new CreasePattern().importFoldFile(this.unfolded);
		// creasePattern.crease(line);
		//


	}

}

function markMovingFaces(fold, faces_splitFaces, vertices_coords, point) {
  let faces_vertices  = fold.faces_vertices;
  let faces_layer     = fold.faces_layer;
  let faces_matrix    = fold.faces_matrix;

  // get index of highest layer face which intersects point
  let touched_face = faces_splitFaces.reduce(
    (touched, splitFaces, idx) => {
      return splitFaces.reduce(
        (touched, vertices_index, side) => {
          if (vertices_index == undefined) {
            return touched;
          }
          let points = vertices_index
            .map(vi => {
              let [x, y] = vertices_coords[vi];
              let xy = new RabbitEar.Geometry.XY(x, y);
              let [a,b,c,d,e,f] = faces_matrix[idx];
              let matrix = new RabbitEar.Geometry.Matrix(a,b,c,d,e,f);
              return xy.transform(matrix);
            })
          let polygon = RabbitEar.Geometry.ConvexPolygon.convexHull(points);
          let p = {x: point[0], y: point[1]};
          if (polygon.contains(p) && (
              (touched == undefined) ||
              (faces_layer[touched.idx] < faces_layer[idx]))) {
            touched = {idx: idx, side: side};
          }
          return touched;
        }, touched);
    	}, undefined);
  if (touched_face === undefined) {
    console.log("You didn't touch a face...");
    return undefined;
  }
  console.log("You touched face " + touched_face.idx + "!");

  return;

  // make faces_faces
  let nf = faces_vertices.length;
  let faces_faces = Array.from(Array(nf)).map(() => []);
  let edgeMap = {};
  faces_vertices.forEach((vertices, idx1) => {
    n = vertices.length;
    vertices.forEach((u, i, vs) => {
      v = vs[(i + 1) % n];
      if (v < u) {
        [u, v] = [v, u];
      }
      let key = u + "," + v;
      if (key in edgeMap) {
        idx2 = edgeMap[key];
        faces_faces[idx1].push(idx2);
        faces_faces[idx2].push(idx1);
      } else {
        edgeMap[key] = idx1;
      }
    }); 
  });

  let faces_splitFaces_move = Array.from(Array(nf)).map(() => Array(2).map(() => false));
  faces_splitFaces_move[touched.idx][touched.side] = true;
  
  // 

  // for (var i = 0; i < faces.length; i++) {
  //    vertices   = faces_vertices[i];
  //    layer      = faces_layer[i];
  //    splitFaces = faces_splitFaces[i];
  //    move       = faces_splitFaces_move[i];
  // }
  return faces_splitFaces_move;
}

