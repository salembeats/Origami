/** .FOLD file viewer
 * this is an SVG based front-end for the .fold file format
 *  (.fold file spec: https://github.com/edemaine/fold)
 *
 *  View constructor arguments:
 *   - fold file
 *   - DOM object, or "string" DOM id to attach to
 */

const CREASE_DIR = {
	"B": "boundary",
	"M": "mountain",
	"V": "valley",
	"F": "mark",
	"U": "mark"
};

import "./CreasePattern";
import * as Geom from "../lib/geometry";
import * as SVG from "../lib/svg";
import * as Graph from "./fold/graph";

export default function() {

	let { zoom, translate, appendChild, removeChildren,
		// load, 
		download, setViewBox, getViewBox, size,
		scale, svg, width, height,
		// onMouseMove, onMouseDown, onMouseUp, onMouseLeave, onMouseEnter
	} = SVG.Image(...arguments);

	//  from arguments, get a fold file, if it exists
	let _cp = RabbitEar.CreasePattern(...arguments);
	// let _cp = {"file_spec":1.1,"file_creator":"","file_author":"","file_classes":["singleModel"],"frame_title":"","frame_attributes":["2D"],"frame_classes":["creasePattern"],"vertices_coords":[[0,0],[1,0],[1,1],[0,1]],"vertices_vertices":[[1,3],[2,0],[3,1],[0,2]],"vertices_faces":[[0],[0],[0],[0]],"edges_vertices":[[0,1],[1,2],[2,3],[3,0]],"edges_faces":[[0],[0],[0],[0]],"edges_assignment":["B","B","B","B"],"edges_foldAngle":[0,0,0,0],"edges_length":[1,1,1,1],"faces_vertices":[[0,1,2,3]],"faces_edges":[[0,1,2,3]]};

	let groups = {
		boundary: SVG.group(undefined, "boundary"),
		faces: SVG.group(undefined, "faces"),
		creases: SVG.group(undefined, "creases"),
		vertices: SVG.group(undefined, "vertices"),
	}

	// prepare SVG
	svg.appendChild(groups.boundary);
	svg.appendChild(groups.faces);
	svg.appendChild(groups.creases);
	svg.appendChild(groups.vertices);

	// view properties
	let frame = 0; // which frame (0 ..< Inf) to display 
	let padding = 0.01;  // padding inside the canvas
	let _zoom = 1.0;
	let style = {
		vertex:{ radius: 0.01 },  // radius, percent of page
	};
	let _mouse = {
		isPressed: false,// is the mouse button pressed (y/n)
		position: [0,0], // the current position of the mouse
		pressed: [0,0],  // the last location the mouse was pressed
		drag: [0,0],     // vector, displacement from start to now
		prev: [0,0],     // on mouseMoved, this was the previous location
		x: 0,      // redundant data --
		y: 0       // -- these are the same as position
	};

	_cp.onchange = function(){
		draw();
	}

	// const setPadding = function(pad){
	// 	if(pad != null){
	// 		padding = pad;
	// 		// this.setViewBox();
	// 		draw();
	// 	}
	// }

	const nearest = function() {
		let point = Geom.Vector(...arguments);
		let nearestVertex = _cp.nearestVertex(point[0], point[1]);
		let nearestEdge = _cp.nearestEdge(point[0], point[1]);
		let nearestFace = _cp.nearestFace(point[0], point[1]);

		let nearest = {};

		if (nearestVertex != null) {
			nearestVertex.svg = groups.vertices.childNodes[nearestVertex.index];
			nearest.vertex = nearestVertex;
		}
		if (nearestEdge != null) {
			nearestEdge.svg = groups.creases.childNodes[nearestEdge.index];
			nearest.edge = nearestEdge;
		}
		if (nearestFace != null) {
			nearestFace.svg = groups.faces.childNodes[nearestFace.index];
			nearest.face = nearestFace;
		}

		return nearest;

		// var junction = (node != undefined) ? node.junction() : undefined;
		// if(junction === undefined){
		// 	var sortedJunction = this.junctions
		// 		.map(function(el){ return {'junction':el, 'distance':point.distanceTo(el.origin)};},this)
		// 		.sort(function(a,b){return a['distance']-b['distance'];})
		// 		.shift();
		// 	junction = (sortedJunction !== undefined) ? sortedJunction['junction'] : undefined
		// }

		// var sector = (junction !== undefined) ? junction.sectors.filter(function(el){
		// 	return el.contains(point);
		// },this).shift() : undefined;
	}

	const updateViewBox = function(){
		let vertices = _cp.vertices_coords;
		if (frame > 0 &&
		   _cp.file_frames[frame - 1] != null &&
		   _cp.file_frames[frame - 1].vertices_coords != null){
			vertices = _cp.file_frames[frame - 1].vertices_coords;
		}
		// calculate bounds
		let xSorted = vertices.slice().sort((a,b) => a[0] - b[0]);
		let ySorted = vertices.slice().sort((a,b) => a[1] - b[1]);
		let boundsX = xSorted.shift()[0];
		let boundsY = ySorted.shift()[1];
		let boundsW = xSorted.pop()[0] - boundsX;
		let boundsH = ySorted.pop()[1] - boundsY;
		let isInvalid = isNaN(boundsX) || isNaN(boundsY) ||
		                isNaN(boundsW) || isNaN(boundsH);
		if (isInvalid) {
			SVG.setViewBox(svg, 0, 0, 1, 1, padding);
		} else{
			SVG.setViewBox(svg, boundsX, boundsY, boundsW, boundsH, padding);
		}
	}

	const draw = function(){
		let data = _cp;
		// if a frame is set, copy data from that frame
		if (frame > 0 && _cp.file_frames != null){
			if(_cp.file_frames[frame - 1] != null &&
		   	   _cp.file_frames[frame - 1].vertices_coords != null){
				data = File.flatten_frame(_cp, frame);
			}
		}
		if(data.vertices_coords == null){ return; }
		// gather components
		let verts = data.vertices_coords;
		let edges = data.edges_vertices.map(ev => ev.map(v => verts[v]));
		// let faces = data.faces_vertices.map(fv => fv.map(v => verts[v]));
		let faces = data.faces_vertices
			.map(fv => fv.map(v => verts[v]))
			.map(face => Geom.Polygon(face).scale(0.666).points);
			// .map(face => Geom.Polygon(face).points);

		let facesFromEdges = data.faces_edges
			.map(face_edges => face_edges
				.map(edge => data.edges_vertices[edge])
				.map((vi,i,arr) => {
					let next = arr[(i+1)%arr.length];
					return vi[1] === next[0] || vi[1] === next[1]
						? vi[0] : vi[1];
				}).map(v => data.vertices_coords[v])
			)
			.map(face => Geom.Polygon(face).scale(0.83333).points);

		let orientations = data.edges_vertices.map((ev,i) =>
			(data.edges_assignment != null && 
			 data.edges_assignment[i] != null
				? CREASE_DIR[data.edges_assignment[i]] 
				: "mark"
			)
		);
		let faceOrder = (data.faces_layer != null && data.faces_layer.length == data.faces_vertices.length)
			? data.faces_layer.slice()
			: data.faces_vertices.map((f,i) => i);
		
		let facesDirection = (data.faces_direction != null)
			? data.faces_direction.slice()
			: data.faces_vertices.map((f,i) => true);

		// clear layers
		[groups.boundary,
		 groups.faces,
		 groups.creases,
		 groups.vertices].forEach((layer) => SVG.removeChildren(layer));
		// boundary
		if (!isFoldedState()) {
			let polygonPoints = Graph.get_boundary_vertices(_cp)
				.map(v => _cp.vertices_coords[v])
			SVG.polygon(polygonPoints, "boundary", null, groups.boundary);
		}		
		// vertices
		if (!isFoldedState()) {
			let vertexR = style.vertex.radius;
			verts.forEach((v,i) => SVG.circle(v[0], v[1], vertexR, "vertex", ""+i, groups.vertices));
		}
		// edges
		if (!isFoldedState()) {
			edges.forEach((e,i) =>
				SVG.line(e[0][0], e[0][1], e[1][0], e[1][1], orientations[i], ""+i, groups.creases)
			);
		}
		// faces
		faceOrder.forEach(i => {
			let faceClass = (!isFoldedState() ? "face" : facesDirection[i] ? "face folded" : "face-backside folded");
			SVG.polygon(faces[i], faceClass, "face", groups.faces)
			SVG.polygon(facesFromEdges[i], faceClass, "face", groups.faces)
		});

		// faces.forEach(f => SVG.polygon(f, faceClass, "face", this.faces));
		updateViewBox();
	}

	const load = function(input, callback){ // epsilon
		// are they giving us a filename, or the data of an already loaded file?
		if (typeof input === 'string' || input instanceof String){
			let extension = input.substr((input.lastIndexOf('.') + 1));
			// filename. we need to upload
			switch(extension){
				case 'fold':
				fetch(input)
					.then((response) => response.json())
					.then((data) => {
						_cp = data;
						draw();
						if(callback != null){ callback(_cp); }
					});
				// return this;
			}
		}
		try{
			// try .fold file format first
			let foldFileImport = JSON.parse(input);
			_cp = foldFileImport;
			// return this;
		} catch(err){
			console.log("not a valid .fold file format")
			// return this;
		}
	}
	const isFoldedState = function(){
		if(_cp == null || _cp.frame_classes == null){ return false; }
		let frame_classes = _cp.frame_classes;
		if(frame > 0 &&
		   _cp.file_frames[frame - 1] != null &&
		   _cp.file_frames[frame - 1].frame_classes != null){
			frame_classes = _cp.file_frames[frame - 1].frame_classes;
		}
		// try to discern folded state
		if(frame_classes.includes("foldedState")){
			return true;
		}
		if(frame_classes.includes("creasePattern")){
			return false;
		}
		// inconclusive
		return false;
	}

	const makeVertices = function() {
		return _cp.vertices_coords == null
			? []
			: _cp.vertices_coords.map(v => Geom.Vector(v));
	}
	const makeEdges = function() {
		return _cp.edges_vertices == null
			? []
			: _cp.edges_vertices
				.map(e => e.map(ev => _cp.vertices_coords[ev]))
				.map(e => Geom.Edge(e));
	}
	const makeFaces = function() {
		return _cp.faces_vertices == null
			? []
			: _cp.faces_vertices
				.map(f => f.map(fv => _cp.vertices_coords[fv]))
				.map(f => Geom.Polygon(f));
	}

	const getFrames = function(){ return _cp.file_frames; }
	const getFrame = function(index){ return _cp.file_frames[index]; }
	const setFrame = function(index){
		frame = index;
		draw();
	}
	const showVertices = function(){ origami.vertices.setAttribute("display", "");}
	const hideVertices = function(){ origami.vertices.setAttribute("display", "none");}
	const showEdges = function(){ origami.creases.setAttribute("display", "");}
	const hideEdges = function(){ origami.creases.setAttribute("display", "none");}
	const showFaces = function(){ origami.faces.setAttribute("display", "");}
	const hideFaces = function(){ origami.faces.setAttribute("display", "none");}

	draw();


	let _onmousemove, _onmousedown, _onmouseup, _onmouseleave, _onmouseenter, _animate, _animationFrame;

	// clientX and clientY are from the browser event data
	function updateMousePosition(clientX, clientY){
		_mouse.prev = _mouse.position;
		_mouse.position = SVG.convertToViewBox(svg, clientX, clientY);
		_mouse.x = _mouse.position[0];
		_mouse.y = _mouse.position[1];
		_mouse[0] = _mouse.position[0];
		_mouse[1] = _mouse.position[1];
	}

	function updateHandlers(){
		svg.onmousemove = function(event){
			updateMousePosition(event.clientX, event.clientY);
			if(_mouse.isPressed){
				_mouse.drag = [_mouse.position[0] - _mouse.pressed[0], 
				               _mouse.position[1] - _mouse.pressed[1]];
				_mouse.drag.x = _mouse.drag[0];
				_mouse.drag.y = _mouse.drag[1];
			}
			if(_onmousemove != null){ _onmousemove( Object.assign({}, _mouse) ); }
		}
		svg.onmousedown = function(event){
			_mouse.isPressed = true;
			_mouse.pressed = SVG.convertToViewBox(svg, event.clientX, event.clientY);
			if(_onmousedown != null){ _onmousedown( Object.assign({}, _mouse) ); }
		}
		svg.onmouseup = function(event){
			_mouse.isPressed = false;
			if(_onmouseup != null){ _onmouseup( Object.assign({}, _mouse) ); }
		}
		svg.onmouseleave = function(event){
			updateMousePosition(event.clientX, event.clientY);
			if(_onmouseleave != null){ _onmouseleave( Object.assign({}, _mouse) ); }
		}
		svg.onmouseenter = function(event){
			updateMousePosition(event.clientX, event.clientY);
			if(_onmouseenter != null){ _onmouseenter( Object.assign({}, _mouse) ); }
		}
		svg.ontouchmove = svg.onmousemove;
		svg.ontouchstart = svg.onmousedown;
		svg.ontouchend = svg.onmouseup;
	}


	function addClass(node, className) { SVG.addClass(node, className); }
	function removeClass(node, className) { SVG.removeClass(node, className); }


	const clear = function() {
		// todo: remove all creases from current CP, leave the boundary.
		// _cp = {"file_spec":1.1,"file_creator":"","file_author":"","file_classes":["singleModel"],"frame_title":"","frame_attributes":["2D"],"frame_classes":["creasePattern"],"vertices_coords":[[0,0],[1,0],[1,1],[0,1]],"vertices_vertices":[[1,3],[2,0],[3,1],[0,2]],"vertices_faces":[[0],[0],[0],[0]],"edges_vertices":[[0,1],[1,2],[2,3],[3,0]],"edges_faces":[[0],[0],[0],[0]],"edges_assignment":["B","B","B","B"],"edges_foldAngle":[0,0,0,0],"edges_length":[1,1,1,1],"faces_vertices":[[0,1,2,3]],"faces_edges":[[0,1,2,3]]};
	}

	const crease = function(a, b, c, d){
		// Folder.
	}

	const fold = function(face){
		// return Folder.fold_without_layering(_cp, face);
	}

	// return Object.freeze({
	return {
		set cp(c){
			_cp = c;
			draw();
		},
		get cp(){
			return _cp;
		},
		get vertices() { return makeVertices(); },
		get edges() { return makeEdges(); },
		get faces() { return makeFaces(); },
		svg,
		// zoom, translate, appendChild, removeChildren,
		// load, download, setViewBox, getViewBox, size,
		// scale, svg, width, height,

		// groups,
		// frame,
		// zoom,
		// padding,
		// style,

		nearest,
		addClass,
		removeClass,

		clear,
		crease,
		fold,

		// setPadding,
		draw,
		updateViewBox,

		getFrames,
		getFrame,
		setFrame,
		showVertices,
		hideVertices,
		showEdges,
		hideEdges,
		showFaces,
		hideFaces,

		set onMouseMove(handler) {
			_onmousemove = handler;
			updateHandlers();
		},
		set onMouseDown(handler) {
			_onmousedown = handler;
			updateHandlers();
		},
		set onMouseUp(handler) {
			_onmouseup = handler;
			updateHandlers();
		},
		set onMouseLeave(handler) {
			_onmouseleave = handler;
			updateHandlers();
		},
		set onMouseEnter(handler) {
			_onmouseenter = handler;
			updateHandlers();
		},
		set animate(handler) {
			if (_animate != null) {
				clearInterval(_animate);
			}
			_animate = handler;
			if (_animate != null) {
				_animationFrame = 0;
				setInterval(function(){
					let animObj = {
						"time": svg.getCurrentTime(),
						"frame": _animationFrame++
					};
					_animate(animObj);
				}, 1000/60);
			}
		}
	// });
	};
}

