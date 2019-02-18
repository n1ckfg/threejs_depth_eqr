function main() {

	var camera, scene, renderer;
	var container, mesh;
	var geometry, video, texture, material;
    var start = Date.now();

	var isUserInteracting = false,
		lon = 0, lat = 0,
		phi = 0, theta = 0,
		distance = 50,
		onPointerDownPointerX = 0,
		onPointerDownPointerY = 0,
		onPointerDownLon = 0,
		onPointerDownLat = 0;

	init();
	animate();

	function init() {
		container = document.getElementById("container");

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
		camera.target = new THREE.Vector3(0, 0, 0);

		scene = new THREE.Scene();

		geometry = new THREE.SphereBufferGeometry(500, 60, 40);
		//geometry = new THREE.IcosahedronGeometry(500, 4);
		// invert the geometry on the x-axis so that all of the faces point inward
		geometry.scale(- 1, 1, 1);

		video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.width = 640;
		video.height = 360;
		video.loop = true;
		video.muted = true;
		video.src = "../images/bicycle_360.mp4";
		video.setAttribute("webkit-playsinline", "webkit-playsinline");
		video.play();

		texture = new THREE.VideoTexture(video);
		//var material = new THREE.MeshBasicMaterial({ map: texture });
	    material = new THREE.ShaderMaterial({
			uniforms: {
				tExplosion: {
					type: "t",
					value: texture
				},
				time: {
					type: "f",
					value: 0.0
				}
			},
	        vertexShader: document.getElementById("vertexShader").textContent,
	        fragmentShader: document.getElementById("fragmentShader").textContent
	    });

		mesh = new THREE.Mesh(geometry, material);

		scene.add(mesh);

		renderer = new THREE.WebGLRenderer();
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		container.appendChild(renderer.domElement);

		document.addEventListener("mousedown", onDocumentMouseDown, false);
		document.addEventListener("mousemove", onDocumentMouseMove, false);
		document.addEventListener("mouseup", onDocumentMouseUp, false);
		document.addEventListener("wheel", onDocumentMouseWheel, false);

		//

		window.addEventListener("resize", onWindowResize, false);
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	function onDocumentMouseDown(event) {
		event.preventDefault();

		isUserInteracting = true;

		onPointerDownPointerX = event.clientX;
		onPointerDownPointerY = event.clientY;

		onPointerDownLon = lon;
		onPointerDownLat = lat;
	}

	function onDocumentMouseMove(event) {
		if (isUserInteracting === true) {
			lon = (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon;
			lat = (event.clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
		}
	}

	function onDocumentMouseUp() {
		isUserInteracting = false;
	}

	function onDocumentMouseWheel(event) {
		distance += event.deltaY * 0.05;

		distance = THREE.Math.clamp(distance, 1, 50);
	}

	function animate() {
		requestAnimationFrame(animate);
    	material.uniforms[ 'time' ].value = .00025 * ( Date.now() - start );
		update();
	}

	function update() {
		lat = Math.max(- 85, Math.min(85, lat));
		phi = THREE.Math.degToRad(90 - lat);
		theta = THREE.Math.degToRad(lon);

		camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
		camera.position.y = distance * Math.cos(phi);
		camera.position.z = distance * Math.sin(phi) * Math.sin(theta);

		camera.lookAt(camera.target);

		renderer.render(scene, camera);
	}

}

window.onload = main;