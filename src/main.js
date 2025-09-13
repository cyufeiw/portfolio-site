import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from "gsap/dist/gsap";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

//physics
const GRAVITY = 30;
const CAPSULE_RADIUS = 1;
const CAPSULE_HEIGHT = 1;
const MOVE_SPEED = 10;
const JUMP_HEIGHT = 15;
const colliderOctree = new Octree();
const playerCollider = new Capsule(
    new THREE.Vector3(0, CAPSULE_RADIUS,0),
    new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
    CAPSULE_RADIUS
);
let playerOnFloor = false;
let playerVelocity = new THREE.Vector3();
let targetRotation = Math.PI/2;

let character = {
    instance: null,
    isMoving: false,
};


//create scene and add renderer and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
scene.background = new THREE.Color().setHSL( 0.6, 0, 1 );

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
//mouse hover
let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames = [
    "hobbies",
    "aboutme",
    "projects"
];

let aboutme = {
    instance: null,
    isMoving: false,
    jumpHeight: 1,
    moveDuration: 0.3,
};

let projects = {
    instance: null,
    isMoving: false,
    jumpHeight: 1,
    moveDuration: 0.3,
};

let hobbies = {
    instance: null,
    isMoving: false,
    jumpHeight: 1,
    moveDuration: 0.3,
};


camera.position.x = -40;
camera.position.y = 49;
camera.position.z = 90;

const cameraOffset = new THREE.Vector3(-30, 49, 90);

camera.setFocalLength(120);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.85;

//loading screen
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.querySelector(".loading-text");
const enterButton = document.querySelector(".enter-button");
const instructions = document.querySelector(".instructions");

const manager = new THREE.LoadingManager();

manager.onLoad = function(){
    const t1 = gsap.timeline();
    t1.to(loadingText, {
        opacity: 0,
        duration: 0,
    });

    t1.to(enterButton, {
        opacity: 1,
        duration: 0,
    })
};

enterButton.addEventListener("click", () => {
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0,
  });
  gsap.to(instructions, {
    opacity: 0,
    duration: 0,
    onComplete: () => {
      loadingScreen.remove();
    },
  });
});

const aboutMeModal = document.querySelector(".about-me-modal");
const hobbiesModal = document.querySelector(".hobbies-modal");
const projectsModal = document.querySelector(".projects-modal");
const modalExitButton = document.querySelector(".modal-exit-button");
const hobbiesModalExitButton = document.querySelector(".hobbies-modal-exit-button")
const projectsModalExitButton = document.querySelector(".projects-modal-exit-button");

function showModal() {
    aboutMeModal.style.display = "block";
    //aboutMeModal.classList.toggle("hidden");
    
}
function showHobbiesModal() {
    hobbiesModal.classList.toggle("hidden");
    
}
function hideHobbiesModal(){
    hobbiesModal.classList.toggle("hidden");
}

function hideModal() {
    aboutMeModal.style.display = "none";
    //aboutMeModal.classList.toggle("hidden");
    
}

function showProjectsModal() {
    projectsModal.style.display = "block";
}

function hideProjectsModal() {
    projectsModal.style.display = "none";
}

function onResize(){
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width/sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

//raycaster
function onPointerMove( event ) {
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

//clicky
function onClick(){
        if(intersectObject == "aboutme"){
            showModal();
        } else if(intersectObject == "hobbies") {
            showHobbiesModal();
        } else if(intersectObject == "projects") {
            showProjectsModal();
        }
}

//object animation
function moveAboutMe(){
    aboutme.isMoving = true;

    const t2 = gsap.timeline({
        onComplete: ()=> {
            aboutme.isMoving = false;
        }
    })
    t2.to(aboutme.instance.position, {
        y: aboutme.instance.position.y + aboutme.jumpHeight,
        duration: aboutme.moveDuration,
        yoyo: true,
        repeat: 1,
    })
}
function moveProjects(){
    projects.isMoving = true;

    const t3 = gsap.timeline({
        onComplete: ()=> {
            projects.isMoving = false;
        }
    })
    t3.to(projects.instance.position, {
        y: projects.instance.position.y + projects.jumpHeight,
        duration: projects.moveDuration,
        yoyo: true,
        repeat: 1,
    })
}
function moveHobbies(){
    hobbies.isMoving = true;

    const t4 = gsap.timeline({
        onComplete: ()=> {
            hobbies.isMoving = false;
        }
    })
    t4.to(hobbies.instance.position, {
        y: hobbies.instance.position.y + hobbies.jumpHeight,
        duration: hobbies.moveDuration,
        yoyo: true,
        repeat: 1,
    })
}

function updatePlayer() {
    if(!character.instance) return;

    if(!playerOnFloor) {
        playerVelocity.y -= GRAVITY *0.03;
    }


    playerCollider.translate(playerVelocity.clone().multiplyScalar(0.03));

    playerCollisions();

    character.instance.position.copy(playerCollider.start);
    character.instance.position.y -= CAPSULE_RADIUS;

    let rotationDiff =
    ((((targetRotation - character.instance.rotation.y) % (2 * Math.PI)) +
      3 * Math.PI) %
      (2 * Math.PI)) -
    Math.PI;
    let finalRotation = character.instance.rotation.y + rotationDiff;

    character.instance.rotation.y = THREE.MathUtils.lerp(character.instance.rotation.y, finalRotation, 0.2);
}

function onKeyDown(event){
    if(character.isMoving) return;

    switch(event.key.toLowerCase()){
        case "w":
        case "arrowup":
            playerVelocity.z -= MOVE_SPEED;
            targetRotation = Math.PI;
            break;
        case "s":
        case "arrowdown":
            playerVelocity.z += MOVE_SPEED;
            targetRotation = 0;
            break;
        case "a":
        case "arrowleft":
            playerVelocity.x -= MOVE_SPEED;
            targetRotation = -Math.PI/2;
            break;
        case "d":
        case "arrowright":
            playerVelocity.x += MOVE_SPEED;
            targetRotation = Math.PI/2;
            break;
        default:
            return;
    }
    playerVelocity.y == JUMP_HEIGHT;
    character.isMoving = true;
}

//collision dectection
function playerCollisions() {
    const result = colliderOctree.capsuleIntersect(playerCollider);
    playerOnFloor = false;

    if(result){
        playerOnFloor = result.normal.y >0;
        playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }

    if(playerOnFloor) {
        character.isMoving = false;
        playerVelocity.x = 0;
        playerVelocity.z = 0;
    }
}

window.addEventListener("resize", onResize);
window.addEventListener( 'pointermove', onPointerMove );
modalExitButton.addEventListener("click", hideModal);
window.addEventListener("click", onClick);
hobbiesModalExitButton.addEventListener("click", hideHobbiesModal);
projectsModalExitButton.addEventListener("click", hideProjectsModal);
window.addEventListener("keydown", onKeyDown);


//load model in scene
const loader = new GLTFLoader();

loader.load( './portfolio.glb', 
    function ( glb ) {
        glb.scene.traverse(child=>{
            if(intersectObjectsNames.includes(child.name)){
                intersectObjects.push(child);
            }
            if(child.isMesh){
                child.castShadow = true;
                child.receiveShadow = true;
            }
            if(child.name === "mouse") {
                character.instance = child;
                playerCollider.start.copy(child.position).add(new THREE.Vector3(0, CAPSULE_RADIUS,0));
                playerCollider.end.copy(child.position).add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

            }
            if(child.name === "aboutme") {
                aboutme.instance = child;
            }
            if(child.name === "projects") {
                projects.instance = child;
            }
            if(child.name === "hobbies") {
                hobbies.instance = child;
            }
            if(child.name === "ground_collider") {
                colliderOctree.fromGraphNode(child);
                child.visible = false;
            }
        })
        scene.add( glb.scene );

    }, undefined, function ( error ) {

    console.error( error );
} );

//lights
const sun = new THREE.DirectionalLight( 0xFFFFFF );
sun.castShadow = true;
sun.position.set(-40, 50, 50);
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
sun.target.position.set(0,0,0);
sun.shadow.normalBias = 0.3;
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
scene.add( sun );

const light = new THREE.AmbientLight( 0x404040,3 ); // soft white light
scene.add( light );


//animation loop
function animate() {
    updatePlayer();

    if(character.instance){
        camera.position.copy(character.instance.position).add(cameraOffset);
        camera.lookAt(character.instance.position);
    }


    raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects(intersectObjects);

        if(intersects.length > 0) {
        document.body.style.cursor = "pointer";
        } else {
            document.body.style.cursor = "default";
            intersectObject = "";
        }

        for ( let i = 0; i < intersects.length; i ++ ) {
            intersectObject = intersects[0].object.parent.name;
        }
        if(intersectObject === "aboutme" && !aboutme.isMoving){
            moveAboutMe();
        }
        if(intersectObject === "projects" && !projects.isMoving){
            moveProjects();
        }
        if(intersectObject === "hobbies" && !hobbies.isMoving){
            moveHobbies();
        }
    

    renderer.render( scene, camera );

}
renderer.setAnimationLoop( animate );