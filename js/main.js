"use strict";

let camera, scene, renderer;
let container, mesh;
let geometry, video, texture, material;
let start = Date.now();

init();
animate();

function init() {
	container = document.getElementById("container");

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
	camera.target = new THREE.Vector3(0, 0, 0);

	scene = new THREE.Scene();

	geometry = new THREE.SphereBufferGeometry(100, 256, 256);
	//geometry = new THREE.IcosahedronGeometry(100, 6);
	// invert the geometry on the x-axis so that all of the faces point inward
	geometry.scale(- 1, 1, 1);

	video = document.createElement("video");
	video.crossOrigin = "anonymous";
	video.width = 640;
	video.height = 360;
	video.loop = true;
	video.muted = true;
	video.src = "./images/bicycle_360.mp4";
	video.setAttribute("webkit-playsinline", "webkit-playsinline");
	video.play();

	texture = new THREE.VideoTexture(video);
	//material = new THREE.MeshBasicMaterial({ map: texture });
    material = new THREE.ShaderMaterial({
		uniforms: {
			tex: {
				type: "t",
				value: texture
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

	setupWasd();
	setupMouse();

	window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	update();
}

function update() {
	updateWasd();

	renderer.render(scene, camera);
}
