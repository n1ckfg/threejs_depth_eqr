function main() {

    var rgbdFrag = glsl(["#define GLSLIFY 1\nuniform sampler2D map;\nuniform float opacity;\n\nuniform float uvdy;\nuniform float uvdx;\n\nvarying float visibility;\nvarying vec2 vUv;\nvarying vec3 vNormal;\nvarying vec3 vPos;\n\nvoid main() {\n\n        if ( visibility < 0.9 ) discard;\n        vec4 color = texture2D(map, vUv);\n\n        //For live streaming only to clip the black per pixel\n        if(PIXEL_EDGE_CLIP == 1){\n            if( color.r < 0.05 ) discard;\n        }\n\n        color.w = opacity;\n\n        gl_FragColor = color;\n\n}\n"]);
    var rgbdVert = glsl(["#define GLSLIFY 1\nuniform float mindepth;\nuniform float maxdepth;\n\nuniform float width;\nuniform float height;\n\nuniform bool isPoints;\nuniform float pointSize;\n\nuniform float time;\n\nuniform vec2 focalLength;\nuniform vec2 principalPoint;\nuniform vec2 imageDimensions;\nuniform vec4 crop;\nuniform vec2 meshDensity;\nuniform mat4 extrinsics;\n\nvarying vec3 vNormal;\nvarying vec3 vPos;\n\nuniform sampler2D map;\n\nvarying float visibility;\nvarying vec2 vUv;\n\nconst float _DepthSaturationThreshhold = 0.5; //a given pixel whose saturation is less than half will be culled (old default was .5)\nconst float _DepthBrightnessThreshold = 0.5; //a given pixel whose brightness is less than half will be culled (old default was .9)\nconst float    _Epsilon = .03;\n\nvec3 rgb2hsv(vec3 c)\n{\n        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);\n        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n\n        float d = q.x - min(q.w, q.y);\n        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + _Epsilon)), d / (q.x + _Epsilon), q.x);\n}\n\nfloat depthForPoint(vec2 texturePoint)\n{\n        vec4 depthsample = texture2D(map, texturePoint);\n        vec3 depthsamplehsv = rgb2hsv(depthsample.rgb);\n        return depthsamplehsv.g > _DepthSaturationThreshhold && depthsamplehsv.b > _DepthBrightnessThreshold ? depthsamplehsv.r : 0.0;\n}\n\nvoid main() {\n        vec4 texSize = vec4(1.0 / width, 1.0 / height, width, height);\n\n        vec2 centerpix = texSize.xy * .5;\n        vec2 textureStep = 1.0 / meshDensity;\n        vec2 basetex = floor(position.xy * textureStep * texSize.zw) * texSize.xy;\n        vec2 imageCoordinates = crop.xy + (basetex * crop.zw);\n        basetex.y = 1.0 - basetex.y;\n\n        vec2 depthTexCoord = basetex * vec2(1.0, 0.5) + centerpix;\n        vec2 colorTexCoord = basetex * vec2(1.0, 0.5) + vec2(0.0, 0.5) + centerpix;\n\n        vUv = colorTexCoord;\n        vPos = (modelMatrix * vec4(position, 1.0 )).xyz;\n        vNormal = normalMatrix * normal;\n\n        //check neighbors\n        //texture coords come in as [0.0 - 1.0] for this whole plane\n        float depth = depthForPoint(depthTexCoord);\n\n        float neighborDepths[8];\n        neighborDepths[0] = depthForPoint(depthTexCoord + vec2(0.0,    textureStep.y));\n        neighborDepths[1] = depthForPoint(depthTexCoord + vec2(textureStep.x, 0.0));\n        neighborDepths[2] = depthForPoint(depthTexCoord + vec2(0.0, -textureStep.y));\n        neighborDepths[3] = depthForPoint(depthTexCoord + vec2(-textureStep.x, 0.0));\n        neighborDepths[4] = depthForPoint(depthTexCoord + vec2(-textureStep.x, -textureStep.y));\n        neighborDepths[5] = depthForPoint(depthTexCoord + vec2(textureStep.x,    textureStep.y));\n        neighborDepths[6] = depthForPoint(depthTexCoord + vec2(textureStep.x, -textureStep.y));\n        neighborDepths[7] = depthForPoint(depthTexCoord + vec2(-textureStep.x,    textureStep.y));\n\n        visibility = 1.0;\n        int numDudNeighbors = 0;\n        //search neighbor verts in order to see if we are near an edge\n        //if so, clamp to the surface closest to us\n        if (depth < _Epsilon || (1.0 - depth) < _Epsilon)\n        {\n                // float depthDif = 1.0;\n                float nearestDepth = 1.0;\n                for (int i = 0; i < 8; i++)\n                {\n                        float depthNeighbor = neighborDepths[i];\n                        if (depthNeighbor >= _Epsilon && (1.0 - depthNeighbor) > _Epsilon)\n                        {\n                                // float thisDif = abs(nearestDepth - depthNeighbor);\n                                if (depthNeighbor < nearestDepth)\n                                {\n                                        // depthDif = thisDif;\n                                        nearestDepth = depthNeighbor;\n                                }\n                        }\n                        else\n                        {\n                                numDudNeighbors++;\n                        }\n                }\n\n                depth = nearestDepth;\n                visibility = 0.8;\n\n                // blob filter\n                if (numDudNeighbors > 6)\n                {\n                        visibility = 0.0;\n                }\n        }\n\n        // internal edge filter\n        float maxDisparity = 0.0;\n        for (int i = 0; i < 8; i++)\n        {\n                float depthNeighbor = neighborDepths[i];\n                if (depthNeighbor >= _Epsilon && (1.0 - depthNeighbor) > _Epsilon)\n                {\n                        maxDisparity = max(maxDisparity, abs(depth - depthNeighbor));\n                }\n        }\n        visibility *= 1.0 - maxDisparity;\n\n        float z = (depth * (maxdepth - mindepth) + mindepth) * DEPTH_ORDER;\n        vec4 worldPos = extrinsics * vec4((imageCoordinates * imageDimensions - principalPoint) * z / focalLength, z, 1.0);\n        worldPos.w = 1.0;\n        if(isPoints) gl_PointSize = pointSize;\n        gl_Position = projectionMatrix * modelViewMatrix * worldPos;\n}\n"]);

	var camera, scene, renderer;

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
		var container, mesh;

		container = document.getElementById("container");

		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
		camera.target = new THREE.Vector3(0, 0, 0);

		scene = new THREE.Scene();

		var geometry = new THREE.SphereBufferGeometry(500, 60, 40);
		// invert the geometry on the x-axis so that all of the faces point inward
		geometry.scale(- 1, 1, 1);

		var video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.width = 640;
		video.height = 360;
		video.loop = true;
		video.muted = true;
		video.src = "../images/bicycle_360.mp4";
		video.setAttribute("webkit-playsinline", "webkit-playsinline");
		video.play();

		var texture = new THREE.VideoTexture(video);
		var material = new THREE.MeshBasicMaterial({ map: texture });

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